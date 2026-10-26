import Link from 'next/link';
import {
  Users,
  CheckSquare,
  TrendingUp,
  KeyRound,
  Award,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ReportItem {
  id: string;
  name: string;
  description: string;
  href?: string;
  isAvailable?: boolean;
}

interface ReportCategory {
  id: string;
  name: string;
  icon: typeof Users;
  iconColor: string;
  iconBg: string;
  reports: ReportItem[];
}

const CATEGORIES: ReportCategory[] = [
  {
    id: 'team',
    name: 'Team',
    icon: Users,
    iconColor: '#3D6A9E',
    iconBg: '#EEF2FF',
    reports: [
      { id: 'attendance', name: 'Attendance', description: 'Staff daily clock-in/out, hours log, and leave records' },
      { id: 'timesheet', name: 'Timesheet', description: 'Recorded billable work hours, tasks logged, and timer entries' },
      { id: 'performance', name: 'Performance', description: 'Productivity velocity, task closure rates, and efficiency metrics' },
      { id: 'employee-stipend', name: 'Employee Stipend', description: 'Article assistant and trainee stipend disbursement registers' },
    ],
  },
  {
    id: 'tasks',
    name: 'Tasks',
    icon: CheckSquare,
    iconColor: '#0EA5E9',
    iconBg: '#E0F2FE',
    reports: [
      { id: 'client-tasks', name: 'Client', description: 'Active and archived task assignments segmented by client entity' },
      { id: 'user-tasks', name: 'User', description: 'Task distribution, workload allocation, and pending reviews by staff' },
      { id: 'services-tasks', name: 'Services', description: 'Statutory compliance filings, audits, and recurring service tasks' },
      { id: 'task-billing', name: 'Task Billing', description: 'Billable and non-billable task completion status and invoice readiness' },
      { id: 'task-report', name: 'Task Report', description: 'Consolidated task progression, priority flags, and TAT tracking' },
    ],
  },
  {
    id: 'sales',
    name: 'Sales',
    icon: TrendingUp,
    iconColor: '#10B981',
    iconBg: '#ECFDF5',
    reports: [
      { id: 'master-sales', name: 'Master Sales', description: 'Comprehensive practice revenue, tax invoices, and proformas' },
      { id: 'sales-by-client', name: 'Sales By Client', description: 'Cumulative fee billing and revenue contribution ranked by client' },
      { id: 'payment-received', name: 'Payment Received', description: 'Realized collections, payment modes, and bank reconciliations' },
      { id: 'receivable', name: 'Receivable', description: 'Aged outstanding balances, overdue fee reminders, and aging slabs' },
      { id: 'revenue-by-user', name: 'Revenue By User', description: 'Revenue generation and billing realizations attributed per partner/staff' },
      { id: 'proposal', name: 'Proposal', description: 'Engagement quotations, fee proposals, and prospect acceptance status' },
      { id: 'reimbursement', name: 'Reimbursement', description: 'Out-of-pocket expenses, client disbursements, and recharges' },
    ],
  },
  {
    id: 'dsc',
    name: 'DSC Register',
    icon: KeyRound,
    iconColor: '#F59E0B',
    iconBg: '#FEF3C7',
    reports: [
      { id: 'dsc-active', name: 'Active', description: 'Valid Digital Signature Certificates available for immediate filings' },
      { id: 'dsc-expired', name: 'Expired', description: 'Certificates expired or requiring urgent renewal for MCA/GST portals' },
      { id: 'dsc-location-office', name: 'Location - At Office', description: 'Physical tokens currently stored safely in firm premises' },
      { id: 'dsc-location-client', name: 'Location - With client', description: 'Tokens handed over or retained under client custody' },
    ],
  },
  {
    id: 'licenses',
    name: 'Licenses',
    icon: Award,
    iconColor: '#8B5CF6',
    iconBg: '#F3E8FF',
    reports: [
      { id: 'licenses-active', name: 'Active', description: 'Active professional software seats and statutory firm registrations' },
      { id: 'licenses-expired', name: 'Expired', description: 'Subscribed utilities, peer review, and compliance certs requiring renewal' },
    ],
  },
  {
    id: 'others',
    name: 'Others',
    icon: Layers,
    iconColor: '#6B7280',
    iconBg: '#F3F4F6',
    reports: [
      { id: 'adt1-report', name: 'ADT 1 Report', description: 'Auditor appointment notifications and filing tracking under Companies Act' },
      {
        id: 'profitability',
        name: 'Profitability Report',
        description: 'Revenue, manpower costs, expenses, and net profit per client and task',
        href: '/reports/others/profitability',
        isAvailable: true,
      },
      { id: 'sla-retainer-report', name: 'SLA Retainer Fee Report', description: 'Service level agreement compliance and monthly retainer realizations' },
    ],
  },
];

export default function ReportsDashboard() {
  return (
    <div
      className="min-h-[calc(100vh-var(--header-height))] p-4 md:p-6 lg:p-8"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
    >
      {/* Breadcrumb & Header */}
      <nav aria-label="Breadcrumb" className="mb-2 text-xs" style={{ color: 'var(--text-subtle)' }}>
        <span aria-current="page" className="font-medium">Reports</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Standard practice reports, operational audits, and financial summaries
        </p>
      </div>

      {/* Categories 2x3 / 3x2 Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((category) => {
          const CategoryIcon = category.icon;
          return (
            <div
              key={category.id}
              className="flex flex-col rounded-xl border transition-shadow hover:shadow-sm"
              style={{
                borderColor: 'var(--border-main)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              {/* Category Card Header */}
              <div
                className="flex items-center gap-3 border-b px-5 py-4"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: category.iconBg, color: category.iconColor }}
                >
                  <CategoryIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold leading-tight">{category.name}</h2>
                  <p className="text-xs" style={{ color: 'var(--text-subtle)' }}>
                    {category.reports.length} report{category.reports.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              {/* Reports List inside Card */}
              <div className="flex-1 divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {category.reports.map((report) => {
                  const isInteractive = Boolean(report.href);
                  const content = (
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium ${isInteractive ? 'text-[var(--text-main)] group-hover:text-[var(--primary)]' : 'text-[var(--text-main)]'
                              }`}
                          >
                            {report.name}
                          </span>
                          {report.isAvailable && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {report.description}
                        </p>
                      </div>
                      {isInteractive ? (
                        <ArrowRight
                          className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1"
                          style={{ color: 'var(--primary)' }}
                        />
                      ) : (
                        <span
                          className="shrink-0 text-[11px] font-medium"
                          style={{ color: 'var(--text-subtle)' }}
                        >
                          Standard
                        </span>
                      )}
                    </div>
                  );

                  return isInteractive ? (
                    <Link
                      key={report.id}
                      href={report.href!}
                      className="group block transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      key={report.id}
                      className="block opacity-85 transition-colors hover:bg-[var(--bg-hover)]"
                      title={`${report.name} — included in CA practice suite standard reporting`}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
