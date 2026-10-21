import crypto from 'crypto';
import path from 'path';
import multer from 'multer';
import { Request } from 'express';
import { env } from '../../config/env';
import {
  DocumentCategory,
  CATEGORY_DEFINITIONS,
  IVerificationResult,
} from './drive.interface';
import { AppError } from '../../shared/utils/apiError';

// Dangerous file extensions blacklist (Never allowed under any circumstances)
const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.js', '.mjs', '.cjs',
  '.ts', '.vbs', '.vbe', '.ps1', '.ps2', '.jar', '.apk', '.com', '.scr',
  '.msi', '.dll', '.sys', '.wsf', '.pif', '.reg', '.bin', '.cgi', '.py',
  '.pl', '.rb', '.app', '.iso',
]);

/**
 * Sanitizes a filename to protect against path traversal, hidden files,
 * illegal Windows/Linux characters, and double extension tricks.
 */
export function sanitizeFileName(originalName: string): string {
  if (!originalName) return 'unnamed_file';

  // 1. Strip any directory paths
  const baseOnly = path.basename(originalName);

  // 2. Extract extension safely
  const parsed = path.parse(baseOnly);
  const ext = parsed.ext.toLowerCase().trim();

  // 3. Sanitize the base name (remove path characters, illegal symbols, control chars)
  let cleanName = parsed.name
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .trim();

  // 4. Remove leading dots (prevents hidden unix files or empty names)
  cleanName = cleanName.replace(/^\.+/, '');

  if (!cleanName) {
    cleanName = `doc_${Date.now()}`;
  }

  // 5. Shorten name if overly long
  if (cleanName.length > 80) {
    cleanName = cleanName.substring(0, 80);
  }

  return `${cleanName}${ext}`;
}

/**
 * Inspects buffer header bytes to determine genuine file type (Magic Number verification).
 */
export function detectMagicByteMime(
  buffer: Buffer,
  extension: string
): { detectedMime: string; magicBytesHex: string; matches: boolean } {
  if (!buffer || buffer.length === 0) {
    return { detectedMime: 'application/octet-stream', magicBytesHex: '', matches: false };
  }

  const sampleLen = Math.min(buffer.length, 16);
  const header = buffer.subarray(0, sampleLen);
  const magicBytesHex = header.toString('hex').toUpperCase();

  // 1. PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return {
      detectedMime: 'application/pdf',
      magicBytesHex: magicBytesHex.slice(0, 8),
      matches: extension === '.pdf',
    };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      detectedMime: 'image/png',
      magicBytesHex: magicBytesHex.slice(0, 16),
      matches: extension === '.png',
    };
  }

  // 3. JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      detectedMime: 'image/jpeg',
      magicBytesHex: magicBytesHex.slice(0, 6),
      matches: extension === '.jpg' || extension === '.jpeg',
    };
  }

  // 4. WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return {
      detectedMime: 'image/webp',
      magicBytesHex: magicBytesHex.slice(0, 24),
      matches: extension === '.webp',
    };
  }

  // 5. ZIP archive format (also used by modern Office .docx, .xlsx, .zip)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  ) {
    const isOfficeDoc =
      extension === '.docx' || extension === '.xlsx' || extension === '.zip';
    let mime = 'application/zip';
    if (extension === '.docx') {
      mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (extension === '.xlsx') {
      mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    }
    return {
      detectedMime: mime,
      magicBytesHex: magicBytesHex.slice(0, 8),
      matches: isOfficeDoc,
    };
  }

  // 6. Old MS Compound Binary Format (.doc, .xls)
  if (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  ) {
    let mime = 'application/octet-stream';
    if (extension === '.doc') mime = 'application/msword';
    if (extension === '.xls') mime = 'application/vnd.ms-excel';
    return {
      detectedMime: mime,
      magicBytesHex: magicBytesHex.slice(0, 16),
      matches: extension === '.doc' || extension === '.xls',
    };
  }

  // 7. Plain text / CSV / JSON / XML inspection
  if (
    extension === '.csv' ||
    extension === '.txt' ||
    extension === '.json' ||
    extension === '.xml'
  ) {
    // Check first 512 bytes for absence of null bytes (which denote binary executables)
    const scanLen = Math.min(buffer.length, 512);
    let isText = true;
    for (let i = 0; i < scanLen; i++) {
      if (buffer[i] === 0x00) {
        isText = false;
        break;
      }
    }

    if (isText) {
      let mime = 'text/plain';
      if (extension === '.csv') mime = 'text/csv';
      if (extension === '.json') mime = 'application/json';
      if (extension === '.xml') mime = 'application/xml';
      return {
        detectedMime: mime,
        magicBytesHex: 'ASCII/UTF-8 TEXT',
        matches: true,
      };
    }
  }

  // Unknown or unverified binary signature
  return {
    detectedMime: 'application/octet-stream',
    magicBytesHex: magicBytesHex.slice(0, 8),
    matches: false,
  };
}

