import { HomeMetricsSnapshotModel } from './homeDashboard.model';
import { IHomeMetricsData } from './homeDashboard.interface';

export class HomeDashboardService {
  /**
   * Retrieves the ultra-fast numerical snapshot for a given account/user.
   * If a dedicated user snapshot doesn't exist yet, falls back to the role-based default.
   */
  static async getSnapshot(accountKey: string, role?: string): Promise<IHomeMetricsData | null> {
    if (!accountKey) return null;

    // 1. Direct user/account key lookup (indexed unique read: ~1-3ms)
    const exactMatch = await HomeMetricsSnapshotModel.findOne({ accountKey }).lean();
    if (exactMatch?.metrics) {
      return exactMatch.metrics;
    }

    // 2. Role-based fallback if available (e.g. for a new employee or freshly invited admin)
    if (role) {
      const roleMatch = await HomeMetricsSnapshotModel.findOne({
        $or: [{ accountKey: `role_${role}` }, { role }],
      })
        .sort({ updatedAt: -1 })
        .lean();

      if (roleMatch?.metrics) {
        return roleMatch.metrics;
      }
    }

    return null;
  }

  /**
   * Upserts the latest numerical snapshot for this account/user.
   */
  static async saveSnapshot(
    accountKey: string,
    metadata: { userId?: string; userEmail?: string; role?: string; orgId?: string },
    metrics: IHomeMetricsData
  ): Promise<void> {
    if (!accountKey || !metrics) return;

    await HomeMetricsSnapshotModel.findOneAndUpdate(
      { accountKey },
      {
        $set: {
          metrics,
          userId: metadata.userId || '',
          userEmail: metadata.userEmail || '',
          role: metadata.role || 'admin',
          orgId: metadata.orgId || '',
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}
