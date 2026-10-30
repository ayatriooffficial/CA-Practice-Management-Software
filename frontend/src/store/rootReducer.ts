import { combineReducers } from '@reduxjs/toolkit';
import clientReducer from './features/clients/clientSlice';
import invoiceReducer from './features/invoices/invoiceSlice';
import leadReducer from './features/leads/leadSlice';
import serviceReducer from './features/services/serviceSlice';
import taskReducer from './features/tasks/taskSlice';
import teamReducer from './features/team/teamSlice';
import uiReducer from './features/ui/uiSlice';
import workdoneReducer from './features/workdone/workdoneSlice';

export const rootReducer = combineReducers({
  clients: clientReducer,
  invoices: invoiceReducer,
  leads: leadReducer,
  services: serviceReducer,
  tasks: taskReducer,
  team: teamReducer,
  ui: uiReducer,
  workdone: workdoneReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
