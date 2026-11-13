import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectFilteredTodoTasks,
  selectTodoSidebarCounts,
  selectDateFilteredTasks,
} from './todoSelectors';
import todoReducer, {
  setActiveSection,
  setSelectedTag,
  setSearchQuery,
  setSelectedClientId,
  resetTodoFilters,
} from './todoSlice';
import { TeamTaskItem } from '@/services/todoApi';

function createMockTask(overrides: Partial<TeamTaskItem> = {}): TeamTaskItem {
  return {
    id: `task_${Math.random().toString(36).substring(2, 9)}`,
    taskId: 'TSK-001',
    taskName: 'Sample Task',
    clientName: 'Client Alpha',
    clientId: 'client_1',
    assigneeId: 'emp_1',
    assigneeName: 'Ayatrio Admin',
    priority: 'Medium',
    status: 'In Progress',
    targetDueDate: new Date().toISOString(),
    isOverdue: false,
    daysLeft: 5,
    progress: 0,
    checklistTotal: 0,
    checklistCompleted: 0,
    checklist: [],
    ...overrides,
  };
}

function createMockRootState(todoStateOverrides: any = {}, userOverrides: any = {}) {
  const defaultTodoState = todoReducer(undefined, { type: '@@INIT' });
  return {
    todo: {
      ...defaultTodoState,
      ...todoStateOverrides,
      filters: {
        ...defaultTodoState.filters,
        ...(todoStateOverrides.filters || {}),
      },
    },
    auth: {
      user: {
        id: 'emp_1',
        name: 'Ayatrio Admin',
        role: 'admin',
        ...userOverrides,
      },
      token: 'mock-token',
      isAuthenticated: true,
    },
  } as any;
}

