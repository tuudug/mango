import { create } from "zustand";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
// import { useQuests } from '@/contexts/QuestsContext'; // Commented out for now, will address in toggleTodo
import { authenticatedFetch, ApiError } from "@/lib/apiClient";

// --- Types ---
// Duplicating types here for now, can be moved to a central types file later
export interface TodoItem {
  id: string;
  connection_id: string; // Can be null if manually created
  title: string;
  is_completed: boolean;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  position: number;
  parent_id?: string | null;
  level: number;
  sourceProvider: "manual" | string; // Allow other strings for external sources
  isNew?: boolean; // Flag for animation
}

export interface NestedTodoItem extends TodoItem {
  children: NestedTodoItem[];
}

// --- Helper function to build the nested tree ---
const buildTree = (items: TodoItem[]): NestedTodoItem[] => {
  const itemMap: { [key: string]: NestedTodoItem } = {};
  const roots: NestedTodoItem[] = [];

  items.forEach((item) => {
    itemMap[item.id] = { ...item, children: [] };
  });

  items.forEach((item) => {
    const node = itemMap[item.id];
    if (item.parent_id && itemMap[item.parent_id]) {
      itemMap[item.parent_id].children.push(node);
      // Sort children after pushing, important for maintaining order from DB
      itemMap[item.parent_id].children.sort((a, b) => a.position - b.position);
    } else {
      roots.push(node);
    }
  });

  roots.sort((a, b) => a.position - b.position);
  return roots;
};

interface TodosState {
  todos: TodoItem[];
  nestedTodos: NestedTodoItem[]; // Derived state
  isLoading: boolean;
  error: string | null;
  togglingTodoId: string | null;
  editingTodoId: string | null;
  fetchTodos: () => Promise<void>;
  addTodo: (
    title: string,
    parentId?: string | null,
    dueDate?: string | null
  ) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  editTodo: (id: string, newTitle: string) => Promise<void>;
  reorderTodos: (
    parentId: string | null,
    orderedIds: string[]
  ) => Promise<void>;
  breakdownTodo: (todo: TodoItem) => Promise<void>;
  moveTodo: (id: string, direction: "up" | "down") => Promise<void>;
  _syncNestedTodos: () => void; // Helper to update nestedTodos
}

