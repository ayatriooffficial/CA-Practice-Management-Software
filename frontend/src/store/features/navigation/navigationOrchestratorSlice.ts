import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type SectionLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface SectionMetadata {
  status: SectionLoadingStatus;
  loadedAt?: number;
  version: number;
  error?: string | null;
}

export interface NavigationOrchestratorState {
  currentSection: string;
  targetSection: string | null;
  isNavigating: boolean;
  progress: number;
  pendingTasks: string[];
  completedTasks: string[];
  sections: Record<string, SectionMetadata>;
  inPageViews: Record<string, {
    activeTab?: string;
    selectedId?: string | null;
    viewMode?: string;
    scrollY?: number;
  }>;
}

const DEFAULT_SECTIONS: string[] = [
  'home',
  'client',
  'task',
  'invoice',
  'leads',
  'groups',
  'services',
  'team',
  'compliance',
  'reports',
  'documents',
  'drive',
  'dsc',
  'email',
  'todo',
  'agents',
  'calendar',
];

const getInitialSectionMetadata = (): Record<string, SectionMetadata> => {
  const meta: Record<string, SectionMetadata> = {};
  DEFAULT_SECTIONS.forEach((key) => {
    meta[key] = {
      status: 'idle',
      version: 1,
      error: null,
    };
  });
  return meta;
};

const initialState: NavigationOrchestratorState = {
  currentSection: 'home',
  targetSection: null,
  isNavigating: false,
  progress: 0,
  pendingTasks: [],
  completedTasks: [],
  sections: getInitialSectionMetadata(),
  inPageViews: {},
};

export const navigationOrchestratorSlice = createSlice({
  name: 'navigationOrchestrator',
  initialState,
  reducers: {
    startNavigation: (
      state,
      action: PayloadAction<{ targetSection: string; tasks?: string[]; immediate?: boolean }>
    ) => {
      const { targetSection, tasks = [] } = action.payload;
      // Task 4: Duplicate click guard - clicking same target again while it is already loading must NOT duplicate
      if (state.isNavigating && state.targetSection === targetSection) {
        return;
      }
      // Task 4: If interrupting an existing navigation, revert previous target status to idle if it wasn't loaded
      if (state.isNavigating && state.targetSection && state.targetSection !== targetSection) {
        const prev = state.targetSection;
        if (state.sections[prev]?.status === 'loading') {
          state.sections[prev].status = 'idle';
        }
      }

      state.targetSection = targetSection;
      state.isNavigating = true;
      state.pendingTasks = tasks;
      state.completedTasks = [];
      state.progress = 15;
      if (state.sections[targetSection]) {
        if (state.sections[targetSection].status !== 'loaded') {
          state.sections[targetSection].status = 'loading';
        }
      } else {
        state.sections[targetSection] = {
          status: 'loading',
          version: 1,
          error: null,
        };
      }
    },

    cancelNavigation: (state) => {
      if (state.targetSection && state.sections[state.targetSection]?.status === 'loading') {
        state.sections[state.targetSection].status = 'idle';
      }
      state.targetSection = null;
      state.isNavigating = false;
      state.progress = 0;
      state.pendingTasks = [];
      state.completedTasks = [];
    },

    taskCompleted: (state, action: PayloadAction<{ taskName: string; section: string }>) => {
      const { taskName } = action.payload;
      if (!state.completedTasks.includes(taskName)) {
        state.completedTasks.push(taskName);
      }
      state.pendingTasks = state.pendingTasks.filter((t) => t !== taskName);

      const total = state.completedTasks.length + state.pendingTasks.length;
      if (total > 0) {
        const rawPercent = Math.round((state.completedTasks.length / total) * 100);
        state.progress = Math.min(95, Math.max(state.progress, rawPercent));
      }
    },

    finishNavigation: (state, action: PayloadAction<{ targetSection: string }>) => {
      const { targetSection } = action.payload;
      state.currentSection = targetSection;
      state.targetSection = null;
      state.isNavigating = false;
      state.progress = 100;
      state.pendingTasks = [];
      state.completedTasks = [];

      if (!state.sections[targetSection]) {
        state.sections[targetSection] = { status: 'loaded', version: 1, error: null };
      }
      state.sections[targetSection].status = 'loaded';
      state.sections[targetSection].loadedAt = Date.now();
      state.sections[targetSection].error = null;
    },

    failNavigation: (state, action: PayloadAction<{ targetSection: string; error: string }>) => {
      const { targetSection, error } = action.payload;
      state.isNavigating = false;
      state.progress = 100;
      state.pendingTasks = [];
      if (state.sections[targetSection]) {
        state.sections[targetSection].status = 'error';
        state.sections[targetSection].error = error;
      }
    },

    markSectionLoaded: (state, action: PayloadAction<{ section: string }>) => {
      const { section } = action.payload;
      if (!state.sections[section]) {
        state.sections[section] = { status: 'loaded', version: 1, error: null };
      }
      state.sections[section].status = 'loaded';
      state.sections[section].loadedAt = Date.now();
      state.sections[section].error = null;
    },

    invalidateSection: (state, action: PayloadAction<{ section: string }>) => {
      const { section } = action.payload;
      if (state.sections[section]) {
        state.sections[section].version += 1;
      }
    },

    saveInPageView: (
      state,
      action: PayloadAction<{
        section: string;
        activeTab?: string;
        selectedId?: string | null;
        viewMode?: string;
        scrollY?: number;
      }>
    ) => {
      const { section, ...rest } = action.payload;
      state.inPageViews[section] = {
        ...state.inPageViews[section],
        ...rest,
      };
    },

    resetAllSessionState: () => initialState,
  },
});

export const {
  startNavigation,
  cancelNavigation,
  taskCompleted,
  finishNavigation,
  failNavigation,
  markSectionLoaded,
  invalidateSection,
  saveInPageView,
  resetAllSessionState,
} = navigationOrchestratorSlice.actions;

export const selectNavigationState = (state: { navigation: NavigationOrchestratorState }) => state.navigation;
export const selectSectionMetadata = (section: string) => (state: { navigation: NavigationOrchestratorState }) =>
  state.navigation?.sections?.[section] || { status: 'idle', version: 1, error: null };
export const selectIsSectionLoaded = (section: string) => (state: { navigation: NavigationOrchestratorState }) =>
  state.navigation?.sections?.[section]?.status === 'loaded';
export const selectInPageView = (section: string) => (state: { navigation: NavigationOrchestratorState }) =>
  state.navigation?.inPageViews?.[section];

export default navigationOrchestratorSlice.reducer;
