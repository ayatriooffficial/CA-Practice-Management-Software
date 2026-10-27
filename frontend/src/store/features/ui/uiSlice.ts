import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ToastPayload {
  id?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export interface UIState {
  toast: ToastPayload | null;
  activeModal: string | null;
  modalData: unknown;
  sidebarOpen: boolean;
}

const initialState: UIState = {
  toast: null,
  activeModal: null,
  modalData: null,
  sidebarOpen: true,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showToast: (state, action: PayloadAction<ToastPayload | string>) => {
      if (typeof action.payload === 'string') {
        state.toast = {
          id: String(Date.now()),
          type: 'success',
          message: action.payload,
          duration: 3000,
        };
      } else {
        state.toast = {
          id: action.payload.id || String(Date.now()),
          type: action.payload.type || 'success',
          message: action.payload.message,
          duration: action.payload.duration || 3000,
        };
      }
    },
    hideToast: (state) => {
      state.toast = null;
    },
    openModal: (
      state,
      action: PayloadAction<{ modalName: string; data?: unknown }>
    ) => {
      state.activeModal = action.payload.modalName;
      state.modalData = action.payload.data ?? null;
    },
    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
  },
});

export const {
  showToast,
  hideToast,
  openModal,
  closeModal,
  toggleSidebar,
  setSidebarOpen,
} = uiSlice.actions;

export default uiSlice.reducer;
