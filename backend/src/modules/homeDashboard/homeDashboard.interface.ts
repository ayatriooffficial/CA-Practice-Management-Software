export interface IHomeSummaryCard {
  id: string;
  title: string;
  value: string;
  badge: string;
  bar: string;
}

export interface IHomeStripItem {
  top: number;
  bottom: number;
}

export interface IHomeStripMetrics {
  leads?: IHomeStripItem;
  clients?: IHomeStripItem;
  compliance?: IHomeStripItem;
  tasks?: IHomeStripItem;
  invoice?: IHomeStripItem;
}

export interface IHomeTaskOverview {
  dueStats?: {
    dueToday?: number;
    dueTomorrow?: number;
    dueIn7Days?: number;
    dueThisMonth?: number;
    overdue?: number;
    overdueUpTo7Days?: number;
    overdueMoreThan7Days?: number;
  };
  statusSummary?: {
    pending?: number;
    hold?: number;
    inProgress?: number;
    completed?: number;
    total?: number;
  };
}

export interface IHomeTodoMetrics {
  todayCount?: number;
  tomorrowCount?: number;
  upcomingCount?: number;
  overdueCount?: number;
  completedCount?: number;
  totalCount?: number;
}

export interface IHomeMetricsData {
  countLabels?: IHomeStripMetrics;
  stripMetrics?: IHomeStripMetrics;
  summaryCards?: IHomeSummaryCard[];
  taskOverview?: IHomeTaskOverview;
  todoMetrics?: IHomeTodoMetrics;
}

export interface IHomeMetricsSnapshot {
  accountKey: string;
  userId?: string;
  userEmail?: string;
  role?: string;
  orgId?: string;
  metrics: IHomeMetricsData;
  updatedAt?: Date;
}

