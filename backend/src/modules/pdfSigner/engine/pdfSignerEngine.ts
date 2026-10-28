import crypto from 'crypto';
import forge from 'node-forge';
import {
  PDFDocument,
  PDFName,
  PDFHexString,
  PDFString,
  StandardFonts,
  rgb,
} from 'pdf-lib';
import { SignerProvider, CertificateDescriptor } from '../signer/signer.interface';

export interface SignatureOptions {
  reason?: string;
  location?: string;
  page: 'First' | 'Last' | 'Custom';
  customPages?: number[];
  placement: {
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
  };
  appearance: {
    showSignerName: boolean;
    showDateTime: boolean;
    showReasonLocation: boolean;
  };
}

export interface SignPdfResult {
  signedPdfBuffer: Buffer;
  signedSha256: string;
  signingTime: Date;
  signerSubject: string;
  certFingerprint: string;
  certSerial: string;
}

const PLACEHOLDER_HEX_LENGTH = 16384; // 8192 bytes allocated for CMS signature

export class PdfSignerEngine {
  static async signPdf(
    pdfBuffer: Buffer,
    provider: SignerProvider,
    certDesc: CertificateDescriptor,
    options: SignatureOptions
  ): Promise<SignPdfResult> {
    // 1. Load document with pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: false });
    const totalPages = pdfDoc.getPageCount();

    if (totalPages === 0) {
      throw new Error('PDF document contains no pages.');
    }

    // 2. Resolve target page index (0-indexed)
    let targetPageIndex = 0;
    if (options.page === 'Last') {
      targetPageIndex = totalPages - 1;
    } else if (options.page === 'Custom' && options.customPages && options.customPages.length > 0) {
      const p = options.customPages[0];
      targetPageIndex = Math.max(0, Math.min(totalPages - 1, p - 1));
    }

    const pageObj = pdfDoc.getPage(targetPageIndex);
    const pageWidth = pageObj.getWidth();
    const pageHeight = pageObj.getHeight();

    // 3. Compute PDF rectangle in points (origin is bottom-left in PDF)
    const { xPct, yPct, wPct, hPct } = options.placement;
    const rectX = Math.max(0, (xPct / 100) * pageWidth);
    const rectY = Math.max(0, ((100 - yPct - hPct) / 100) * pageHeight);
    const rectW = Math.max(120, (wPct / 100) * pageWidth);
    const rectH = Math.max(50, (hPct / 100) * pageHeight);

    // 4. Draw visible stamp
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Stamp box background and border
    pageObj.drawRectangle({
      x: rectX,
      y: rectY,
      width: rectW,
      height: rectH,
      color: rgb(0.97, 0.98, 1.0),
      borderColor: rgb(0.19, 0.44, 0.61), // #31719B primary blue
      borderWidth: 1,
    });

    // Extract human-readable name from subject
    const cnMatch = certDesc.subject.match(/CN=([^,]+)/i);
    const signerName = cnMatch ? cnMatch[1].trim() : certDesc.subject.slice(0, 30);
    const now = new Date();

    // Draw text inside stamp
    let currentY = rectY + rectH - 12;
    const paddingX = rectX + 6;
    const maxTextWidth = rectW - 12;

    pageObj.drawText('DIGITALLY SIGNED', {
      x: paddingX,
      y: currentY,
      size: 7,
      font: fontBold,
      color: rgb(0.19, 0.44, 0.61),
    });
    currentY -= 10;

    if (options.appearance.showSignerName) {
      const truncatedName = fontBold.widthOfTextAtSize(signerName, 8) > maxTextWidth
        ? signerName.slice(0, 24) + '...'
        : signerName;
      pageObj.drawText(`Signer: ${truncatedName}`, {
        x: paddingX,
        y: currentY,
        size: 7.5,
        font: fontBold,
        color: rgb(0.1, 0.15, 0.25),
      });
      currentY -= 9;
    }

    if (options.appearance.showDateTime) {
      const dateFormatted = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      pageObj.drawText(`Date: ${dateFormatted}`, {
        x: paddingX,
        y: currentY,
        size: 6.5,
        font,
        color: rgb(0.25, 0.3, 0.35),
      });
      currentY -= 9;
    }

    if (options.appearance.showReasonLocation) {
      if (options.reason) {
        const cleanReason = font.widthOfTextAtSize(`Reason: ${options.reason}`, 6.5) > maxTextWidth
          ? options.reason.slice(0, 20) + '...'
          : options.reason;
        pageObj.drawText(`Reason: ${cleanReason}`, {
          x: paddingX,
          y: currentY,
          size: 6.5,
          font,
          color: rgb(0.35, 0.4, 0.45),
        });
        currentY -= 8;
      }
      if (options.location) {
        const cleanLoc = font.widthOfTextAtSize(`Location: ${options.location}`, 6.5) > maxTextWidth
          ? options.location.slice(0, 20) + '...'
          : options.location;
        pageObj.drawText(`Location: ${cleanLoc}`, {
          x: paddingX,
          y: currentY,
          size: 6.5,
          font,
          color: rgb(0.35, 0.4, 0.45),
        });
      }
    }

    // 5. Add Signature dictionary and widget annotation
    const placeholderZeroes = '0'.repeat(PLACEHOLDER_HEX_LENGTH);
    const byteRangePlaceholder = [0, 1000000000, 1000000000, 1000000000];

    const sigDict = pdfDoc.context.obj({
      Type: 'Sig',
      Filter: 'Adobe.PPKLite',
      SubFilter: 'adbe.pkcs7.detached',
      ByteRange: byteRangePlaceholder,
      Contents: PDFHexString.of(placeholderZeroes),
      Reason: PDFString.of(options.reason || 'Approved and digitally verified'),
      Location: PDFString.of(options.location || 'India'),
      M: PDFString.fromDate(now),
    });
    const sigRef = pdfDoc.context.register(sigDict);

    const widgetDict = pdfDoc.context.obj({
      Type: 'Annot',
      Subtype: 'Widget',
      FT: 'Sig',
      Rect: [rectX, rectY, rectX + rectW, rectY + rectH],
      V: sigRef,
      T: PDFString.of(`Signature_${Date.now()}`),
      F: 4, // Print flag
      P: pageObj.ref,
    });
    const widgetRef = pdfDoc.context.register(widgetDict);

    // Attach to page annotations
    const existingAnnots = pageObj.node.get(PDFName.of('Annots'));
    if (existingAnnots && 'push' in (existingAnnots as any)) {
      (existingAnnots as any).push(widgetRef);
    } else {
      pageObj.node.set(PDFName.of('Annots'), pdfDoc.context.obj([widgetRef]));
    }

    // Ensure AcroForm is present in catalog with SigFlags: 3 (SignaturesExist | AppendOnly)
    pdfDoc.catalog.set(
      PDFName.of('AcroForm'),
      pdfDoc.context.obj({
        Fields: [widgetRef],
        SigFlags: 3,
      })
    );

    // Save with uncompressed object streams to allow exact byte position replacement
    const rawPdfBytes = await pdfDoc.save({ useObjectStreams: false });
    const buffer = Buffer.from(rawPdfBytes);

    // 6. Find offsets of /ByteRange and /Contents
    const byteRangePattern = Buffer.from('/ByteRange [ 0 1000000000 1000000000 1000000000 ]');
    const byteRangePos = buffer.indexOf(byteRangePattern);
    if (byteRangePos === -1) {
      throw new Error('Could not locate ByteRange placeholder in generated PDF buffer');
    }

    const contentsHeader = Buffer.from('/Contents <');
    const contentsStartPos = buffer.indexOf(contentsHeader);
    if (contentsStartPos === -1) {
      throw new Error('Could not locate /Contents placeholder in generated PDF buffer');
    }

    const startOfHex = contentsStartPos + contentsHeader.length; // points to first '0'
    const endOfHex = startOfHex + PLACEHOLDER_HEX_LENGTH; // points to '>'
    if (buffer[endOfHex] !== 0x3e /* '>' */) {
      throw new Error('Mismatched /Contents placeholder boundary in generated PDF');
    }

    // Byte ranges:
    // range 1: 0 to startOfHex - 1 (including '<')
    // range 2: endOfHex + 1 to end of buffer (excluding '>')
    const offset1 = 0;
    const len1 = startOfHex - 1; // up to opening '<'
    const offset2 = endOfHex + 1; // from character after closing '>'
    const len2 = buffer.length - offset2;

    const actualByteRange = [offset1, len1, offset2, len2];
    const byteRangeString = `/ByteRange [ ${actualByteRange[0]} ${actualByteRange[1]} ${actualByteRange[2]} ${actualByteRange[3]} ]`;
    const paddedByteRangeString = byteRangeString.padEnd(byteRangePattern.length, ' ');
    buffer.write(paddedByteRangeString, byteRangePos, 'ascii');

    // 7. Calculate SHA-256 hash of document over the ByteRange
    const part1 = buffer.subarray(offset1, offset1 + len1);
    const part2 = buffer.subarray(offset2, offset2 + len2);
    const docToHash = Buffer.concat([part1, part2]);
    const docHashBinary = crypto.createHash('sha256').update(docToHash).digest('binary');

    // 8. Build CMS/PKCS#7 SignedData using node-forge with External Signer
    const certAsn1 = forge.asn1.fromDer(Buffer.from(certDesc.certDerBase64, 'base64').toString('binary'));
    const forgeCert = forge.pki.certificateFromAsn1(certAsn1);

    const cmsHex = await this.buildCmsSignedData(
      forgeCert,
      docHashBinary,
      now,
      provider,
      certDesc.certId
    );

    if (cmsHex.length > PLACEHOLDER_HEX_LENGTH) {
      throw new Error(
        `Generated CMS signature length (${cmsHex.length}) exceeds reserved placeholder (${PLACEHOLDER_HEX_LENGTH}).`
      );
    }

    // Pad signature hex with trailing zeroes up to placeholder length
    const paddedCmsHex = cmsHex.padEnd(PLACEHOLDER_HEX_LENGTH, '0');
    buffer.write(paddedCmsHex, startOfHex, 'ascii');

    const signedSha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    return {
      signedPdfBuffer: buffer,
      signedSha256,
      signingTime: now,
      signerSubject: certDesc.subject,
      certFingerprint: certDesc.fingerprintSha256,
      certSerial: certDesc.serialNumber,
    };
  }

