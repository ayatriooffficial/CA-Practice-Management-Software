import { getStore } from '@/store';
import { markSectionLoaded } from '@/store/features/navigation/navigationOrchestratorSlice';
import { hydrateTasks } from '@/store/features/tasks/taskSlice';
import { hydrateClients } from '@/store/features/clients/clientSlice';
import { hydrateLeads } from '@/store/features/leads/leadSlice';
import { hydrateInvoices } from '@/store/features/invoices/invoiceSlice';
import { fetchComplianceSuccess } from '@/store/features/compliance/complianceSlice';
import { fetchGroupsSuccess } from '@/store/features/groups/groupSlice';
import { mapPersistedInvoice } from '@/store/features/invoices/invoiceSaga';
import { preloadHomeDashboardData } from './homePreloadService';
import { clientApi } from './clientApi';
import { taskApi } from './taskApi';
import { financialApi, FinancialInvoiceRecord } from './financialApi';
import { leadApi } from './leadApi';
import { complianceApi } from './complianceApi';
import { groupApi } from './groupApi';
import { serviceApi } from './serviceApi';
import { teamStore } from '@/components/team/teamStore';
import { pageStateCache, getCanonicalSection } from './pageStateCache';

/**
 * Preloads all data for an upcoming target section before the UI transitions.
 * Ensures the user stays on Page 1 while Page 2 loads in the background,
 * and only transitions once Page 2 is 100% full-fledged loaded with data.
 *
 * NOTE: Data is hydrated into Redux and pageStateCache. Data preloading does NOT
 * prematurely mark the section as "loaded" in the session lifecycle; the section
 * is officially marked loaded only when the route mounts in the UI.
 */
