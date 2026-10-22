import Link from 'next/link';
import { ArrowRight, BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="min-h-[calc(100vh-var(--header-height))] p-4 md:p-6 lg:p-8" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      <div className="mb-6"><p className="text-xs" style={{ color: 'var(--text-subtle)' }}>Reports</p><h1 className="mt-1 text-2xl font-semibold">Reports</h1></div>
      <section aria-labelledby="reports-others-heading" className="max-w-3xl">
        <h2 id="reports-others-heading" className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Others</h2>
        <Link href="/reports/profitability" className="group flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-surface)' }}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ color: 'var(--primary)', backgroundColor: 'var(--primary-light)' }}><BarChart3 className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Profitability Report</span><span className="mt-1 block text-xs" style={{ color: 'var(--text-subtle)' }}>Review task activity by client and employee.</span></span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-subtle)' }} />
        </Link>
      </section>
    </div>
  );
}