/**
 * Comprehensive verification of an uploaded file.
 */
export function verifyUploadedFile(
  file: Express.Multer.File,
  category: DocumentCategory
): IVerificationResult {
  const reasons: string[] = [];
  const maxSizeBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;
  const originalName = file.originalname || 'unknown';
  const sanitizedFileName = sanitizeFileName(originalName);
  const ext = path.extname(sanitizedFileName).toLowerCase();

  // 1. Check Non-Empty
  const nonEmpty = file.size > 0 && !!file.buffer && file.buffer.length > 0;
  if (!nonEmpty) {
    reasons.push('File is empty (0 bytes).');
  }

  // 2. Check Size Limit
  const sizeLimitOk = file.size <= maxSizeBytes;
  if (!sizeLimitOk) {
    reasons.push(
      `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds allowed limit of ${env.MAX_FILE_SIZE_MB} MB.`
    );
  }

  // 3. Executable & Dangerous File Heuristic Check
  const parts = originalName.toLowerCase().split('.');
  const hasDangerousExt = parts.some((part) => DANGEROUS_EXTENSIONS.has(`.${part}`));
  const executableScanClean = !hasDangerousExt && !DANGEROUS_EXTENSIONS.has(ext);
  if (!executableScanClean) {
    reasons.push(
      `Security violation: Executable or script file extension detected (${ext}). Upload rejected.`
    );
  }

  // 4. Category Definition Check
  const categoryMeta = CATEGORY_DEFINITIONS[category];
  let categoryAllowed = false;
  if (!categoryMeta) {
    reasons.push(`Invalid document category: ${category}`);
  } else {
    const isExtensionAllowed = categoryMeta.allowedExtensions.includes(ext);
    if (!isExtensionAllowed) {
      reasons.push(
        `Extension ${ext} is not permitted for category "${categoryMeta.label}". Allowed: ${categoryMeta.allowedExtensions.join(', ')}`
      );
    } else {
      categoryAllowed = true;
    }
  }

  // 5. Magic Byte / File Signature Check
  const { detectedMime, magicBytesHex, matches } = detectMagicByteMime(
    file.buffer,
    ext
  );

  const magicByteMatch = matches;
  if (!magicByteMatch && ext !== '.txt' && ext !== '.csv') {
    reasons.push(
      `Content signature mismatch: File content does not match extension ${ext}. Expected valid file header.`
    );
  }

  // 6. Safe Extension check
  const safeExtension =
    categoryMeta?.allowedExtensions.includes(ext) && executableScanClean;

  const passed =
    nonEmpty &&
    sizeLimitOk &&
    executableScanClean &&
    categoryAllowed &&
    magicByteMatch;

  return {
    passed,
    sanitizedFileName,
    fileExtension: ext,
    detectedMime,
    claimedMime: file.mimetype,
    magicBytesHex,
    fileSizeBytes: file.size,
    checks: {
      safeExtension,
      magicByteMatch,
      sizeLimitOk,
      nonEmpty,
      categoryAllowed,
      executableScanClean,
    },
    reasons,
  };
}

/**
 * Calculates SHA-256 hash of the buffer
 */
export function computeFileChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Multer memory storage configuration for streaming uploads
 */
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 1, // Single file upload per request
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return cb(
        AppError.badRequest(
          `Security blocked: Uploading files with extension ${ext} is strictly prohibited`
        )
      );
    }
    cb(null, true);
  },
});