export async function preloadSectionData(
  sectionKey: string,
  signal?: AbortSignal,
  options?: { isHover?: boolean }
): Promise<void> {
  const canonical = getCanonicalSection(sectionKey);

  // If signal is already aborted, exit immediately
  if (signal?.aborted) return;

  // If section is already loaded in pageStateCache, skip network calls
  if (pageStateCache.isLoaded(canonical)) {
    return;
  }

  const store = typeof window !== 'undefined' ? getStore() : null;

  try {
    switch (canonical) {
      case 'home':
        await preloadHomeDashboardData(signal);
        break;

      case 'client': {
        const [clientsRes, statsRes] = await Promise.allSettled([
          clientApi.getClients({ page: 1, limit: 10 }),
          clientApi.getClientStats(),
        ]);

        const clients = clientsRes.status === 'fulfilled' && clientsRes.value?.data ? clientsRes.value.data : [];
        const pagination = clientsRes.status === 'fulfilled' ? clientsRes.value?.pagination : undefined;

        pageStateCache.set('clients_list_data', { clients, pagination });
        if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
          pageStateCache.set('clients_stats_data', statsRes.value.data);
        }

        if (store) {
          store.dispatch(hydrateClients({ clients, pagination }));
        }
        break;
      }

      case 'task': {
        const [tasksRes, statsRes, matrixCatRes, matrixAssignedRes] = await Promise.allSettled([
          taskApi.getTasks({ page: 1, limit: 10 }),
          taskApi.getTaskStats(),
          taskApi.getTaskSummaryMatrix('Category', ''),
          taskApi.getTaskSummaryMatrix('Assigned To', ''),
        ]);

        const tasks = tasksRes.status === 'fulfilled' && tasksRes.value?.data ? tasksRes.value.data : [];
        const pagination = tasksRes.status === 'fulfilled' ? tasksRes.value?.pagination : undefined;

        pageStateCache.set('tasks_list_data', { tasks, pagination });
        if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
          pageStateCache.set('tasks_stats_data', statsRes.value.data);
        }
        if (matrixCatRes.status === 'fulfilled' && matrixCatRes.value?.data) {
          pageStateCache.set('task_summary_matrix_Category_all', matrixCatRes.value.data);
        }
        if (matrixAssignedRes.status === 'fulfilled' && matrixAssignedRes.value?.data) {
          pageStateCache.set('task_summary_matrix_Assigned To_all', matrixAssignedRes.value.data);
        }

        if (store) {
          store.dispatch(hydrateTasks({ tasks, pagination }));
        }
        break;
      }

      case 'invoice': {
        const [records, receiptsData] = await Promise.all([
          financialApi.listInvoices().catch(() => [] as FinancialInvoiceRecord[]),
          financialApi.listReceipts().catch(() => [] as any[]),
        ]);

        const mapped = (records || []).map(mapPersistedInvoice);
        const invoices = mapped.filter((inv) => inv.type === 'invoice' || inv.type === 'credit_note');
        const proformas = mapped.filter((inv) => inv.type === 'proforma');
        const receipts = (receiptsData || []).map((r: any) => ({
          id: r._id || r.id,
          receiptNo: r.receiptNo,
          billingOrg: r.billingOrg || '',
          clientId: r.clientId || '',
          businessName: r.businessName || '',
          legalName: r.legalName || '',
          group: r.group || '',
          amount: Number(r.amount || 0),
          paymentDate: r.paymentDate ? new Date(r.paymentDate).toLocaleDateString('en-GB') : '',
          method: r.method || 'Bank Transfer',
          bankAccountId: r.bankAccountId || '',
          bankName: r.bankName || '',
          referenceNumber: r.referenceNumber || '',
          notes: r.notes || '',
          financialYear: r.financialYear || '',
          isAdvance: Boolean(r.isAdvance),
          invoiceId: r.invoiceId,
          invoiceNumber: r.invoiceNumber,
        }));

        pageStateCache.set('invoices_page_data', { invoices, proformas, receipts });

        if (store) {
          store.dispatch(hydrateInvoices({ invoices, proformas, receipts }));
        }
        break;
      }

      case 'leads': {
        const [leadsRes, statsRes] = await Promise.allSettled([
          leadApi.getLeads({ page: 1, limit: 10 }),
          leadApi.getLeadStats(),
        ]);

        const leads = leadsRes.status === 'fulfilled' && leadsRes.value?.data ? leadsRes.value.data : [];
        const pagination = leadsRes.status === 'fulfilled' ? leadsRes.value?.pagination : undefined;

        pageStateCache.set('leads_list_data', { leads, pagination });
        if (statsRes.status === 'fulfilled' && statsRes.value?.data) {
          pageStateCache.set('leads_stats_data', statsRes.value.data);
        }

        if (store) {
          store.dispatch(hydrateLeads({ leads, pagination }));
        }
        break;
      }

      case 'compliance': {
        const gridRes = await complianceApi.getGrid({}).catch(() => null);
        const gridData = {
          rows: gridRes?.data?.rows || [],
          columns: gridRes?.data?.columns || [],
          entries: gridRes?.data?.entries,
          clients: gridRes?.data?.clients,
        };

        pageStateCache.set('compliance_grid_data', gridData);

        if (store) {
          store.dispatch(fetchComplianceSuccess(gridData));
        }
        break;
      }

      case 'team': {
        await teamStore.loadEmployeesFromBackend().catch(() => []);
        break;
      }

      case 'groups': {
        const res = await groupApi.listGroups({}).catch(() => null);
        if (res?.data) {
          const items = res.data || [];
          const pagination = res.pagination || { page: 1, limit: 25, totalDocs: items.length, totalPages: 1 };
          pageStateCache.set('groups_list_data', items);
          if (store) {
            store.dispatch(fetchGroupsSuccess({ items, pagination }));
          }
        }
        break;
      }

      case 'services': {
        const res = await serviceApi.getServices({ page: 1, limit: 20 }).catch(() => null);
        if (res?.data) {
          pageStateCache.set('services_list_data', res.data);
        }
        break;
      }

      default:
        break;
    }

    if (signal?.aborted) {
      return;
    }
  } catch (err) {
    if (signal?.aborted) {
      return;
    }
    console.warn(`[SectionPreload] Preload warning for section "${canonical}":`, err);
  }
}

