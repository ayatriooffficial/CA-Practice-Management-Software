import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../../rootReducer';
import { TeamTaskItem } from '@/services/todoApi';
import { TuriaSidebarCounts } from '@/components/todo/TuriaTodoSidebar';
import {
  parseDateToYMD,
  getTodayKolkataYMD,
  getTomorrowKolkataYMD,
} from '@/components/todo/todoDateUtils';

export const selectTodoState = (state: RootState) => state.todo;

export const selectTodoSummary = createSelector([selectTodoState], (todo) => todo.summary);
export const selectPersonalTodos = createSelector([selectTodoState], (todo) => todo.personalTodos);
export const selectAdminTasks = createSelector([selectTodoState], (todo) => todo.adminTasks);
export const selectTeamTasks = createSelector([selectTodoState], (todo) => todo.teamTasks);
export const selectMyTasks = createSelector([selectTodoState], (todo) => todo.myTasks);
export const selectUnifiedTasks = createSelector([selectTodoState], (todo) => todo.unifiedTasks);
export const selectCalendarEvents = createSelector([selectTodoState], (todo) => todo.calendarEvents);
export const selectTodoFilters = createSelector([selectTodoState], (todo) => todo.filters);
export const selectTodoPagination = createSelector([selectTodoState], (todo) => todo.pagination);
export const selectIsTodoLoading = createSelector([selectTodoState], (todo) => todo.isLoading);
export const selectIsTodoRefreshing = createSelector([selectTodoState], (todo) => todo.isRefreshing);
export const selectIsTodoMutating = createSelector([selectTodoState], (todo) => todo.mutating);
export const selectTodoError = createSelector([selectTodoState], (todo) => todo.error);
export const selectIsTodoLoaded = createSelector([selectTodoState], (todo) => todo.isLoaded);

const selectCurrentUser = (state: RootState) => state.auth.user;

/**
 * Derived selector for Admin scope counts: My Work vs Team Work vs All Work
 */
export const selectTodoScopeCounts = createSelector(
  [selectUnifiedTasks, selectCurrentUser],
  (tasks: TeamTaskItem[], currentUser) => {
    let myWork = 0;
    let teamWork = 0;
    let allWork = 0;

    tasks.forEach((t) => {
      const isDone = (t.status || '').toLowerCase() === 'completed';
      if (!isDone) {
        allWork++;
        const isMine =
          (t as any).isAdministrative ||
          t.assigneeId === currentUser?.id ||
          t.assigneeName === currentUser?.name ||
          t.assigneeName?.toLowerCase().includes('admin') ||
          t.category === 'Personal';

        if (isMine) {
          myWork++;
        } else {
          teamWork++;
        }
      }
    });

    return { myWork, teamWork, allWork };
  }
);

/**
 * Derived selector for sidebar / task view counts: All, Important, Recurring, Completed, Deleted
 */
export const selectTodoSidebarCounts = createSelector(
  [selectUnifiedTasks, selectTodoFilters, selectCurrentUser],
  (tasks: TeamTaskItem[], filters, currentUser): TuriaSidebarCounts => {
    let myTodo = 0;
    let important = 0;
    let recurring = 0;
    let completed = 0;
    let deleted = 0;

    const role = (currentUser?.role || 'employee').toLowerCase().trim();
    const isAdmin = ['admin', 'owner', 'partner', 'manager'].includes(role);

    tasks.forEach((t) => {
      const isDone = (t.status || '').toLowerCase() === 'completed';
      const isCancelled =
        (t.status || '').toLowerCase() === 'cancelled' || (t.status || '').toLowerCase() === 'deleted';
      const p = (t.priority || '').toLowerCase();
      const isImp = p === 'urgent' || p === 'high' || Boolean((t as any).isStarred) || Boolean((t as any).starred);
      const isRec = Boolean(
        t.category?.toLowerCase().includes('recurring') ||
          t.taskName?.toLowerCase().includes('recurring')
      );

      if (isCancelled) {
        deleted++;
      } else if (isDone) {
        completed++;
      } else {
        if (!isAdmin) {
          myTodo++;
          if (isImp) important++;
          if (isRec) recurring++;
        } else {
          const isMine =
            (t as any).isAdministrative ||
            t.assigneeId === currentUser?.id ||
            t.assigneeName === currentUser?.name ||
            t.assigneeName?.toLowerCase().includes('admin') ||
            t.category === 'Personal';

          if (filters.adminScope === 'my_work' && isMine) {
            myTodo++;
          } else if (filters.adminScope === 'team_work' && !isMine) {
            myTodo++;
          } else if (filters.adminScope === 'all_work') {
            myTodo++;
          }

          if (isImp) important++;
          if (isRec) recurring++;
        }
      }
    });

    return { myTodo, important, recurring, completed, deleted };
  }
);

