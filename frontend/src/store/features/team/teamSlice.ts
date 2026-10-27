import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TeamMember } from '@/data/teamData';

export interface TeamState {
  members: TeamMember[];
  selectedMember: TeamMember | null;
  loading: boolean;
  mutating: boolean;
  error: string | null;
}

const initialState: TeamState = {
  members: [],
  selectedMember: null,
  loading: false,
  mutating: false,
  error: null,
};

export const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    fetchTeamRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchTeamSuccess: (state, action: PayloadAction<TeamMember[]>) => {
      state.loading = false;
      state.members = action.payload;
    },
    fetchTeamFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },

    addTeamMemberRequest: (
      state,
      _action: PayloadAction<{ data: Partial<TeamMember>; onSuccess?: (member: TeamMember) => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    addTeamMemberSuccess: (state, action: PayloadAction<TeamMember>) => {
      state.mutating = false;
      state.members.push(action.payload);
    },
    addTeamMemberFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    updateTeamMemberRequest: (
      state,
      _action: PayloadAction<{
        id: string;
        data: Partial<TeamMember>;
        onSuccess?: (member: TeamMember) => void;
      }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    updateTeamMemberSuccess: (state, action: PayloadAction<TeamMember>) => {
      state.mutating = false;
      const index = state.members.findIndex((m) => m.id === action.payload.id);
      if (index >= 0) {
        state.members[index] = action.payload;
      }
    },
    updateTeamMemberFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    deleteTeamMemberRequest: (
      state,
      _action: PayloadAction<{ id: string; onSuccess?: () => void }>
    ) => {
      state.mutating = true;
      state.error = null;
    },
    deleteTeamMemberSuccess: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.members = state.members.filter((m) => m.id !== action.payload);
    },
    deleteTeamMemberFailure: (state, action: PayloadAction<string>) => {
      state.mutating = false;
      state.error = action.payload;
    },

    setSelectedMember: (state, action: PayloadAction<TeamMember | null>) => {
      state.selectedMember = action.payload;
    },
    clearTeamError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchTeamRequest,
  fetchTeamSuccess,
  fetchTeamFailure,
  addTeamMemberRequest,
  addTeamMemberSuccess,
  addTeamMemberFailure,
  updateTeamMemberRequest,
  updateTeamMemberSuccess,
  updateTeamMemberFailure,
  deleteTeamMemberRequest,
  deleteTeamMemberSuccess,
  deleteTeamMemberFailure,
  setSelectedMember,
  clearTeamError,
} = teamSlice.actions;

export default teamSlice.reducer;
