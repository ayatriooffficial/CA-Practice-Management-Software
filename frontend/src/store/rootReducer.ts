import { combineReducers } from '@reduxjs/toolkit';
import { authSlice } from './features/auth/authSlice';
import { dashboardSlice } from './features/dashboard/dashboardSlice';
import clientReducer from './features/clients/clientSlice';
import invoiceReducer from './features/invoices/invoiceSlice';
import leadReducer from './features/leads/leadSlice';
import serviceReducer from './features/services/serviceSlice';
import taskReducer from './features/tasks/taskSlice';
import teamReducer from './features/team/teamSlice';
import uiReducer from './features/ui/uiSlice';
import workdoneReducer from './features/workdone/workdoneSlice';
import groupReducer from './features/groups/groupSlice';
import noticeReducer from './features/notices/noticeSlice';
import complianceReducer from './features/compliance/complianceSlice';
import agentCenterReducer from './features/agentCenter/agentCenterSlice';
import todoReducer from './features/todo/todoSlice';
import emailReducer from './features/email/emailSlice';

export const rootReducer = combineReducers({
  auth: authSlice.reducer,
  dashboard: dashboardSlice.reducer,
  groups: groupReducer,
  clients: clientReducer,
  invoices: invoiceReducer,
  leads: leadReducer,
  services: serviceReducer,
  tasks: taskReducer,
  team: teamReducer,
  ui: uiReducer,
  workdone: workdoneReducer,
  notices: noticeReducer,
  compliance: complianceReducer,
  agentCenter: agentCenterReducer,
  todo: todoReducer,
  emails: emailReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
