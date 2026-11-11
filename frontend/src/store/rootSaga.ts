import { all, fork } from 'redux-saga/effects';
import { authSaga } from './features/auth/authSaga';
import { dashboardSaga } from './features/dashboard/dashboardSaga';
import { groupSaga } from './features/groups/groupSaga';
import { clientSaga } from './features/clients/clientSaga';
import { invoiceSaga } from './features/invoices/invoiceSaga';
import { leadSaga } from './features/leads/leadSaga';
import { serviceSaga } from './features/services/serviceSaga';
import { taskSaga } from './features/tasks/taskSaga';
import { teamSaga } from './features/team/teamSaga';
import { workdoneSaga } from './features/workdone/workdoneSaga';
import { noticeSaga } from './features/notices/noticeSaga';
import { complianceSaga } from './features/compliance/complianceSaga';
import { agentCenterSaga } from './features/agentCenter/agentCenterSaga';
import { todoSaga } from './features/todo/todoSaga';
import { emailSaga } from './features/email/emailSaga';
import { navigationOrchestratorSaga } from './features/navigation/navigationOrchestratorSaga';

export function* rootSaga() {
  yield all([
    fork(authSaga),
    fork(dashboardSaga),
    fork(groupSaga),
    fork(clientSaga),
    fork(invoiceSaga),
    fork(leadSaga),
    fork(serviceSaga),
    fork(taskSaga),
    fork(teamSaga),
    fork(workdoneSaga),
    fork(noticeSaga),
    fork(complianceSaga),
    fork(agentCenterSaga),
    fork(todoSaga),
    fork(emailSaga),
    fork(navigationOrchestratorSaga),
  ]);
}