  /**
   * Builds an RFC 5652 compliant CMS SignedData structure with externally signed digest.
   */
  private static async buildCmsSignedData(
    cert: forge.pki.Certificate,
    docHashBinary: string,
    signingTime: Date,
    provider: SignerProvider,
    certId: string
  ): Promise<string> {
    // Format Date to UTCTime string (YYMMDDhhmmssZ)
    const yearStr = String(signingTime.getUTCFullYear()).slice(2);
    const monthStr = String(signingTime.getUTCMonth() + 1).padStart(2, '0');
    const dayStr = String(signingTime.getUTCDate()).padStart(2, '0');
    const hourStr = String(signingTime.getUTCHours()).padStart(2, '0');
    const minStr = String(signingTime.getUTCMinutes()).padStart(2, '0');
    const secStr = String(signingTime.getUTCSeconds()).padStart(2, '0');
    const utcTimeFormatted = `${yearStr}${monthStr}${dayStr}${hourStr}${minStr}${secStr}Z`;

    // 1. Authenticated attributes: contentType, signingTime, messageDigest
    const authAttrsAsn1 = [
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(forge.pki.oids.contentType).getBytes()),
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, [
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(forge.pki.oids.data).getBytes()),
        ]),
      ]),
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(forge.pki.oids.signingTime).getBytes()),
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, [
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.UTCTIME, false, utcTimeFormatted),
        ]),
      ]),
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(forge.pki.oids.messageDigest).getBytes()),
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, [
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OCTETSTRING, false, docHashBinary),
        ]),
      ]),
    ];

    // Per RFC 5652, the digest is computed over the DER encoding of SET OF Attribute
    const setOfAuthAttrs = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, authAttrsAsn1);
    const setOfAuthAttrsDer = forge.asn1.toDer(setOfAuthAttrs).getBytes();

    const authAttrsHashBinary = crypto.createHash('sha256').update(Buffer.from(setOfAuthAttrsDer, 'binary')).digest('binary');
    const authAttrsDigestBase64 = Buffer.from(authAttrsHashBinary, 'binary').toString('base64');

    // 2. Call external SignerProvider.signDigest() with ONLY the digest
    const { signatureBase64 } = await provider.signDigest({
      certId,
      digestBase64: authAttrsDigestBase64,
      hashAlg: 'SHA-256',
      keyAlg: 'RSA-PKCS1-v1_5',
    });

    const rawSignatureBinary = Buffer.from(signatureBase64, 'base64').toString('binary');

    // 3. Assemble SignerInfo
    const signerInfoAsn1 = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, forge.util.hexToBytes('01')), // version: 1
      // IssuerAndSerialNumber
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.pki.distinguishedNameToAsn1(cert.issuer),
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, forge.util.hexToBytes(cert.serialNumber)),
      ]),
      // DigestAlgorithmIdentifier: SHA-256
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(forge.pki.oids.sha256).getBytes()),
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ''),
      ]),
      // AuthenticatedAttributes (context-specific [0])
      forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, authAttrsAsn1),
      // SignatureAlgorithmIdentifier: rsaEncryption
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(forge.pki.oids.rsaEncryption).getBytes()),
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ''),
      ]),
      // SignatureValue (OCTET STRING)
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OCTETSTRING, false, rawSignatureBinary),
    ]);

    // 4. Assemble SignedData
    const signedDataAsn1 = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, forge.util.hexToBytes('01')), // version: 1
      // DigestAlgorithms SET
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(forge.pki.oids.sha256).getBytes()),
          forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ''),
        ]),
      ]),
      // ContentInfo: id-data with no content (detached)
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer(forge.pki.oids.data).getBytes()),
      ]),
      // Certificates (context-specific [0])
      forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, [
        forge.pki.certificateToAsn1(cert),
      ]),
      // SignerInfos SET
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, [
        signerInfoAsn1,
      ]),
    ]);

    // 5. Wrap in outer ContentInfo (signedData OID: 1.2.840.113549.1.7.2)
    const contentInfoAsn1 = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false, forge.asn1.oidToDer('1.2.840.113549.1.7.2').getBytes()),
      forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, [
        signedDataAsn1,
      ]),
    ]);

    const cmsDer = forge.asn1.toDer(contentInfoAsn1).getBytes();
    return forge.util.bytesToHex(cmsDer).toUpperCase();
  }
}
