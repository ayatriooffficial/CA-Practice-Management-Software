"use client";

import React, { useRef } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { getStore, getPersistor, AppStore } from './index';
import { useAppDispatch, useAppSelector } from './hooks';
import { hideToast } from './features/ui/uiSlice';
import { ToastNotification } from '@/components/ui/ToastNotification';

function GlobalToast() {
  const dispatch = useAppDispatch();
  const toast = useAppSelector((state) => state.ui.toast);

  return (
    <ToastNotification
      message={toast?.message ?? null}
      type={toast?.type === 'warning' ? 'info' : toast?.type}
      onClose={() => dispatch(hideToast())}
    />
  );
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  const persistorRef = useRef<ReturnType<typeof getPersistor> | null>(null);

  if (!storeRef.current) {
    storeRef.current = getStore();
    persistorRef.current = getPersistor();
  }

  return (
    <Provider store={storeRef.current}>
      <PersistGate loading={null} persistor={persistorRef.current!}>
        {children}
        <GlobalToast />
      </PersistGate>
    </Provider>
  );
}
