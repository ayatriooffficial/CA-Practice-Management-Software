import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { google, drive_v3 } from 'googleapis';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import {
  DocumentCategory,
  CATEGORY_DEFINITIONS,
  IDriveStatusResponse,
} from './drive.interface';
import { AppError } from '../../shared/utils/apiError';

export class GoogleDriveService {
  private driveClient: drive_v3.Drive | null = null;
  private isConfigured: boolean = false;
  private serviceAccountEmail: string | undefined;
  private folderCache: Map<DocumentCategory, string> = new Map();
  private localUploadsDir: string;

  constructor() {
    this.localUploadsDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    this.initializeDriveClient();
  }

  /**
   * Initializes Google Drive client supporting Service Account JSON, JSON string, or OAuth2.
   */
  private initializeDriveClient(): void {
    try {
      // Method 1: Service Account JSON file path
      if (
        env.GOOGLE_DRIVE_CREDENTIALS_PATH &&
        fs.existsSync(env.GOOGLE_DRIVE_CREDENTIALS_PATH)
      ) {
        const credentialsRaw = fs.readFileSync(env.GOOGLE_DRIVE_CREDENTIALS_PATH, 'utf-8');
        const credentials = JSON.parse(credentialsRaw);
        const auth = new google.auth.GoogleAuth({
          keyFile: env.GOOGLE_DRIVE_CREDENTIALS_PATH,
          scopes: ['https://www.googleapis.com/auth/drive'],
        });
        this.driveClient = google.drive({ version: 'v3', auth });
        this.isConfigured = true;
        this.serviceAccountEmail = credentials.client_email;
        logger.info(
          `✅ Google Drive Service Account authenticated via file (${this.serviceAccountEmail})`
        );
        return;
      }

      // Method 2: Raw Service Account JSON string in environment variable
      if (env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON) {
        let credentialsRaw = env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON.trim();
        // Support base64 encoded JSON string
        if (!credentialsRaw.startsWith('{')) {
          try {
            credentialsRaw = Buffer.from(credentialsRaw, 'base64').toString('utf-8');
          } catch {
            // keep as-is
          }
        }
        const credentials = JSON.parse(credentialsRaw);
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/drive'],
        });
        this.driveClient = google.drive({ version: 'v3', auth });
        this.isConfigured = true;
        this.serviceAccountEmail = credentials.client_email;
        logger.info(
          `✅ Google Drive Service Account authenticated via env JSON (${this.serviceAccountEmail})`
        );
        return;
      }

