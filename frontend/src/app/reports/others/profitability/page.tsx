import type { Metadata } from 'next';
import ProfitabilityReport from '@/components/reports/ProfitabilityReport';

export const metadata: Metadata = {
  title: 'Profitability Report | CA Practice',
  description: 'Task-level profitability report by client and employee.',
};

export default function OthersProfitabilityReportPage() {
  return <ProfitabilityReport />;
}