/**
 * Derived selector for filtered tasks (all active filter criteria except date tab)
 */
export const selectFilteredTodoTasks = createSelector(
  [selectUnifiedTasks, selectTodoFilters, selectCurrentUser],
  (rawTasks: TeamTaskItem[], filters, currentUser) => {
    const role = (currentUser?.role || 'employee').toLowerCase().trim();
    const isAdmin = ['admin', 'owner', 'partner', 'manager'].includes(role);

    let list = [...rawTasks];

    // 1. Task-view filter
    if (filters.activeSection === 'completed') {
      list = list.filter((t) => (t.status || '').toLowerCase() === 'completed');
    } else if (filters.activeSection === 'deleted') {
      list = list.filter(
        (t) =>
          (t.status || '').toLowerCase() === 'cancelled' ||
          (t.status || '').toLowerCase() === 'deleted'
      );
    } else {
      list = list.filter(
        (t) =>
          (t.status || '').toLowerCase() !== 'completed' &&
          (t.status || '').toLowerCase() !== 'cancelled' &&
          (t.status || '').toLowerCase() !== 'deleted'
      );

      if (filters.activeSection === 'important') {
        list = list.filter((t) => {
          const p = (t.priority || '').toLowerCase();
          return p === 'urgent' || p === 'high' || Boolean((t as any).isStarred) || Boolean((t as any).starred);
        });
      } else if (filters.activeSection === 'recurring') {
        list = list.filter((t) =>
          Boolean(
            t.category?.toLowerCase().includes('recurring') ||
              t.taskName?.toLowerCase().includes('recurring')
          )
        );
      } else if (filters.activeSection === 'my-todo' || (filters.activeSection as string) === 'all') {
        if (!isAdmin) {
          list = list.filter(
            (t) =>
              t.assigneeId === currentUser?.id ||
              t.assigneeName === currentUser?.name ||
              t.category === 'Personal'
          );
        } else {
          if (filters.adminScope === 'my_work') {
            list = list.filter(
              (t) =>
                (t as any).isAdministrative ||
                t.assigneeId === currentUser?.id ||
                t.assigneeName === currentUser?.name ||
                t.assigneeName?.toLowerCase().includes('admin') ||
                t.category === 'Personal'
            );
          } else if (filters.adminScope === 'team_work') {
            list = list.filter(
              (t) =>
                !(t as any).isAdministrative &&
                t.assigneeId !== currentUser?.id &&
                !t.assigneeName?.toLowerCase().includes('admin') &&
                t.category !== 'Personal'
            );
          }
        }
      }
    }

    // 2. Tag filter
    if (filters.selectedTag) {
      list = list.filter(
        (t) => (t.category || '').toLowerCase() === filters.selectedTag?.toLowerCase()
      );
    }

    // 3. Search query
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.taskName?.toLowerCase().includes(q) ||
          t.clientName?.toLowerCase().includes(q) ||
          t.taskId?.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assigneeName?.toLowerCase().includes(q)
      );
    }

    // 4. Client filter
    if (filters.selectedClientId !== 'All') {
      list = list.filter(
        (t) =>
          t.clientId === filters.selectedClientId ||
          t.clientName === filters.selectedClientId
      );
    }

    // 5. Assignee filter (for Admin)
    if (filters.selectedAssigneeId !== 'All') {
      list = list.filter(
        (t) =>
          t.assigneeId === filters.selectedAssigneeId ||
          t.assigneeName?.toLowerCase().trim() ===
            filters.selectedAssigneeId.toLowerCase().trim()
      );
    }

    // 6. Specific due date filter
    if (filters.dueDateFilter) {
      list = list.filter((t) => parseDateToYMD(t.targetDueDate) === filters.dueDateFilter);
    }

    // 7. Sort
    list.sort((a, b) => {
      if (filters.sortBy === 'due-asc') {
        const da = parseDateToYMD(a.targetDueDate) || '9999-99-99';
        const db = parseDateToYMD(b.targetDueDate) || '9999-99-99';
        return da.localeCompare(db);
      }
      if (filters.sortBy === 'priority-desc') {
        const score = (p: string) =>
          p === 'Urgent' ? 4 : p === 'High' ? 3 : p === 'Medium' ? 2 : 1;
        return score(b.priority) - score(a.priority);
      }
      if (filters.sortBy === 'created-asc') {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ta - tb;
      }
      // default: created-desc
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    return list;
  }
);