export const useTodosStore = create<TodosState>((set, get) => ({
  todos: [],
  nestedTodos: [],
  isLoading: false,
  error: null,
  togglingTodoId: null,
  editingTodoId: null,

  _syncNestedTodos: () =>
    set((state) => ({ nestedTodos: buildTree(state.todos) })),

  fetchTodos: async () => {
    const session = useAuthStore.getState().session;
    if (!session) return;
    set({ isLoading: true, error: null });
    try {
      const data = await authenticatedFetch<{ todoItems: TodoItem[] }>(
        "/api/todos",
        "GET",
        session
      );
      set({ todos: data.todoItems || [], isLoading: false });
      get()._syncNestedTodos();
    } catch (e: any) {
      console.error("[TodosStore] Failed to fetch todos:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to fetch todos";
      set({ isLoading: false, error: errorMsg });
      useToastStore.getState().showToast({
        title: "Fetch Error",
        description: errorMsg,
        variant: "error",
      });
    }
  },

  addTodo: async (title, parentId, dueDate) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      useToastStore.getState().showToast({
        title: "You must be logged in to add todos.",
        variant: "error",
      });
      return;
    }
    // No isLoading set here, assuming fetchTodos will handle it, or add specific loading state.
    set({ error: null });
    try {
      await authenticatedFetch<void>("/api/todos/manual", "POST", session, {
        title,
        parent_id: parentId,
        due_date: dueDate || null,
      });
      await get().fetchTodos(); // Refetch to get new item and correct order/level
    } catch (e: any) {
      console.error("[TodosStore] Failed to add todo:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to add todo";
      set({ error: errorMsg });
      useToastStore.getState().showToast({
        title: "Add Error",
        description: errorMsg,
        variant: "error",
      });
    }
  },

  deleteTodo: async (id) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      useToastStore.getState().showToast({
        title: "You must be logged in to delete todos.",
        variant: "error",
      });
      return;
    }
    const originalTodos = [...get().todos];
    const itemsToRemove = new Set<string>([id]);
    const findDescendants = (parentId: string) => {
      originalTodos.forEach((item) => {
        if (item.parent_id === parentId) {
          itemsToRemove.add(item.id);
          findDescendants(item.id);
        }
      });
    };
    findDescendants(id);
    set((state) => ({
      todos: state.todos.filter((item) => !itemsToRemove.has(item.id)),
    }));
    get()._syncNestedTodos();
    set({ error: null });

    try {
      await authenticatedFetch<void>(
        `/api/todos/manual/${id}`,
        "DELETE",
        session
      );
    } catch (e: any) {
      set({ todos: originalTodos, error: e.message }); // Revert optimistic update
      get()._syncNestedTodos();
      console.error("[TodosStore] Failed to delete todo:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to delete todo";
      useToastStore.getState().showToast({
        title: "Delete Error",
        description: errorMsg,
        variant: "error",
      });
    }
  },

  toggleTodo: async (id: string) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      useToastStore.getState().showToast({
        title: "You must be logged in to toggle todos.",
        variant: "error",
      });
      return;
    }
    const originalTodos = [...get().todos];
    const todoIndex = originalTodos.findIndex((t) => t.id === id);
    if (todoIndex === -1) return;
    const originalTodo = originalTodos[todoIndex];
    const updatedTodo = {
      ...originalTodo,
      is_completed: !originalTodo.is_completed,
    };

    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? updatedTodo : t)),
      togglingTodoId: id,
      error: null,
    }));
    get()._syncNestedTodos();

    try {
      await authenticatedFetch<void>(
        `/api/todos/manual/${id}/toggle`,
        "PUT",
        session
      );
      console.log(`[TodosStore] Successfully toggled todo ${id}`);
      if (updatedTodo.is_completed) {
        // console.log("[TodosStore] Todo completed, attempting to refresh quests.");
        // TODO: Quests system disabled. Original call: setTimeout(() => fetchQuestsData({ forceRefresh: true }), 750);
      }
    } catch (e: any) {
      set({ todos: originalTodos, error: e.message }); // Revert optimistic update
      get()._syncNestedTodos();
      console.error("[TodosStore] Failed to toggle todo:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to toggle todo";
      useToastStore.getState().showToast({
        title: "Toggle Error",
        description: errorMsg,
        variant: "error",
      });
    } finally {
      set({ togglingTodoId: null });
    }
  },

  editTodo: async (id, newTitle) => {
    const session = useAuthStore.getState().session;
    if (!session || !newTitle.trim()) {
      useToastStore.getState().showToast({
        title: "Login and title required to edit.",
        variant: "warning",
      });
      return;
    }
    const originalTodos = [...get().todos];
    const todoIndex = originalTodos.findIndex((t) => t.id === id);
    if (todoIndex === -1) return;
    const updatedOptimisticTodo = {
      ...originalTodos[todoIndex],
      title: newTitle.trim(),
    };

    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? updatedOptimisticTodo : t)),
      editingTodoId: id,
      error: null,
    }));
    get()._syncNestedTodos();

    try {
      const confirmedTodo = await authenticatedFetch<TodoItem>(
        `/api/todos/manual/${id}`,
        "PUT",
        session,
        { title: newTitle.trim() }
      );
      set((state) => ({
        todos: state.todos.map((t) =>
          t.id === id ? { ...confirmedTodo, sourceProvider: "manual" } : t
        ),
      }));
      get()._syncNestedTodos();
    } catch (e: any) {
      set({ todos: originalTodos, error: e.message }); // Revert
      get()._syncNestedTodos();
      console.error("[TodosStore] Failed to edit todo:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to edit todo";
      useToastStore.getState().showToast({
        title: "Edit Error",
        description: errorMsg,
        variant: "error",
      });
    } finally {
      set({ editingTodoId: null });
    }
  },

  reorderTodos: async (parentId, orderedIds) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      useToastStore.getState().showToast({
        title: "You must be logged in to reorder todos.",
        variant: "error",
      });
      return;
    }
    const originalTodos = [...get().todos];
    const newOptimisticTodos = originalTodos
      .map((todo) => {
        const newIndex = orderedIds.indexOf(todo.id);
        if (todo.parent_id === parentId && newIndex !== -1) {
          return { ...todo, position: newIndex + 1 }; // Position is 1-based in some logic, ensure consistency
        }
        return todo;
      })
      .sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        if (a.parent_id !== b.parent_id) return 0;
        return a.position - b.position;
      });

    set({ todos: newOptimisticTodos, isLoading: true, error: null });
    get()._syncNestedTodos();

    try {
      await authenticatedFetch<void>(
        `/api/todos/manual/reorder`,
        "PUT",
        session,
        { parentId, orderedIds }
      );
      await get().fetchTodos(); // Refetch to ensure consistency
    } catch (e: any) {
      set({ todos: originalTodos, isLoading: false, error: e.message }); // Revert
      get()._syncNestedTodos();
      console.error("[TodosStore] Failed to reorder todos:", e);
      const errorMsg =
        e instanceof Error ? e.message : "Failed to reorder todos";
      useToastStore.getState().showToast({
        title: "Reorder Error",
        description: errorMsg,
        variant: "error",
      });
      await get().fetchTodos(); // Refetch to get correct state
    } finally {
      // isLoading is set by fetchTodos or error case
    }
  },

  breakdownTodo: async (todo) => {
    const session = useAuthStore.getState().session;
    const id = todo.id;
    if (!session) {
      useToastStore.getState().showToast({
        title: "You must be logged in to break down todos.",
        variant: "error",
      });
      return;
    }
    set({ isLoading: true, error: null });

    let parentTitle: string | undefined = undefined;
    if (todo.level === 1 && todo.parent_id) {
      const parent = get().todos.find((t) => t.id === todo.parent_id);
      if (parent) parentTitle = parent.title;
    }

    try {
      const requestBody: { parentTitle?: string } = {};
      if (parentTitle) requestBody.parentTitle = parentTitle;

      const result = await authenticatedFetch<{ createdSubItems: TodoItem[] }>(
        `/api/todos/manual/${id}/breakdown`,
        "POST",
        session,
        requestBody
      );

      const createdCount = result.createdSubItems?.length || 0;
      if (createdCount > 0) {
        useToastStore.getState().showToast({
          title: `Generated ${createdCount} sub-tasks!`,
          variant: "success",
        });
        const newItemsWithFlag = result.createdSubItems.map(
          (item: TodoItem) => ({ ...item, isNew: true })
        );

        set((state) => ({
          todos: [...state.todos, ...newItemsWithFlag].sort((a, b) =>
            a.level === b.level ? a.position - b.position : a.level - b.level
          ),
          isLoading: false,
        }));
        get()._syncNestedTodos();

        setTimeout(() => {
          set((state) => ({
            todos: state.todos.map((t) =>
              newItemsWithFlag.find((newItem: TodoItem) => newItem.id === t.id)
                ? { ...t, isNew: false }
                : t
            ),
          }));
          get()._syncNestedTodos();
        }, 1000);
      } else {
        useToastStore
          .getState()
          .showToast({ title: "No sub-tasks generated.", variant: "info" });
        set({ isLoading: false });
      }
    } catch (e: any) {
      if (
        e instanceof ApiError &&
        e.status === 422 &&
        e.errorBody?.code === "NEED_MORE_CONTEXT"
      ) {
        useToastStore.getState().showToast({
          title: "Task too ambiguous",
          description: "Please refine the task title for automatic breakdown.",
          variant: "warning",
        });
      } else {
        console.error("[TodosStore] Failed to break down todo:", e);
        const errorMsg =
          e instanceof Error ? e.message : "Failed to break down task";
        useToastStore.getState().showToast({
          title: "Breakdown Error",
          description: errorMsg,
          variant: "error",
        });
      }
      set({ isLoading: false, error: e.message });
    }
  },

  moveTodo: async (id, direction) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      useToastStore.getState().showToast({
        title: "You must be logged in to move todos.",
        variant: "error",
      });
      return;
    }
    const currentTodos = get().todos;
    const itemToMove = currentTodos.find((t) => t.id === id);
    if (!itemToMove) return;

    const siblings = currentTodos
      .filter((t) => t.parent_id === itemToMove.parent_id)
      .sort((a, b) => a.position - b.position);
    const currentIndex = siblings.findIndex((t) => t.id === id);
    let targetIndex = -1;

    if (direction === "up" && currentIndex > 0) targetIndex = currentIndex - 1;
    else if (direction === "down" && currentIndex < siblings.length - 1)
      targetIndex = currentIndex + 1;

    if (targetIndex === -1) return; // Cannot move

    const originalTodos = [...currentTodos];
    // Optimistic update: Swap positions
    const updatedTodos = currentTodos.map((todo) => {
      if (todo.id === siblings[currentIndex].id)
        return { ...todo, position: siblings[targetIndex].position };
      if (todo.id === siblings[targetIndex].id)
        return { ...todo, position: siblings[currentIndex].position };
      return todo;
    });

    set({ todos: updatedTodos, error: null }); // isLoading true will be set by reorderTodos if used, or add specific loading
    get()._syncNestedTodos();

    try {
      await authenticatedFetch<void>(
        `/api/todos/manual/${id}/move`,
        "PUT",
        session,
        { direction }
      );
      await get().fetchTodos(); // Refetch to confirm final order
    } catch (e: any) {
      set({ todos: originalTodos, error: e.message }); // Revert
      get()._syncNestedTodos();
      console.error(`[TodosStore] Failed to move todo ${direction}:`, e);
      const errorMsg =
        e instanceof Error ? e.message : `Failed to move todo ${direction}`;
      useToastStore.getState().showToast({
        title: "Move Error",
        description: errorMsg,
        variant: "error",
      });
      await get().fetchTodos(); // Refetch to get correct state
    }
  },
}));

