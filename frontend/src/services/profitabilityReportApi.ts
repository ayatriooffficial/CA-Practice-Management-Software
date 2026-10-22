import { financialApi, FinancialReportResponse, FinancialReportTaskRow } from './financialApi';

export type ProfitabilityTaskRow = FinancialReportTaskRow;
export type ProfitabilityReportResponse = FinancialReportResponse;

export const profitabilityReportApi = {
  async getRows(from: string, to: string, signal?: AbortSignal): Promise<ProfitabilityReportResponse> {
    return financialApi.getReport(from, to, signal);
  },
};
