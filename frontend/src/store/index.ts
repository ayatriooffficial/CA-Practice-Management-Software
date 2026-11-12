import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import createWebStorage from 'redux-persist/lib/storage/createWebStorage';
import { rootReducer, RootState } from './rootReducer';
import { rootSaga } from './rootSaga';

const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: any) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      return Promise.resolve();
    },
  };
};

const storage =
  typeof window !== 'undefined'
    ? createWebStorage('session')
    : createNoopStorage();

const persistConfig = {
  key: 'ayatrio_practice_session',
  storage,
  whitelist: ['auth', 'dashboard', 'navigation'], // Whitelist session-persistent slices
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const makeStore = () => {
  const sagaMiddleware = createSagaMiddleware();

  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: false,
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
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

let clientStoreInstance: ReturnType<typeof makeStore> | null = null;
let clientPersistorInstance: ReturnType<typeof persistStore> | null = null;

export const getStore = () => {
  if (typeof window === 'undefined') {
    return makeStore();
  }
  if (!clientStoreInstance) {
    clientStoreInstance = makeStore();
  }
  return clientStoreInstance;
};

export const getPersistor = () => {
  if (!clientPersistorInstance) {
    clientPersistorInstance = persistStore(getStore());
  }
  return clientPersistorInstance;
};

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
export type { RootState };
