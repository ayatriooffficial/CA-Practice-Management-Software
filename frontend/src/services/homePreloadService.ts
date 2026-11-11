import { homeMetricsSnapshotApi } from './homeMetricsSnapshotApi';
import { attendanceApi } from './attendanceApi';
import { dashboardSummaryApi } from './dashboardSummaryApi';
import { clientApi } from './clientApi';
import { leadApi } from './leadApi';
import { todoApi, TeamTaskItem } from './todoApi';
import { pageStateCache } from './pageStateCache';

/**
 * Preloads all Home Dashboard data in parallel before route transition or UI reveal.
 * Ensures the Count Panel (all 5 metrics: leads, clients, compliance, tasks, invoice),
 * Task Overview, Invoicing, and Attendance Cards are loaded TOGETHER before the page is revealed.
 */
export async function preloadHomeDashboardData(): Promise<void> {
  try {
    const todayDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const [
      snapshotRes,
      taskRes,
      invRes,
      compRes,
      clientStatsRes,
      leadStatsRes,
      attSummaryRes,
      holidaysRes,
      todayAttRes,
      adminTasksRes,
      todosRes,
    ] = await Promise.allSettled([
      homeMetricsSnapshotApi.getMetricsSnapshot(),
      dashboardSummaryApi.getCompactTaskSummary(),
      dashboardSummaryApi.getInvoicingSummary(),
      dashboardSummaryApi.getComplianceSummary(),
      clientApi.getClientStats(),
      leadApi.getLeadStats(),
      attendanceApi.getSummary('month'),
      attendanceApi.getUpcomingHolidays(),
      attendanceApi.getTodayAttendance(todayDate),
      todoApi.getAdminTasks().catch(() => []),
      todoApi.getTodos().catch(() => []),
    ]);

    // Store in pageStateCache for instant synchronous component hydration
    if (taskRes.status === 'fulfilled' && taskRes.value) {
      pageStateCache.set('home_task_summary', taskRes.value);
    }
    if (invRes.status === 'fulfilled' && invRes.value) {
      pageStateCache.set('home_invoicing_summary', invRes.value);
    }
    if (compRes.status === 'fulfilled' && compRes.value) {
      pageStateCache.set('home_compliance_summary', compRes.value);
    }
    if (clientStatsRes.status === 'fulfilled' && clientStatsRes.value?.data) {
      pageStateCache.set('home_client_stats', clientStatsRes.value.data);
    }
    if (leadStatsRes.status === 'fulfilled' && leadStatsRes.value?.data) {
      pageStateCache.set('home_lead_stats', leadStatsRes.value.data);
    }
    if (attSummaryRes.status === 'fulfilled' && attSummaryRes.value?.cards) {
      pageStateCache.set('home_attendance_summary', attSummaryRes.value.cards);
    }
    if (holidaysRes.status === 'fulfilled' && holidaysRes.value) {
      pageStateCache.set('home_holidays', holidaysRes.value);
    }
    if (todayAttRes.status === 'fulfilled' && (todayAttRes.value as any)?.rows) {
      pageStateCache.set('home_attendance_today_rows', (todayAttRes.value as any).rows);
    }

    // Pre-cache To-Do items
    const adminTasks = adminTasksRes.status === 'fulfilled' && Array.isArray(adminTasksRes.value) ? adminTasksRes.value : [];
    const personalTodos = todosRes.status === 'fulfilled' && Array.isArray(todosRes.value) ? todosRes.value : [];
    if (adminTasks.length > 0 || personalTodos.length > 0) {
      const merged: TeamTaskItem[] = [
        ...personalTodos.map((pt: any) => ({
          id: `pt_${pt.id}`,
          taskId: pt.id,
          taskName: pt.title,
          description: pt.description || '',
          category: pt.category || 'Personal',
          clientName: pt.clientName || '',
          clientId: pt.clientId,
          assigneeId: 'me',
          assigneeName: 'Me',
          priority: pt.priority || 'Medium',
          status: pt.completed ? 'Completed' : 'Pending',
          targetDueDate: pt.dueDate || todayDate,
          progress: pt.completed ? 100 : 0,
          checklistTotal: 0,
          checklistCompleted: 0,
          checklist: [],
          isOverdue: !pt.completed && Boolean(pt.dueDate && pt.dueDate < todayDate),
          daysLeft: 0,
          createdAt: pt.createdAt,
          updatedAt: pt.updatedAt,
          isPersonal: true,
        } as any)),
        ...adminTasks.map((at: any) => ({
          id: at.dedupKey || at.id,
          taskId: at.sourceId || at.id,
          taskName: at.title,
          description: at.description,
          category: at.category || 'Administrative',
          clientName: at.clientName || '',
          clientId: at.clientId,
          assigneeId: 'admin',
          assigneeName: 'Admin',
          priority: at.priority || 'Medium',
          status: at.completed ? 'Completed' : at.status === 'Expired' ? 'Overdue' : 'Pending',
          targetDueDate: at.dueDate,
          progress: at.completed ? 100 : 0,
          checklistTotal: 1,
          checklistCompleted: at.completed ? 1 : 0,
          checklist: [],
          isOverdue: !at.completed && (at.daysLeft < 0 || at.status === 'Expired'),
          daysLeft: at.daysLeft,
          createdAt: at.createdAt,
          updatedAt: at.updatedAt,
          isAdministrative: true,
        } as any)),
      ];
      pageStateCache.set('home_todo_tasks', merged);
    }

    const snapshot =
      snapshotRes.status === 'fulfilled' && snapshotRes.value
        ? snapshotRes.value
        : homeMetricsSnapshotApi.getCachedSnapshot();

    // Construct the complete, unified count panel metrics so all 5 cards load together
    const leadStats = leadStatsRes.status === 'fulfilled' ? leadStatsRes.value?.data : null;
    const clientStats = clientStatsRes.status === 'fulfilled' ? clientStatsRes.value?.data : null;
    const compSummary = compRes.status === 'fulfilled' ? compRes.value : null;
    const taskSummary = taskRes.status === 'fulfilled' ? taskRes.value : null;
    const invSummary = invRes.status === 'fulfilled' ? invRes.value : null;

    const unifiedCounts = {
      leads: {
        top: (leadStats as any)?.newToday ?? snapshot?.stripMetrics?.leads?.top ?? 0,
        bottom: leadStats ? Math.max(0, (leadStats.totalLeads || 0) - (leadStats.byStatus?.converted || 0) - (leadStats.byStatus?.dropped || 0)) : (snapshot?.stripMetrics?.leads?.bottom ?? 0),
      },
      clients: {
        top: clientStats?.newThisMonth ?? clientStats?.newThisWeek ?? snapshot?.stripMetrics?.clients?.top ?? 0,
        bottom: clientStats?.clientsToConvert ?? clientStats?.totalClients ?? snapshot?.stripMetrics?.clients?.bottom ?? 0,
      },
      compliance: {
        top: compSummary?.dueThisMonth ?? snapshot?.stripMetrics?.compliance?.top ?? 0,
        bottom: compSummary ? ((compSummary?.pending ?? 0) + (compSummary?.missed ?? 0)) : (snapshot?.stripMetrics?.compliance?.bottom ?? 0),
      },
      tasks: {
        top: taskSummary?.dueStats?.dueToday ?? taskSummary?.statusSummary?.total ?? snapshot?.stripMetrics?.tasks?.top ?? 0,
        bottom: taskSummary ? ((taskSummary?.statusSummary?.pending ?? 0) + (taskSummary?.statusSummary?.inProgress ?? 0)) : (snapshot?.stripMetrics?.tasks?.bottom ?? 0),
      },
      invoice: {
        top: invSummary?.draftInvoices?.count ?? snapshot?.stripMetrics?.invoice?.top ?? 0,
        bottom: (invSummary?.totalReceivables?.count || invSummary?.overdueInvoices?.count) ?? snapshot?.stripMetrics?.invoice?.bottom ?? 0,
      },
    };

    pageStateCache.set('home_task_strip_data', {
      ...unifiedCounts,
      taskData: taskSummary,
      invoicingData: invSummary,
      complianceData: compSummary,
      clientData: clientStats,
      leadStats: leadStats,
    });

    const updatedSnap = snapshot || {};
    updatedSnap.countLabels = unifiedCounts;
    updatedSnap.stripMetrics = unifiedCounts;
    if (attSummaryRes.status === 'fulfilled' && attSummaryRes.value?.cards) {
      updatedSnap.summaryCards = attSummaryRes.value.cards;
    }
    homeMetricsSnapshotApi.saveMetricsSnapshot(updatedSnap, false);

    pageStateCache.set('home_dashboard_data', {
      summaryCards: attSummaryRes.status === 'fulfilled' ? attSummaryRes.value?.cards || [] : [],
      todayRows: todayAttRes.status === 'fulfilled' ? (todayAttRes.value as any)?.rows || [] : [],
      employeeRecords: [],
      holidays: holidaysRes.status === 'fulfilled' ? holidaysRes.value || [] : [],
      leaves: [],
    });
    pageStateCache.markLoaded('/');
  } catch (err) {
    console.warn('Home preload encountered error, proceeding with cache fallback', err);
  }
}
