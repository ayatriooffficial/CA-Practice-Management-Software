import mongoose from 'mongoose';
import { AppError } from '../../shared/utils/apiError';
import { Task } from '../task/task.model';
import { UserModel } from '../auth/user.model';
import { FinancialInvoice, TaskExpense, FinancialTimeEntry } from './financial.model';
import { IInvoiceAllocation } from './financial.interface';
import { aggregateEmployeeCosts, aggregatePeriodFacts, calculateProfitPaise, calculateTimeCostPaise } from './financial.calculation';
import { generateProfitabilityReportPdf, ProfitabilityPdfRow } from './pdf.generator';

export interface FinancialUserContext {
  userId: string;
  orgId: string;
  role?: string;
}

const toDate = (date: string) => new Date(`${date}T00:00:00.000Z`);
function parseFlexibleDate(str?: string | null): Date | null {
  if (!str) return null;
  const trimmed = str.trim();
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return new Date(Date.UTC(+y, +m - 1, +d));
  }
  const yyyymmdd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    return new Date(Date.UTC(+y, +m - 1, +d));
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
const isDuplicateKey = (error: unknown): boolean => Boolean(error && typeof error === 'object' && 'code' in error && error.code === 11000);

function invoiceSubmissionMatches(prior: InstanceType<typeof FinancialInvoice>, input: {
  kind: 'invoice' | 'credit_note'; state: 'draft' | 'issued'; number: string; issueDate?: string | null;
  originalInvoiceId?: string | null; allocations: IInvoiceAllocation[];
}): boolean {
  const allocationsMatch = JSON.stringify(prior.allocations.map((row) => [row.taskId, row.amountPaise])) ===
    JSON.stringify(input.allocations.map((row) => [row.taskId, row.amountPaise]));
  const issueDateMatches = (prior.issueDate?.toISOString().slice(0, 10) || null) === (input.state === 'issued' ? input.issueDate || null : null);
  return prior.number === input.number && prior.kind === input.kind && prior.state === input.state &&
    String(prior.originalInvoiceId || '') === String(input.originalInvoiceId || '') && issueDateMatches && allocationsMatch;
}

export class FinancialService {
  private static async assertTasks(taskIds: string[], orgId: string) {
    const tasks = await Task.find({
      taskId: { $in: taskIds },
      orgId,
      isDeleted: false,
    }).select('taskId clientId').lean();
    const found = new Set(tasks.map((task) => task.taskId));
    if (taskIds.some((taskId) => !found.has(taskId))) {
      throw AppError.badRequest('Every task allocation must reference a task in your organization');
    }
    return tasks;
  }

  private static async assertEmployee(employeeId: string, orgId: string): Promise<{
    _id: mongoose.Types.ObjectId;
    internalCostRatePaisePerHour?: number | null;
  }> {
    if (!mongoose.Types.ObjectId.isValid(employeeId)) throw AppError.badRequest('A valid employee is required');
    const employee = await UserModel.findOne({ _id: employeeId, orgId, status: 'active' })
      .select('_id +internalCostRatePaisePerHour')
      .lean();
    if (!employee) throw AppError.badRequest('Employee is not active in your organization');
    return employee;
  }

  static async setEmployeeCostRate(employeeId: string, ratePaise: number | null, ctx: FinancialUserContext) {
    if (!['admin', 'partner'].includes((ctx.role || '').toLowerCase())) {
      throw AppError.forbidden('Only an organization admin or partner can change internal cost rates');
    }
    if (!mongoose.Types.ObjectId.isValid(employeeId)) throw AppError.badRequest('Invalid employee identifier');
    const employee = await UserModel.findOneAndUpdate(
      { _id: employeeId, orgId: ctx.orgId },
      { $set: { internalCostRatePaisePerHour: ratePaise } },
      { new: true }
    ).select('_id name +internalCostRatePaisePerHour');
    if (!employee) throw AppError.notFound('Employee not found in your organization');
    return employee;
  }