/**
 * Derived selector for Date Tab counts: All Agenda, Today, Tomorrow, Upcoming, Overdue
 */
export const selectDateTabCounts = createSelector(
  [selectFilteredTodoTasks],
  (tasks: TeamTaskItem[]) => {
    const today = getTodayKolkataYMD();
    const tomorrow = getTomorrowKolkataYMD();

    let all = tasks.length;
    let todayCount = 0;
    let tomorrowCount = 0;
    let upcomingCount = 0;
    let overdueCount = 0;

    tasks.forEach((t) => {
      const isDone = (t.status || '').toLowerCase() === 'completed';
      const ymd = parseDateToYMD(t.targetDueDate);

      if (!isDone && ymd) {
        if (ymd < today) {
          overdueCount++;
        } else if (ymd === today) {
          todayCount++;
        } else if (ymd === tomorrow) {
          tomorrowCount++;
        } else {
          upcomingCount++;
        }
      }
    });

    return {
      all,
      today: todayCount,
      tomorrow: tomorrowCount,
      upcoming: upcomingCount,
      overdue: overdueCount,
    };
  }
);

/**
 * Derived selector for Date-tab filtered tasks
 */
export const selectDateFilteredTasks = createSelector(
  [selectFilteredTodoTasks, selectTodoFilters],
  (tasks: TeamTaskItem[], filters) => {
    const today = getTodayKolkataYMD();
    const tomorrow = getTomorrowKolkataYMD();

    if (filters.dateFilterTab === 'all') return tasks;

    return tasks.filter((t) => {
      const isDone = (t.status || '').toLowerCase() === 'completed';
      const ymd = parseDateToYMD(t.targetDueDate);

      if (filters.dateFilterTab === 'today') {
        return !isDone && ymd === today;
      }
      if (filters.dateFilterTab === 'tomorrow') {
        return !isDone && ymd === tomorrow;
      }
      if (filters.dateFilterTab === 'upcoming') {
        return !isDone && ymd && ymd > tomorrow;
      }
      if (filters.dateFilterTab === 'overdue') {
        return !isDone && ymd && ymd < today;
      }
      return true;
    });
  }
);

/**
 * Derived selector for Paginated Tasks
 */
export const selectPaginatedTodoTasks = createSelector(
  [selectDateFilteredTasks, selectTodoPagination],
  (tasks, pagination) => {
    const { page, limit } = pagination;
    const startIndex = (page - 1) * limit;
    return tasks.slice(startIndex, startIndex + limit);
  }
);