test('Todo "All" Filter Suite', async (t) => {
  const sampleTasks: TeamTaskItem[] = [
    createMockTask({ id: 't1', taskName: 'GST Filing Task', category: 'GST', priority: 'Medium', status: 'Pending', clientId: 'client_1', assigneeName: 'Ayatrio Admin' }),
    createMockTask({ id: 't2', taskName: 'Urgent Audit Report', category: 'Audit', priority: 'Urgent', status: 'In Progress', clientId: 'client_2', assigneeName: 'Ayatrio Admin' }),
    createMockTask({ id: 't3', taskName: 'Completed Tax Audit', category: 'Income Tax', priority: 'High', status: 'Completed', clientId: 'client_1', assigneeName: 'Ayatrio Admin' }),
    createMockTask({ id: 't4', taskName: 'Cancelled ROC Form', category: 'ROC', priority: 'Low', status: 'Cancelled', clientId: 'client_3', assigneeName: 'Ayatrio Admin' }),
    createMockTask({ id: 't5', taskName: 'Recurring Compliance Master', category: 'Recurring Master', priority: 'Medium', status: 'Pending', clientId: 'client_2', assigneeName: 'Ayatrio Admin' }),
    createMockTask({ id: 't6', taskName: 'Team Member Task', category: 'General', priority: 'Medium', status: 'Pending', clientId: 'client_2', assigneeId: 'emp_2', assigneeName: 'Staff Member' }),
  ];

  await t.test('1. Default To-Do state displays all active applicable tasks under "All" (my-todo)', () => {
    const state = createMockRootState({
      unifiedTasks: sampleTasks,
      filters: {
        activeSection: 'my-todo',
        adminScope: 'all_work',
      },
    });

    const filtered = selectFilteredTodoTasks(state);
    const counts = selectTodoSidebarCounts(state);

    // Completed (t3) and Cancelled (t4) should be excluded from active All view
    assert.equal(filtered.some((x) => x.id === 't3'), false, 'Completed tasks must be excluded from All view');
    assert.equal(filtered.some((x) => x.id === 't4'), false, 'Cancelled tasks must be excluded from All view');

    // Active tasks (t1, t2, t5, t6) should be visible in all_work scope
    assert.equal(filtered.some((x) => x.id === 't1'), true);
    assert.equal(filtered.some((x) => x.id === 't2'), true);
    assert.equal(filtered.some((x) => x.id === 't5'), true);
    assert.equal(filtered.some((x) => x.id === 't6'), true);

    // Sidebar counts reflect accurate segmentation
    assert.equal(counts.myTodo, 4, 'All view count matches active non-completed tasks');
    assert.equal(counts.completed, 1);
    assert.equal(counts.deleted, 1);
  });

  await t.test('2. Switching from All to Important and then returning to All restores the full list', () => {
    let state = createMockRootState({
      unifiedTasks: sampleTasks,
      filters: {
        activeSection: 'my-todo',
        adminScope: 'all_work',
      },
    });

    // Initial All
    let filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 4);

    // Switch to Important
    state = {
      ...state,
      todo: {
        ...state.todo,
        filters: { ...state.todo.filters, activeSection: 'important' },
      },
    };
    filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 1, 'Only urgent/high non-completed tasks shown');
    assert.equal(filtered[0].id, 't2');

    // Switch back to All
    state = {
      ...state,
      todo: {
        ...state.todo,
        filters: { ...state.todo.filters, activeSection: 'my-todo' },
      },
    };
    filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 4, 'Full list restored when switching back to All');
    assert.equal(filtered.some((x) => x.id === 't1'), true);
    assert.equal(filtered.some((x) => x.id === 't2'), true);
  });

  await t.test('3. Switching from All to Finished and then returning to All restores the full list', () => {
    let state = createMockRootState({
      unifiedTasks: sampleTasks,
      filters: {
        activeSection: 'my-todo',
        adminScope: 'all_work',
      },
    });

    // Switch to Finished (completed)
    state = {
      ...state,
      todo: {
        ...state.todo,
        filters: { ...state.todo.filters, activeSection: 'completed' },
      },
    };
    let filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 1, 'Only completed tasks shown');
    assert.equal(filtered[0].id, 't3');

    // Switch back to All
    state = {
      ...state,
      todo: {
        ...state.todo,
        filters: { ...state.todo.filters, activeSection: 'my-todo' },
      },
    };
    filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 4, 'Full active list restored when returning to All');
  });

  await t.test('4. All button and Tag filters (All Tags / specific tags) operate independently', () => {
    let state = createMockRootState({
      unifiedTasks: sampleTasks,
      filters: {
        activeSection: 'my-todo',
        adminScope: 'all_work',
        selectedTag: 'GST',
      },
    });

    // Tag filter active on All view
    let filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 't1');

    // Switch view to Important with GST tag active
    state = {
      ...state,
      todo: {
        ...state.todo,
        filters: { ...state.todo.filters, activeSection: 'important' },
      },
    };
    filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 0, 'No GST tasks are urgent');

    // Return to All view with GST tag still active
    state = {
      ...state,
      todo: {
        ...state.todo,
        filters: { ...state.todo.filters, activeSection: 'my-todo' },
      },
    };
    filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 't1');

    // Click "All Tags" (selectedTag: null)
    state = {
      ...state,
      todo: {
        ...state.todo,
        filters: { ...state.todo.filters, selectedTag: null },
      },
    };
    filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 4, 'Clearing tag restores all tags on All view');
  });

  await t.test('5. Search query works in tandem with All button', () => {
    let state = createMockRootState({
      unifiedTasks: sampleTasks,
      filters: {
        activeSection: 'my-todo',
        adminScope: 'all_work',
        searchQuery: 'Audit',
      },
    });

    let filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 't2');

    // Clear search
    state = {
      ...state,
      todo: {
        ...state.todo,
        filters: { ...state.todo.filters, searchQuery: '' },
      },
    };
    filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 4);
  });

  await t.test('6. Client and Assignee filters work in tandem with All button', () => {
    let state = createMockRootState({
      unifiedTasks: sampleTasks,
      filters: {
        activeSection: 'my-todo',
        adminScope: 'all_work',
        selectedClientId: 'client_1',
      },
    });

    let filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 't1');

    // Return to All Clients
    state = {
      ...state,
      todo: {
        ...state.todo,
        filters: { ...state.todo.filters, selectedClientId: 'All' },
      },
    };
    filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 4);
  });

  await t.test('7. resetTodoFilters restores activeSection to "my-todo" and clears secondary filters', () => {
    let todoState = todoReducer(undefined, { type: '@@INIT' });
    todoState = todoReducer(todoState, setActiveSection('completed'));
    todoState = todoReducer(todoState, setSelectedTag('GST'));
    todoState = todoReducer(todoState, setSearchQuery('test'));
    todoState = todoReducer(todoState, setSelectedClientId('client_99'));

    assert.equal(todoState.filters.activeSection, 'completed');
    assert.equal(todoState.filters.selectedTag, 'GST');

    // Dispatch reset
    todoState = todoReducer(todoState, resetTodoFilters());

    assert.equal(todoState.filters.activeSection, 'my-todo', 'View reset back to All');
    assert.equal(todoState.filters.selectedTag, null);
    assert.equal(todoState.filters.searchQuery, '');
    assert.equal(todoState.filters.selectedClientId, 'All');
    assert.equal(todoState.filters.selectedAssigneeId, 'All');
  });

  await t.test('8. activeSection accepts "all" alias gracefully without dropping tasks', () => {
    const state = createMockRootState({
      unifiedTasks: sampleTasks,
      filters: {
        activeSection: 'all' as any,
        adminScope: 'all_work',
      },
    });

    const filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 4, 'Accepts "all" alias identical to "my-todo"');
  });

  await t.test('9. Non-admin employee correctly sees assigned tasks and personal tasks under All', () => {
    const state = createMockRootState(
      {
        unifiedTasks: sampleTasks,
        filters: {
          activeSection: 'my-todo',
        },
      },
      {
        id: 'emp_2',
        name: 'Staff Member',
        role: 'employee',
      }
    );

    const filtered = selectFilteredTodoTasks(state);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].id, 't6');
  });

  await t.test('10. Agenda tabs filter active All tasks by date properly', () => {
    const state = createMockRootState({
      unifiedTasks: sampleTasks,
      filters: {
        activeSection: 'my-todo',
        adminScope: 'all_work',
        dateFilterTab: 'all',
      },
    });

    const dateFiltered = selectDateFilteredTasks(state);
    assert.equal(dateFiltered.length, 4, 'All agenda shows all active tasks');
  });
});