  static async listEmployeeCostRates(ctx: FinancialUserContext) {
    if (!['admin', 'partner'].includes((ctx.role || '').toLowerCase())) {
      throw AppError.forbidden('Only an organization admin or partner can view internal cost rates');
    }
    return UserModel.find({ orgId: ctx.orgId, status: 'active' })
      .select('_id name +internalCostRatePaisePerHour')
      .lean();
  }

  static async createInvoice(input: {
    kind: 'invoice' | 'credit_note'; state: 'draft' | 'issued'; number: string;
    issueDate?: string | null; originalInvoiceId?: string | null; allocations: IInvoiceAllocation[];
    details: Record<string, unknown>; idempotencyKey: string;
  }, ctx: FinancialUserContext) {
    const prior = await FinancialInvoice.findOne({ orgId: ctx.orgId, idempotencyKey: input.idempotencyKey });
    if (prior) {
      if (!invoiceSubmissionMatches(prior, input)) {
        throw AppError.conflict('This invoice submission key was already used for different invoice data');
      }
      return prior;
    }
    const taskIds = input.allocations.map((allocation) => allocation.taskId);
    const invoiceTotalPaise = Math.round(Number(input.details.totalPayable) * 100);
    const allocatedTotalPaise = input.allocations.reduce((sum, allocation) => sum + allocation.amountPaise, 0);
    if (!Number.isSafeInteger(invoiceTotalPaise) || !Number.isSafeInteger(allocatedTotalPaise) || invoiceTotalPaise <= 0 || allocatedTotalPaise !== invoiceTotalPaise) {
      throw AppError.badRequest('Task allocations must exactly equal the invoice total');
    }
    const allocatedTasks = await this.assertTasks(taskIds, ctx.orgId);
    const invoiceClientId = typeof input.details.clientId === 'string' ? input.details.clientId : '';
    // Only reject if both task has a specific clientId and invoice has one, and they conflict
    if (
      invoiceClientId &&
      invoiceClientId !== 'client-prefilled' &&
      allocatedTasks.some((task) => task.clientId && task.clientId !== invoiceClientId)
    ) {
      throw AppError.badRequest('All invoice task allocations must belong to the selected invoice client');
    }
    if (input.kind === 'credit_note' && input.state !== 'issued') {
      throw AppError.badRequest('Credit notes must be issued or finalized when recorded');
    }
    if (input.state === 'issued' && !input.issueDate) throw AppError.badRequest('An issue date is required for a finalized invoice');
    if (input.kind === 'credit_note') {
      if (!input.originalInvoiceId || !mongoose.Types.ObjectId.isValid(input.originalInvoiceId)) {
        throw AppError.badRequest('A credit note must reference its original invoice');
      }
      const session = await mongoose.startSession();
      try {
        let created: InstanceType<typeof FinancialInvoice> | undefined;
        await session.withTransaction(async () => {
          const original = await FinancialInvoice.findOne({
            _id: input.originalInvoiceId, orgId: ctx.orgId, kind: 'invoice', state: 'issued',
          }).session(session);
          if (!original) throw AppError.badRequest('The original issued invoice was not found in your organization');
          for (const allocation of input.allocations) {
            const originalAllocation = original.allocations.find((row) => row.taskId === allocation.taskId);
            const originalAmount = originalAllocation?.amountPaise || 0;
            const alreadyCredited = originalAllocation?.creditedPaise || 0;
            if (!originalAllocation || allocation.amountPaise > originalAmount - alreadyCredited) {
              throw AppError.badRequest('Credit note allocations cannot exceed the uncredited original task allocation');
            }
            originalAllocation.creditedPaise = alreadyCredited + allocation.amountPaise;
          }
          await original.save({ session });
          [created] = await FinancialInvoice.create([{
            orgId: ctx.orgId,
            kind: input.kind,
            state: 'issued',
            number: input.number,
            issueDate: toDate(input.issueDate!),
            originalInvoiceId: input.originalInvoiceId,
            allocations: input.allocations,
            details: input.details,
            idempotencyKey: input.idempotencyKey,
            createdBy: ctx.userId,
          }], { session });
        });
        if (!created) throw AppError.internal('Credit note transaction did not complete');
        return created;
      } catch (error) {
        if (isDuplicateKey(error)) {
          const duplicate = await FinancialInvoice.findOne({ orgId: ctx.orgId, idempotencyKey: input.idempotencyKey });
          if (duplicate) {
            if (invoiceSubmissionMatches(duplicate, input)) return duplicate;
            throw AppError.conflict('This credit note submission key was already used for different data');
          }
        }
        throw error;
      } finally {
        await session.endSession();
      }
    }
    try {
      return await FinancialInvoice.create({
        orgId: ctx.orgId,
        kind: input.kind,
        state: input.state,
        number: input.number,
        issueDate: input.state === 'issued' ? toDate(input.issueDate!) : null,
        originalInvoiceId: input.originalInvoiceId || null,
        allocations: input.allocations,
        details: input.details,
        idempotencyKey: input.idempotencyKey,
        createdBy: ctx.userId,
      });
    } catch (error) {
      if (isDuplicateKey(error)) {
        const duplicate = await FinancialInvoice.findOne({ orgId: ctx.orgId, idempotencyKey: input.idempotencyKey });
        if (duplicate && invoiceSubmissionMatches(duplicate, input)) return duplicate;
        if (duplicate) throw AppError.conflict('This invoice submission key was already used for different invoice data');
        throw AppError.conflict('An invoice with this number already exists in your organization');
      }
      throw error;
    }
  }

