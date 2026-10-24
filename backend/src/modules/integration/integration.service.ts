import { IntegrationModel } from './integration.model';
import { IIntegrationDocument } from './integration.interface';

export class IntegrationService {
  /**
   * Upsert a Google integration document with refresh token and practice email.
   */
  static async upsertGoogleIntegration(data: {
    email: string;
    refreshToken: string;
    accessToken?: string;
    expiryDate?: number;
    scope?: string;
  }): Promise<IIntegrationDocument> {
    const updated = await IntegrationModel.findOneAndUpdate(
      { provider: 'google' },
      {
        provider: 'google',
        email: data.email.toLowerCase(),
        refreshToken: data.refreshToken,
        ...(data.accessToken ? { accessToken: data.accessToken } : {}),
        ...(data.expiryDate ? { expiryDate: data.expiryDate } : {}),
        ...(data.scope ? { scope: data.scope } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return updated;
  }

  /**
   * Retrieve Google integration settings.
   */
  static async getGoogleIntegration(): Promise<IIntegrationDocument | null> {
    return await IntegrationModel.findOne({ provider: 'google' }).exec();
  }

  /**
   * Remove Google integration (disconnect).
   */
  static async removeGoogleIntegration(): Promise<boolean> {
    const res = await IntegrationModel.deleteOne({ provider: 'google' });
    return res.deletedCount > 0;
  }
}
