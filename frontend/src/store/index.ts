import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { rootReducer, RootState } from './rootReducer';
import { rootSaga } from './rootSaga';

export const makeStore = () => {
  const sagaMiddleware = createSagaMiddleware();

  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: false,
        serializableCheck: {
          // Ignore action payloads that include callbacks (e.g. onSuccess)
          ignoredActionPaths: ['payload.onSuccess'],
        },
      }).concat(sagaMiddleware),
    devTools:
      process.env.NODE_ENV !== 'production'
        ? {
            name: 'Ayatrio Practice Management',
            trace: true,
            traceLimit: 25,
          }
        : false,
  });

  sagaMiddleware.run(rootSaga);

  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    (window as any).__REDUX_STORE__ = store;
  }

  return store;
};

// Single client-side store instance ensuring React and Redux DevTools extension share the exact same store
let clientStoreInstance: ReturnType<typeof makeStore> | null = null;

export const getStore = () => {
  if (typeof window === 'undefined') {
    return makeStore();
  }
  if (!clientStoreInstance) {
    clientStoreInstance = makeStore();
  }
  return clientStoreInstance;
};

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
export type { RootState };
