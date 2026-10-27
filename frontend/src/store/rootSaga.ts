import { all, fork } from 'redux-saga/effects';
import { clientSaga } from './features/clients/clientSaga';
import { leadSaga } from './features/leads/leadSaga';
import { serviceSaga } from './features/services/serviceSaga';
import { taskSaga } from './features/tasks/taskSaga';
import { teamSaga } from './features/team/teamSaga';

export function* rootSaga() {
  yield all([
    fork(clientSaga),
    fork(leadSaga),
    fork(serviceSaga),
    fork(taskSaga),
    fork(teamSaga),
  ]);
}