      // Method 3: OAuth2 Client Credentials & Refresh Token
      if (
        env.GOOGLE_DRIVE_CLIENT_ID &&
        env.GOOGLE_DRIVE_CLIENT_SECRET &&
        env.GOOGLE_DRIVE_REFRESH_TOKEN
      ) {
        const oauth2Client = new google.auth.OAuth2(
          env.GOOGLE_DRIVE_CLIENT_ID,
          env.GOOGLE_DRIVE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({
          refresh_token: env.GOOGLE_DRIVE_REFRESH_TOKEN,
        });
        this.driveClient = google.drive({ version: 'v3', auth: oauth2Client });
        this.isConfigured = true;
        logger.info('✅ Google Drive authenticated via OAuth2 Refresh Token');
        return;
      }

      logger.warn(
        '⚠️ Google Drive credentials not configured. Drive service will use secure local fallback mode until credentials are provided in .env.'
      );
      this.isConfigured = false;
    } catch (err: any) {
      logger.error('❌ Failed to initialize Google Drive client:', err?.message || err);
      this.isConfigured = false;
    }
  }

  /**
   * Ensures that a dedicated folder exists for the category inside Google Drive.
   */
  public async ensureCategoryFolder(category: DocumentCategory): Promise<string> {
    const meta = CATEGORY_DEFINITIONS[category];
    const folderName = meta ? meta.folderName : `Category_${category}`;

    if (this.folderCache.has(category)) {
      return this.folderCache.get(category)!;
    }

    if (!this.isConfigured || !this.driveClient) {
      throw AppError.badRequest('Google Drive is not configured. Cannot create category folder.');
    }

    try {
      const parentId = env.GOOGLE_DRIVE_PARENT_FOLDER_ID || 'root';

      // 1. Search for existing folder with exact name and parent
      const searchRes = await this.driveClient.files.list({
        q: `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (searchRes.data.files && searchRes.data.files.length > 0) {
        const folderId = searchRes.data.files[0].id!;
        this.folderCache.set(category, folderId);
        return folderId;
      }

      // 2. Create category folder if it does not exist
      const createRes = await this.driveClient.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
          description: `Ayatrio CA Practice Repository: ${meta?.label || category}`,
        },
        fields: 'id, name',
        supportsAllDrives: true,
      });

      const newFolderId = createRes.data.id!;
      this.folderCache.set(category, newFolderId);
      logger.info(`📁 Created Google Drive category folder: "${folderName}" (ID: ${newFolderId})`);
      return newFolderId;
    } catch (error: any) {
      logger.error(`Error ensuring category folder for ${category}:`, error?.message || error);
      throw AppError.internal(`Google Drive folder access failed: ${error?.message || error}`);
    }
  }

  /**
   * Ensures a folder exists inside Google Drive under a parent folder.
   */
  public async ensureFolder(folderName: string, parentId?: string): Promise<string> {
    const cleanName = folderName.replace(/[<>:"/\\|?*]/g, '_').trim();
    if (!this.isConfigured || !this.driveClient) {
      throw AppError.badRequest('Google Drive is not configured.');
    }

    try {
      const parent = parentId || env.GOOGLE_DRIVE_PARENT_FOLDER_ID || 'root';
      const searchRes = await this.driveClient.files.list({
        q: `name = '${cleanName}' and '${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (searchRes.data.files && searchRes.data.files.length > 0) {
        return searchRes.data.files[0].id!;
      }

      const createRes = await this.driveClient.files.create({
        requestBody: {
          name: cleanName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parent],
        },
        fields: 'id, name',
        supportsAllDrives: true,
      });

      return createRes.data.id!;
    } catch (error: any) {
      logger.error(`Error creating Google Drive folder "${folderName}":`, error?.message || error);
      throw AppError.internal(`Google Drive folder creation failed: ${error?.message || error}`);
    }
  }

  /**
   * Uploads file buffer to Google Drive inside dedicated category or client/task folder.
   * If Google Drive upload fails, throws error without saving locally.
   */
  public async uploadFile(
    file: Express.Multer.File,
    category: DocumentCategory,
    sanitizedFileName: string,
    description?: string,
    options?: {
      clientName?: string;
      subFolder?: string;
      customFileName?: string;
    }
  ): Promise<{
    fileId: string;
    folderId: string;
    webViewLink?: string;
    webContentLink?: string;
    provider: 'google-drive' | 'local-fallback';
  }> {
    if (!this.isConfigured || !this.driveClient) {
      throw AppError.badRequest('Google Drive is not configured. Local file storage is disabled.');
    }

    const defaultCategoryFolder = await this.ensureCategoryFolder(category);

    // Compute proper document name
    const ext = path.extname(sanitizedFileName);
    let finalDocName = sanitizedFileName;
    if (options?.customFileName) {
      const cleanCustom = options.customFileName.replace(/[<>:"/\\|?*]/g, '_').trim();
      finalDocName = cleanCustom.endsWith(ext) ? cleanCustom : `${cleanCustom}${ext}`;
    }

    try {
      let targetFolderId = defaultCategoryFolder;
      if (options?.clientName) {
        const clientFolderId = await this.ensureFolder(options.clientName);
        targetFolderId = options.subFolder
          ? await this.ensureFolder(options.subFolder, clientFolderId)
          : clientFolderId;
      }

      // Upload stream directly to Google Drive
      const stream = Readable.from(file.buffer);
      const res = await this.driveClient.files.create({
        requestBody: {
          name: finalDocName,
          parents: [targetFolderId],
          description: description || `Uploaded via Ayatrio Practice System [${category}]`,
          mimeType: file.mimetype,
        },
        media: {
          mimeType: file.mimetype,
          body: stream,
        },
        fields: 'id, name, webViewLink, webContentLink, size, mimeType',
        supportsAllDrives: true,
      });

      const fileId = res.data.id!;

      // Grant view permissions
      try {
        await this.driveClient.permissions.create({
          fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
          supportsAllDrives: true,
        });
      } catch (permErr: any) {
        logger.warn(`Permission set warning on file ${fileId}:`, permErr?.message);
      }

      // Fetch links
      const fileInfo = await this.driveClient.files.get({
        fileId,
        fields: 'id, name, webViewLink, webContentLink',
        supportsAllDrives: true,
      });

      return {
        fileId,
        folderId: targetFolderId,
        webViewLink: fileInfo.data.webViewLink || undefined,
        webContentLink: fileInfo.data.webContentLink || undefined,
        provider: 'google-drive',
      };
    } catch (uploadError: any) {
      logger.error('Google Drive file upload failed:', uploadError?.message || uploadError);
      throw AppError.internal(`Google Drive upload failed: ${uploadError?.message || 'Error uploading file'}`);
    }
  }

  private findLocalFile(dir: string, fileName: string): string | null {
    if (!fs.existsSync(dir)) return null;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        const found = this.findLocalFile(fullPath, fileName);
        if (found) return found;
      } else if (item.name === fileName || item.name.includes(fileName)) {
        return fullPath;
      }
    }
    return null;
  }

  /**
   * Deletes a file from Google Drive (or local fallback).
   */
  public async deleteFile(fileId: string): Promise<boolean> {
    if (fileId.startsWith('local_')) {
      try {
        const uniqueName = fileId.replace('local_', '');
        const found = this.findLocalFile(this.localUploadsDir, uniqueName);
        if (found && fs.existsSync(found)) {
          fs.unlinkSync(found);
          return true;
        }
      } catch {
        return false;
      }
      return true;
    }

    if (!this.isConfigured || !this.driveClient) {
      return true;
    }

    try {
      await this.driveClient.files.delete({ fileId, supportsAllDrives: true });
      return true;
    } catch (err: any) {
      logger.error(`Failed to delete Google Drive file ${fileId}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Retrieves a readable stream for downloading a file.
   */
  public async getFileStream(fileId: string): Promise<Readable> {
    if (fileId.startsWith('local_')) {
      const uniqueName = fileId.replace('local_', '');
      const found = this.findLocalFile(this.localUploadsDir, uniqueName);
      if (found && fs.existsSync(found)) {
        return fs.createReadStream(found);
      }
      throw new Error('Local file not found');
    }

    if (!this.isConfigured || !this.driveClient) {
      throw new Error('Google Drive client is not active');
    }

    const res = await this.driveClient.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    return res.data;
  }

  /**
   * Returns current Google Drive integration status.
   */
  public async getStatus(): Promise<IDriveStatusResponse> {
    if (!this.isConfigured || !this.driveClient) {
      return {
        isConfigured: false,
        provider: 'local-fallback',
        parentFolderId: env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
        activeCategoriesCount: Object.keys(CATEGORY_DEFINITIONS).length,
        message:
          'Google Drive credentials not set. Operating in local storage fallback mode. Add GOOGLE_DRIVE_CREDENTIALS_PATH or GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON to .env to enable direct cloud sync.',
      };
    }

    try {
      const about = await this.driveClient.about.get({
        fields: 'user, storageQuota',
      });

      return {
        isConfigured: true,
        provider: 'google-drive',
        parentFolderId: env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
        activeCategoriesCount: Object.keys(CATEGORY_DEFINITIONS).length,
        userEmail: about.data.user?.emailAddress || this.serviceAccountEmail,
        quota: {
          limit: about.data.storageQuota?.limit || undefined,
          usage: about.data.storageQuota?.usage || undefined,
          usageInDrive: about.data.storageQuota?.usageInDrive || undefined,
        },
        message: 'Google Drive connected and operational with category folder routing.',
      };
    } catch (err: any) {
      return {
        isConfigured: true,
        provider: 'google-drive',
        parentFolderId: env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
        activeCategoriesCount: Object.keys(CATEGORY_DEFINITIONS).length,
        userEmail: this.serviceAccountEmail,
        message: `Google Drive initialized (${err?.message || 'Ready'})`,
      };
    }
  }
}

export const googleDriveService = new GoogleDriveService();
