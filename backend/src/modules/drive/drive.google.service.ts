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
   * Ensures that a dedicated folder exists for the category inside Google Drive (or local storage).
   */
  public async ensureCategoryFolder(category: DocumentCategory): Promise<string> {
    const meta = CATEGORY_DEFINITIONS[category];
    const folderName = meta ? meta.folderName : `Category_${category}`;

    if (this.folderCache.has(category)) {
      return this.folderCache.get(category)!;
    }

    if (!this.isConfigured || !this.driveClient) {
      // Local fallback folder
      const localCatDir = path.join(this.localUploadsDir, folderName);
      if (!fs.existsSync(localCatDir)) {
        fs.mkdirSync(localCatDir, { recursive: true });
      }
      this.folderCache.set(category, localCatDir);
      return localCatDir;
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
      if (
        error?.message?.includes('storage quota') ||
        error?.message?.includes('Service Accounts')
      ) {
        logger.warn(
          `⚠️ Service Accounts do not have storage quota on root. Falling back to secure local storage until GOOGLE_DRIVE_PARENT_FOLDER_ID is set. To enable Google Drive sync, create a folder in your Google Drive, share it with ${this.serviceAccountEmail || 'my-drive-bot@caramel-source-512304-k1.iam.gserviceaccount.com'} as Editor, and put the folder ID in .env.`
        );
        const localCatDir = path.join(this.localUploadsDir, folderName);
        if (!fs.existsSync(localCatDir)) {
          fs.mkdirSync(localCatDir, { recursive: true });
        }
        this.folderCache.set(category, localCatDir);
        return localCatDir;
      }
      throw error;
    }
  }

  /**
   * Uploads file buffer to Google Drive inside the dedicated category folder.
   */
  public async uploadFile(
    file: Express.Multer.File,
    category: DocumentCategory,
    sanitizedFileName: string,
    description?: string
  ): Promise<{
    fileId: string;
    folderId: string;
    webViewLink?: string;
    webContentLink?: string;
    provider: 'google-drive' | 'local-fallback';
  }> {
    const folderId = await this.ensureCategoryFolder(category);

    // If Google Drive is not configured OR folderId is a local directory, write to local disk
    if (
      !this.isConfigured ||
      !this.driveClient ||
      folderId.includes(path.sep) ||
      folderId.startsWith(this.localUploadsDir)
    ) {
      const uniqueName = `${Date.now()}_${sanitizedFileName}`;
      const filePath = path.join(folderId, uniqueName);
      fs.writeFileSync(filePath, file.buffer);

      return {
        fileId: `local_${uniqueName}`,
        folderId,
        webViewLink: `/api/v1/drive/download/local_${uniqueName}`,
        webContentLink: `/api/v1/drive/download/local_${uniqueName}`,
        provider: 'local-fallback',
      };
    }

    try {
      // 1. Upload stream to Google Drive
      const stream = Readable.from(file.buffer);
      const res = await this.driveClient.files.create({
        requestBody: {
          name: sanitizedFileName,
          parents: [folderId],
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

      // 2. Grant view permissions if appropriate (or reader to anyone with link)
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

      // Fetch webViewLink & webContentLink
      const fileInfo = await this.driveClient.files.get({
        fileId,
        fields: 'id, name, webViewLink, webContentLink',
        supportsAllDrives: true,
      });

      return {
        fileId,
        folderId,
        webViewLink: fileInfo.data.webViewLink || undefined,
        webContentLink: fileInfo.data.webContentLink || undefined,
        provider: 'google-drive',
      };
    } catch (uploadError: any) {
      logger.error('Google Drive file upload failed:', uploadError?.message || uploadError);
      if (
        uploadError?.message?.includes('storage quota') ||
        uploadError?.message?.includes('Service Accounts')
      ) {
        logger.warn(
          `⚠️ Service Account cannot upload to root. Falling back to local storage. Share a folder with ${this.serviceAccountEmail} and update GOOGLE_DRIVE_PARENT_FOLDER_ID in .env to upload directly to Drive.`
        );
        const meta = CATEGORY_DEFINITIONS[category];
        const folderName = meta ? meta.folderName : `Category_${category}`;
        const localCatDir = path.join(this.localUploadsDir, folderName);
        if (!fs.existsSync(localCatDir)) fs.mkdirSync(localCatDir, { recursive: true });

        const uniqueName = `${Date.now()}_${sanitizedFileName}`;
        const filePath = path.join(localCatDir, uniqueName);
        fs.writeFileSync(filePath, file.buffer);

        return {
          fileId: `local_${uniqueName}`,
          folderId: localCatDir,
          webViewLink: `/api/v1/drive/download/local_${uniqueName}`,
          webContentLink: `/api/v1/drive/download/local_${uniqueName}`,
          provider: 'local-fallback',
        };
      }
      throw uploadError;
    }
  }

  /**
   * Deletes a file from Google Drive (or local fallback).
   */
  public async deleteFile(fileId: string): Promise<boolean> {
    if (fileId.startsWith('local_')) {
      // Local fallback removal
      try {
        const uniqueName = fileId.replace('local_', '');
        for (const meta of Object.values(CATEGORY_DEFINITIONS)) {
          const checkPath = path.join(this.localUploadsDir, meta.folderName, uniqueName);
          if (fs.existsSync(checkPath)) {
            fs.unlinkSync(checkPath);
            return true;
          }
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
      for (const meta of Object.values(CATEGORY_DEFINITIONS)) {
        const checkPath = path.join(this.localUploadsDir, meta.folderName, uniqueName);
        if (fs.existsSync(checkPath)) {
          return fs.createReadStream(checkPath);
        }
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