  static async listInvoices(ctx: FinancialUserContext) {
    return FinancialInvoice.find({ orgId: ctx.orgId }).sort({ createdAt: -1 }).lean();
  }

  static async voidInvoice(id: string, reason: string, ctx: FinancialUserContext) {
    if (!['admin', 'partner'].includes((ctx.role || '').toLowerCase())) {
      throw AppError.forbidden('Only an organization admin or partner can void an issued invoice');
    }
    if (!mongoose.Types.ObjectId.isValid(id)) throw AppError.badRequest('Invalid invoice identifier');
    const invoice = await FinancialInvoice.findOne({ _id: id, orgId: ctx.orgId, kind: 'invoice', state: 'issued' });
    if (!invoice) throw AppError.notFound('Issued invoice not found in your organization');
    const hasCredits = await FinancialInvoice.exists({ orgId: ctx.orgId, originalInvoiceId: invoice._id, kind: 'credit_note', state: 'issued' });
    if (hasCredits) throw AppError.conflict('An invoice with issued credit notes cannot be voided; issue a correcting credit note instead');
    invoice.state = 'void';
    invoice.details = { ...invoice.details, voidReason: reason, voidedAt: new Date().toISOString() };
    await invoice.save();
    return invoice;
  }

  static async createTimeEntry(input: {
    taskId: string; workDate: string; durationSeconds: number; idempotencyKey: string;
  }, ctx: FinancialUserContext) {
    const prior = await FinancialTimeEntry.findOne({ orgId: ctx.orgId, idempotencyKey: input.idempotencyKey });
    if (prior) {
      if (prior.taskId !== input.taskId || String(prior.employeeId) !== ctx.userId || prior.durationSeconds !== input.durationSeconds || prior.workDate.toISOString().slice(0, 10) !== input.workDate) {
        throw AppError.conflict('This timer submission was already recorded with different time data');
      }
      return prior;
    }
    await this.assertTasks([input.taskId], ctx.orgId);
    const employee = await this.assertEmployee(ctx.userId, ctx.orgId);
    if (employee.internalCostRatePaisePerHour == null) {
      throw AppError.badRequest('Set this employee’s internal cost rate before recording task time');
    }
    const costPaise = calculateTimeCostPaise(input.durationSeconds, employee.internalCostRatePaisePerHour);
    if (!Number.isSafeInteger(costPaise)) throw AppError.badRequest('The recorded labor cost exceeds supported monetary precision');
    try {
      return await FinancialTimeEntry.create({
        orgId: ctx.orgId,
        taskId: input.taskId,
        employeeId: employee._id,
        workDate: toDate(input.workDate),
        durationSeconds: input.durationSeconds,
        internalCostRatePaisePerHour: employee.internalCostRatePaisePerHour,
        costPaise,
        idempotencyKey: input.idempotencyKey,
        createdBy: ctx.userId,
      });
    } catch (error) {
      if (isDuplicateKey(error)) {
        const duplicate = await FinancialTimeEntry.findOne({ orgId: ctx.orgId, idempotencyKey: input.idempotencyKey });
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }

  static async listTimeEntries(taskId: string, ctx: FinancialUserContext) {
    await this.assertTasks([taskId], ctx.orgId);
    return FinancialTimeEntry.find({ orgId: ctx.orgId, taskId }).sort({ workDate: -1 }).lean();
  }

  static async createExpense(input: {
    taskId: string; particulars: string; incurredDate: string; amountPaise: number; idempotencyKey: string;
  }, ctx: FinancialUserContext) {
    const prior = await TaskExpense.findOne({ orgId: ctx.orgId, idempotencyKey: input.idempotencyKey });
    if (prior) {
      if (prior.taskId !== input.taskId || String(prior.employeeId) !== ctx.userId || prior.particulars !== input.particulars || prior.amountPaise !== input.amountPaise || prior.incurredDate.toISOString().slice(0, 10) !== input.incurredDate) {
        throw AppError.conflict('This expense submission key was already used for different data');
      }
      return prior;
    }
    await this.assertTasks([input.taskId], ctx.orgId);
    const employee = await this.assertEmployee(ctx.userId, ctx.orgId);
    try {
      return await TaskExpense.create({
        orgId: ctx.orgId,
        taskId: input.taskId,
        employeeId: employee._id,
        particulars: input.particulars,
        incurredDate: toDate(input.incurredDate),
        amountPaise: input.amountPaise,
        state: 'pending',
        idempotencyKey: input.idempotencyKey,
        createdBy: ctx.userId,
      });
    } catch (error) {
      if (isDuplicateKey(error)) {
        const duplicate = await TaskExpense.findOne({ orgId: ctx.orgId, idempotencyKey: input.idempotencyKey });
        if (duplicate) return duplicate;
      }
      throw error;
    }
  }

  static async listExpenses(ctx: FinancialUserContext) {
    const filter: Record<string, unknown> = { orgId: ctx.orgId };
    if (!['admin', 'partner', 'manager'].includes((ctx.role || '').toLowerCase())) filter.employeeId = ctx.userId;
    return TaskExpense.find(filter).populate('employeeId', 'name').sort({ incurredDate: -1 }).lean();
  }

  static async setExpenseState(id: string, state: 'approved' | 'rejected' | 'cancelled', ctx: FinancialUserContext) {
    if (!['admin', 'partner', 'manager'].includes((ctx.role || '').toLowerCase())) {
      throw AppError.forbidden('Only an organization manager can review expenses');
    }
    if (!mongoose.Types.ObjectId.isValid(id)) throw AppError.badRequest('Invalid expense identifier');
    const expense = await TaskExpense.findOneAndUpdate(
      { _id: id, orgId: ctx.orgId }, { $set: { state } }, { new: true }
    );
    if (!expense) throw AppError.notFound('Expense not found in your organization');
    return expense;
  }

  static async getProfitabilityReport(
    from: string,
    to: string,
    ctx: FinancialUserContext,
    filters?: { clientId?: string; view?: 'list' | 'client' | 'employee'; search?: string }
  ) {
    const start = toDate(from);
    const end = new Date(toDate(to).getTime() + 86_400_000);
    const [invoices, timeEntries, expenses] = await Promise.all([
      FinancialInvoice.find({ orgId: ctx.orgId, state: 'issued', issueDate: { $gte: start, $lt: end } })
        .select('kind allocations issueDate').lean(),
      FinancialTimeEntry.find({ orgId: ctx.orgId, workDate: { $gte: start, $lt: end } })
        .select('taskId employeeId workDate costPaise').populate('employeeId', 'name').lean(),
      TaskExpense.find({ orgId: ctx.orgId, state: 'approved', incurredDate: { $gte: start, $lt: end } })
        .select('taskId incurredDate amountPaise').lean(),
    ]);

    interface Facts {
      revenuePaise: number; revenueRecords: number; laborPaise: number; timeRecords: number;
      expensePaise: number; expenseRecords: number; lastDate: Date | null;
    }
    const periodFacts = aggregatePeriodFacts(
      invoices.map((invoice) => ({
        id: String(invoice._id), kind: invoice.kind, state: invoice.state, issueDate: invoice.issueDate,
        allocations: invoice.allocations.map((allocation) => ({ taskId: allocation.taskId, amountPaise: allocation.amountPaise })),
      })),
      timeEntries.map((entry) => ({ id: String(entry._id), taskId: entry.taskId, workDate: entry.workDate, costPaise: entry.costPaise })),
      expenses.map((expense) => ({ id: String(expense._id), taskId: expense.taskId, state: expense.state, incurredDate: expense.incurredDate, amountPaise: expense.amountPaise })),
      from,
      to
    );
    const facts = new Map<string, Facts>([...periodFacts].map(([taskId, entry]) => [taskId, {
      ...entry, lastDate: null,
    }]));
    const employeeAggregation = aggregateEmployeeCosts(timeEntries.map((entry) => {
      const employee = entry.employeeId as unknown as { _id?: mongoose.Types.ObjectId; name?: string } | null;
      return {
        id: String(entry._id), taskId: entry.taskId, employeeId: String(employee?._id || entry.employeeId),
        employeeName: employee?.name || 'Former employee', costPaise: entry.costPaise,
      };
    }));
    const markDate = (entry: Facts, date: Date) => {
      if (!entry.lastDate || date > entry.lastDate) entry.lastDate = date;
    };
    invoices.forEach((invoice) => invoice.allocations.forEach((allocation) => {
      const entry = facts.get(allocation.taskId);
      if (entry && invoice.issueDate) markDate(entry, invoice.issueDate);
    }));
    const seenTimeEntries = new Set<string>();
    timeEntries.forEach((timeEntry) => {
      if (seenTimeEntries.has(String(timeEntry._id))) return;
      seenTimeEntries.add(String(timeEntry._id));
      const entry = facts.get(timeEntry.taskId);
      if (!entry) return;
      markDate(entry, timeEntry.workDate);
    });
    expenses.forEach((expense) => {
      const entry = facts.get(expense.taskId);
      if (entry) markDate(entry, expense.incurredDate);
    });

    const orgFilter = mongoose.Types.ObjectId.isValid(ctx.orgId)
      ? { $or: [{ orgId: ctx.orgId }, { orgId: new mongoose.Types.ObjectId(ctx.orgId) }] }
      : { orgId: ctx.orgId };

    const orgTasks = await Task.find({
      ...orgFilter,
      isDeleted: false,
    }).select('taskId clientId clientName serviceName assigneeName billingType startDate targetDueDate endDate createdAt').lean();

    // Match tasks relevant to this reporting period:
    // 1. Has financial transactions in period
    // 2. OR startDate / targetDueDate / createdAt falls in [start, end)
    const transactionTaskIds = new Set(facts.keys());
    const matchedTasks = orgTasks.filter((task) => {
      if (transactionTaskIds.has(task.taskId)) return true;
      const sDate = parseFlexibleDate(task.startDate);
      if (sDate && sDate >= start && sDate < end) return true;
      const dDate = parseFlexibleDate(task.targetDueDate);
      if (dDate && dDate >= start && dDate < end) return true;
      if (task.createdAt && task.createdAt >= start && task.createdAt < end) return true;
      return false;
    });

    const activeTasks = matchedTasks.length > 0
      ? matchedTasks
      : orgTasks.filter((t) => transactionTaskIds.has(t.taskId));

    if (!activeTasks.length && !transactionTaskIds.size) {
      return { rows: [], financialDataAvailable: true, historicalDataIncomplete: true, employeeRows: [] };
    }

    let rows = activeTasks.map((task) => {
      const entry = facts.get(task.taskId);
      const revenue = entry && entry.revenueRecords > 0
        ? entry.revenuePaise / 100
        : task.billingType === 'Non Billable' ? 0 : (entry ? 0 : 0);
      const manpowerCost = entry && entry.timeRecords > 0 ? entry.laborPaise / 100 : 0;
      const expense = entry && entry.expenseRecords > 0 ? entry.expensePaise / 100 : 0;
      const profitPaise = calculateProfitPaise(
        revenue === null ? null : Math.round(revenue * 100),
        entry && entry.timeRecords > 0 ? entry.laborPaise : 0,
        entry && entry.expenseRecords > 0 ? entry.expensePaise : 0
      );
      const sDate = parseFlexibleDate(task.startDate);
      const fallbackDate = entry?.lastDate?.toISOString() || (sDate ? sDate.toISOString() : task.createdAt?.toISOString() || '');

      return {
        taskId: task.taskId,
        clientId: task.clientId || '',
        clientName: task.clientName || 'Unknown client',
        serviceName: task.serviceName || 'Unknown service',
        assigneeName: task.assigneeName || 'Unassigned',
        reportDate: fallbackDate,
        revenue,
        manpowerCost,
        expense,
        profit: profitPaise === null ? 0 : profitPaise / 100,
        completeness: { revenue: true, manpowerCost: true, expense: true },
        employeeCosts: entry ? [...(employeeAggregation.byTask.get(task.taskId) || new Map()).entries()].map(([employeeId, employee]) => ({
          employeeId, employeeName: employee.employeeName, manpowerCost: employee.costPaise / 100, taskCount: 1,
        })) : [],
      };
    });

    if (filters?.clientId) {
      const cId = filters.clientId.trim().toLowerCase();
      rows = rows.filter((r) => r.clientId.toLowerCase() === cId || r.clientName.toLowerCase().includes(cId));
    }

    if (filters?.search) {
      const term = filters.search.trim().toLowerCase();
      rows = rows.filter((r) =>
        r.clientName.toLowerCase().includes(term) ||
        r.taskId.toLowerCase().includes(term) ||
        r.serviceName.toLowerCase().includes(term) ||
        r.assigneeName.toLowerCase().includes(term)
      );
    }

    rows.sort((a, b) => b.reportDate.localeCompare(a.reportDate) || a.taskId.localeCompare(b.taskId));

    const employeeRows = employeeAggregation.employees.map((employee) => ({
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      taskCount: employee.taskCount,
      manpowerCost: employee.manpowerCostPaise / 100,
    }));

    return {
      rows,
      employeeRows,
      financialDataAvailable: true,
      historicalDataIncomplete: false,
    };
  }

  static async getProfitabilityReportPdf(
    from: string,
    to: string,
    ctx: FinancialUserContext,
    options?: { clientId?: string; view?: 'list' | 'client' | 'employee'; search?: string }
  ): Promise<Buffer> {
    const report = await this.getProfitabilityReport(from, to, ctx, options);
    const rows = report.rows;

    const pdfRows: ProfitabilityPdfRow[] = rows.map((r) => ({
      clientName: r.clientName,
      taskId: r.taskId,
      serviceName: r.serviceName,
      revenue: r.revenue ?? 0,
      manpowerCost: r.manpowerCost ?? 0,
      expense: r.expense ?? 0,
      profit: r.profit ?? 0,
    }));

    const clientFilterLabel = options?.clientId
      ? (rows.find((r) => r.clientId === options.clientId || r.clientName.toLowerCase().includes(options.clientId!.toLowerCase()))?.clientName || options.clientId)
      : undefined;

    return generateProfitabilityReportPdf({
      organizationName: 'Ayatrio Practice Management',
      reportTitle: clientFilterLabel ? `Client Profitability Report — ${clientFilterLabel}` : 'Profitability Report',
      dateRange: { from, to },
      clientFilter: clientFilterLabel,
      view: options?.view || 'list',
      rows: pdfRows,
    });
  }
}
