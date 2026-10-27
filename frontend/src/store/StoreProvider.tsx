"use client";

import React, { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from './index';
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
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <Provider store={storeRef.current}>
      {children}
      <GlobalToast />
    </Provider>
  );
}
