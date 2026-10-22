import { ExpenseState, InvoiceKind, InvoiceState } from './financial.interface';

export interface PeriodInvoice {
  id: string;
  kind: InvoiceKind;
  state: InvoiceState;
  issueDate: Date | null;
  allocations: Array<{ taskId: string; amountPaise: number }>;
}

export interface PeriodTimeEntry {
  id: string;
  taskId: string;
  workDate: Date;
  costPaise: number;
}

export interface PeriodExpense {
  id: string;
  taskId: string;
  state: ExpenseState;
  incurredDate: Date;
  amountPaise: number;
}

export interface PeriodTaskFacts {
  revenuePaise: number;
  revenueRecords: number;
  laborPaise: number;
  timeRecords: number;
  expensePaise: number;
  expenseRecords: number;
}

export interface EmployeeTimeCost {
  id: string;
  employeeId: string;
  employeeName: string;
  taskId: string;
  costPaise: number;
}

export function aggregateEmployeeCosts(entries: EmployeeTimeCost[]) {
  const byTask = new Map<string, Map<string, { employeeName: string; costPaise: number }>>();
  const employeeFacts = new Map<string, { employeeName: string; costPaise: number; taskIds: Set<string> }>();
  const seen = new Set<string>();
  entries.forEach((entry) => {
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    const taskEmployeeMap = byTask.get(entry.taskId) || new Map<string, { employeeName: string; costPaise: number }>();
    const taskEmployee = taskEmployeeMap.get(entry.employeeId) || { employeeName: entry.employeeName, costPaise: 0 };
    taskEmployee.costPaise += entry.costPaise;
    taskEmployeeMap.set(entry.employeeId, taskEmployee);
    byTask.set(entry.taskId, taskEmployeeMap);

    const employee = employeeFacts.get(entry.employeeId) || { employeeName: entry.employeeName, costPaise: 0, taskIds: new Set<string>() };
    employee.costPaise += entry.costPaise;
    employee.taskIds.add(entry.taskId);
    employeeFacts.set(entry.employeeId, employee);
  });
  const employees = [...employeeFacts.entries()].map(([employeeId, value]) => ({
    employeeId,
    employeeName: value.employeeName,
    taskCount: value.taskIds.size,
    manpowerCostPaise: value.costPaise,
  })).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  return { byTask, employees };
}

export function isDateInPeriod(value: Date | null, from: string, to: string): boolean {
  if (!value || Number.isNaN(value.getTime())) return false;
  const date = value.toISOString().slice(0, 10);
  return date >= from && date <= to;
}

export function calculateTimeCostPaise(durationSeconds: number, ratePaisePerHour: number): number {
  return Math.round((durationSeconds * ratePaisePerHour) / 3600);
}

export function calculateProfitPaise(revenuePaise: number | null, laborPaise: number | null, expensePaise: number | null): number | null {
  if (revenuePaise === null || laborPaise === null || expensePaise === null) return null;
  return revenuePaise - laborPaise - expensePaise;
}

export function aggregatePeriodFacts(
  invoices: PeriodInvoice[],
  timeEntries: PeriodTimeEntry[],
  expenses: PeriodExpense[],
  from: string,
  to: string
): Map<string, PeriodTaskFacts> {
  const facts = new Map<string, PeriodTaskFacts>();
  const get = (taskId: string) => {
    let row = facts.get(taskId);
    if (!row) {
      row = { revenuePaise: 0, revenueRecords: 0, laborPaise: 0, timeRecords: 0, expensePaise: 0, expenseRecords: 0 };
      facts.set(taskId, row);
    }
    return row;
  };
  const seenInvoices = new Set<string>();
  invoices.forEach((invoice) => {
    if (seenInvoices.has(invoice.id) || invoice.state !== 'issued' || !isDateInPeriod(invoice.issueDate, from, to)) return;
    seenInvoices.add(invoice.id);
    invoice.allocations.forEach((allocation) => {
      const row = get(allocation.taskId);
      row.revenuePaise += invoice.kind === 'credit_note' ? -allocation.amountPaise : allocation.amountPaise;
      row.revenueRecords += 1;
    });
  });
  const seenTimeEntries = new Set<string>();
  timeEntries.forEach((entry) => {
    if (seenTimeEntries.has(entry.id) || !isDateInPeriod(entry.workDate, from, to)) return;
    seenTimeEntries.add(entry.id);
    const row = get(entry.taskId);
    row.laborPaise += entry.costPaise;
    row.timeRecords += 1;
  });
  const seenExpenses = new Set<string>();
  expenses.forEach((expense) => {
    if (seenExpenses.has(expense.id) || expense.state !== 'approved' || !isDateInPeriod(expense.incurredDate, from, to)) return;
    seenExpenses.add(expense.id);
    const row = get(expense.taskId);
    row.expensePaise += expense.amountPaise;
    row.expenseRecords += 1;
  });
  return facts;
}