// --- Auth Subscription ---
let currentAuthSessionToken = useAuthStore.getState().session?.access_token; // Get initial session token

useAuthStore.subscribe((state) => {
  const newSession = state.session;
  const { fetchTodos } = useTodosStore.getState();
  const newAuthSessionToken = newSession?.access_token;

  if (newAuthSessionToken && !currentAuthSessionToken) {
    // User signed in
    console.log(
      "[TodosStore] Auth session detected (sign in), fetching initial todos..."
    );
    fetchTodos();
  } else if (!newAuthSessionToken && currentAuthSessionToken) {
    // User signed out
    console.log(
      "[TodosStore] Auth session removed (sign out), clearing todos..."
    );
    useTodosStore.setState({
      todos: [],
      nestedTodos: [],
      error: null,
      isLoading: false,
    });
    // _syncNestedTodos(); // Not strictly necessary as todos is empty, but good practice
  } else if (
    newAuthSessionToken &&
    newAuthSessionToken !== currentAuthSessionToken
  ) {
    // Session refreshed or changed
    console.log(
      "[TodosStore] Auth session refreshed/changed, fetching todos..."
    );
    fetchTodos();
  }
  currentAuthSessionToken = newAuthSessionToken; // Update current session token for next comparison
});

// If there's already a session when the store is initialized (e.g., app reloaded with active session)
if (currentAuthSessionToken) {
  console.log(
    "[TodosStore] Initial auth session present on load, fetching todos..."
  );
  useTodosStore.getState().fetchTodos();
}
