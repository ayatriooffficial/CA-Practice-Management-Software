import { HomeMetricsSnapshotModel } from './homeDashboard.model';
import { IHomeMetricsData } from './homeDashboard.interface';
import { Lead } from '../lead/lead.model';
import { Client } from '../client/client.model';
import { Task } from '../task/task.model';
import { FinancialInvoice } from '../financials/financial.model';
import { ComplianceEntryModel } from '../compliance/compliance.model';

export class HomeDashboardService {
  /**
   * Retrieves the ultra-fast numerical snapshot for a given account/user.
   * If a dedicated user snapshot doesn't exist yet, falls back to the role-based default,
   * or computes indexed document counts from the database and persists them for instantaneous future reads.
   */
  static async getSnapshot(accountKey: string, role?: string): Promise<IHomeMetricsData | null> {
    if (!accountKey) return null;

    // 1. Direct user/account key lookup (indexed unique read: ~1-3ms)
    const exactMatch = await HomeMetricsSnapshotModel.findOne({ accountKey }).lean();
    if (exactMatch?.metrics && exactMatch.metrics.countLabels) {
      return exactMatch.metrics;
    }

    // 2. Role-based fallback if available (e.g. for a new employee or freshly invited admin)
    if (role) {
      const roleMatch = await HomeMetricsSnapshotModel.findOne({
        $or: [{ accountKey: `role_${role}` }, { role }],
      })
        .sort({ updatedAt: -1 })
        .lean();

      if (roleMatch?.metrics && roleMatch.metrics.countLabels) {
        return roleMatch.metrics;
      }
    }

    // 3. Instant indexed count queries if no snapshot was ever saved yet (~3-5ms)
    try {
      const [leadsCount, clientsCount, tasksCount, invoicesCount, complianceCount] = await Promise.all([
        Lead.countDocuments({ isDeleted: false }).catch(() => 0),
        Client.countDocuments({ isDeleted: false }).catch(() => 0),
        Task.countDocuments({ isDeleted: false }).catch(() => 0),
        FinancialInvoice.countDocuments().catch(() => 0),
        ComplianceEntryModel.countDocuments({ isDeleted: false }).catch(() => 0),
      ]);

      const initialMetrics: IHomeMetricsData = {
        countLabels: {
          leads: { top: 0, bottom: leadsCount },
          clients: { top: 0, bottom: clientsCount },
          compliance: { top: 0, bottom: complianceCount },
          tasks: { top: 0, bottom: tasksCount },
          invoice: { top: 0, bottom: invoicesCount },
        },
        stripMetrics: {
          leads: { top: 0, bottom: leadsCount },
          clients: { top: 0, bottom: clientsCount },
          compliance: { top: 0, bottom: complianceCount },
          tasks: { top: 0, bottom: tasksCount },
          invoice: { top: 0, bottom: invoicesCount },
        },
        summaryCards: [
          { id: '1', title: 'Total Staff', value: '1', badge: 'Active', bar: '100%' },
          { id: '2', title: 'Present', value: '1', badge: 'Today', bar: '100%' },
          { id: '3', title: 'Absent', value: '0', badge: 'Today', bar: '0%' },
          { id: '4', title: 'Half Day', value: '0', badge: 'Today', bar: '0%' },
        ],
      };

      // Save asynchronously so all subsequent calls are indexed and instant
      HomeMetricsSnapshotModel.findOneAndUpdate(
        { accountKey },
        {
          $set: {
            metrics: initialMetrics,
            role: role || 'admin',
            updatedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      ).catch(() => {});

      return initialMetrics;
    } catch {
      return null;
    }
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
