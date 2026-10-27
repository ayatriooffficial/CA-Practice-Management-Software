import { combineReducers } from '@reduxjs/toolkit';
import clientReducer from './features/clients/clientSlice';
import leadReducer from './features/leads/leadSlice';
import serviceReducer from './features/services/serviceSlice';
import taskReducer from './features/tasks/taskSlice';
import teamReducer from './features/team/teamSlice';
import uiReducer from './features/ui/uiSlice';

export const rootReducer = combineReducers({
  clients: clientReducer,
  leads: leadReducer,
  services: serviceReducer,
  tasks: taskReducer,
  team: teamReducer,
  ui: uiReducer,
});

export type RootState = ReturnType<typeof rootReducer>;
