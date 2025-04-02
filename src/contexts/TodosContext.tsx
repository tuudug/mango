import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext"; // Import useToast

// Define the structure of a todo item from backend
export interface TodoItem {
  id: string;
  connection_id: string;
  title: string;
  is_completed: boolean;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  position: number;
  parent_id?: string | null;
  level: number;
  sourceProvider: "manual";
  isNew?: boolean; // Flag for animation
}

// Define the structure for the nested tree
export interface NestedTodoItem extends TodoItem {
  children: NestedTodoItem[];
}

// Define the shape of the context data
interface TodosContextType {
  todos: TodoItem[];
  nestedTodos: NestedTodoItem[];
  isLoading: boolean;
  error: string | null; // Keep internal error state? Maybe just use toasts.
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
  breakdownTodo: (id: string) => Promise<void>;
  fetchTodosIfNeeded: () => void;
  lastFetchTime: Date | null;
  togglingTodoId: string | null;
  editingTodoId: string | null;
}

const TodosContext = createContext<TodosContextType | undefined>(undefined);

interface TodosProviderProps {
  children: ReactNode;
}

// Helper function to build the nested tree
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
      itemMap[item.parent_id].children.sort((a, b) => a.position - b.position);
    } else {
      roots.push(node);
    }
  });

  roots.sort((a, b) => a.position - b.position);
  return roots;
};

export const TodosProvider: React.FC<TodosProviderProps> = ({ children }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null); // Keep for potential non-toast errors
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [togglingTodoId, setTogglingTodoId] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const { session } = useAuth();
  const { showToast } = useToast(); // Use the toast hook

  const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

  const getAuthHeaders = useCallback(() => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [session]);

  const fetchTodos = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/todos", { headers: getAuthHeaders() });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data: { todoItems: TodoItem[] } = await response.json();
      setTodos(data.todoItems || []);
      setLastFetchTime(new Date());
    } catch (e) {
      console.error("Failed to fetch todos:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to fetch todos";
      setError(errorMsg);
      showToast(errorMsg, "error"); // Show toast on fetch error
      setTodos([]);
    } finally {
      setIsLoading(false);
    }
  }, [session, getAuthHeaders, showToast]); // Added showToast dependency

  const fetchTodosIfNeeded = useCallback(() => {
    // ... (no changes needed here)
    if (isLoading) return;
    const now = new Date();
    if (
      !lastFetchTime ||
      now.getTime() - lastFetchTime.getTime() > REFRESH_INTERVAL_MS
    ) {
      console.log("Todo refresh interval elapsed, fetching...");
      fetchTodos();
    } else {
      console.log("Skipping todo fetch, refresh interval not elapsed.");
    }
  }, [isLoading, lastFetchTime, fetchTodos]);

  useEffect(() => {
    // ... (no changes needed here)
    if (session) {
      fetchTodosIfNeeded();
    } else {
      setTodos([]);
      setLastFetchTime(null);
    }
  }, [session]);

  useEffect(() => {
    // ... (no changes needed here)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Todo Window became visible, checking if fetch needed...");
        fetchTodosIfNeeded();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchTodosIfNeeded]);

  const addTodo = async (
    title: string,
    parentId?: string | null,
    dueDate?: string | null
  ) => {
    if (!session) {
      showToast("You must be logged in to add todos.", "error");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/todos/manual", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title,
          parent_id: parentId,
          due_date: dueDate || null,
        }),
      });
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMsg);
      }
      await fetchTodos(); // Refetch to get new item with correct state
    } catch (e) {
      console.error("Failed to add todo:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to add todo";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTodo = async (id: string) => {
    if (!session) {
      showToast("You must be logged in to delete todos.", "error");
      return;
    }
    const originalTodos = [...todos];
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
    setTodos((prev) => prev.filter((item) => !itemsToRemove.has(item.id)));
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/todos/manual/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        setTodos(originalTodos);
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMsg);
      }
      // No refetch needed if cascade delete works and optimistic update is sufficient
    } catch (e) {
      setTodos(originalTodos);
      console.error("Failed to delete todo:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to delete todo";
      setError(errorMsg);
      showToast(errorMsg, "error");
      await fetchTodos(); // Refetch on error
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTodo = async (id: string) => {
    // ... (keep optimistic update, add toast on error)
    if (!session) {
      showToast("You must be logged in to toggle todos.", "error");
      return;
    }
    const originalTodos = [...todos];
    const todoIndex = originalTodos.findIndex((t) => t.id === id);
    if (todoIndex === -1) return;
    const originalTodo = originalTodos[todoIndex];
    const updatedTodo = {
      ...originalTodo,
      is_completed: !originalTodo.is_completed,
    };
    setTodos((prev) => prev.map((t) => (t.id === id ? updatedTodo : t)));
    setTogglingTodoId(id);
    setError(null);
    try {
      const response = await fetch(`/api/todos/manual/${id}/toggle`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        setTodos(originalTodos);
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMsg);
      }
      console.log(`Successfully toggled todo ${id}`);
    } catch (e) {
      setTodos(originalTodos);
      console.error("Failed to toggle todo:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to toggle todo";
      setError(errorMsg);
      showToast(errorMsg, "error"); // Show toast on error
    } finally {
      setTogglingTodoId(null);
    }
  };

  const editTodo = async (id: string, newTitle: string) => {
    // ... (keep optimistic update, add toast on error)
    if (!session || !newTitle.trim()) {
      showToast("Login and title required to edit.", "warning");
      return;
    }
    const originalTodos = [...todos];
    const todoIndex = originalTodos.findIndex((t) => t.id === id);
    if (todoIndex === -1) return;
    const originalTodo = originalTodos[todoIndex];
    const updatedTodo = { ...originalTodo, title: newTitle.trim() };
    setTodos((prev) => prev.map((t) => (t.id === id ? updatedTodo : t)));
    setEditingTodoId(id);
    setError(null);
    try {
      const response = await fetch(`/api/todos/manual/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!response.ok) {
        setTodos(originalTodos);
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMsg);
      }
      console.log(`Successfully edited todo ${id}`);
      const confirmedTodo = await response.json();
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id ? { ...confirmedTodo, sourceProvider: "manual" } : t
        )
      );
    } catch (e) {
      setTodos(originalTodos);
      console.error("Failed to edit todo:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to edit todo";
      setError(errorMsg);
      showToast(errorMsg, "error"); // Show toast on error
    } finally {
      setEditingTodoId(null);
    }
  };

  const reorderTodos = async (
    parentId: string | null,
    orderedIds: string[]
  ) => {
    // ... (keep optimistic update, add toast on error)
    if (!session) {
      showToast("You must be logged in to reorder todos.", "error");
      return;
    }
    const originalTodos = [...todos];
    const newOptimisticTodos = originalTodos
      .map((todo) => {
        const newIndex = orderedIds.indexOf(todo.id);
        if (todo.parent_id === parentId && newIndex !== -1) {
          return { ...todo, position: newIndex + 1 };
        }
        return todo;
      })
      .sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        if (a.parent_id !== b.parent_id) {
          return 0;
        }
        return a.position - b.position;
      });
    setTodos(newOptimisticTodos);
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/todos/manual/reorder`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ parentId, orderedIds }),
      });
      if (!response.ok) {
        setTodos(originalTodos);
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMsg);
      }
      console.log(
        `Successfully reordered todos under parent ${parentId || "NULL"}`
      );
      await fetchTodos(); // Refetch might be safest
    } catch (e) {
      setTodos(originalTodos);
      console.error("Failed to reorder todos:", e);
      const errorMsg =
        e instanceof Error ? e.message : "Failed to reorder todos";
      setError(errorMsg);
      showToast(errorMsg, "error"); // Show toast on error
      await fetchTodos();
    } finally {
      setIsLoading(false);
    }
  };

  // Updated breakdownTodo to handle specific API responses and show toasts
  const breakdownTodo = async (id: string) => {
    if (!session) {
      showToast("You must be logged in to break down todos.", "error");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/todos/manual/${id}/breakdown`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        let errorCode = null;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
          errorCode = errorBody.code; // Check for specific code from API
        } catch {
          /* Ignore */
        }

        // Handle specific "need more context" error
        if (response.status === 422 && errorCode === "NEED_MORE_CONTEXT") {
          showToast(
            "Task too ambiguous",
            "warning",
            "Please refine the task title for automatic breakdown."
          );
        } else {
          throw new Error(errorMsg); // Throw other errors
        }
      } else {
        const result = await response.json();
        const createdCount = result.createdSubItems?.length || 0;
        if (createdCount > 0) {
          showToast(`Generated ${createdCount} sub-tasks!`, "success");
          // Add animation flag to new items before setting state
          const newItemsWithFlag = result.createdSubItems.map(
            (item: TodoItem) => ({ ...item, isNew: true })
          );
          setTodos((prev) =>
            [...prev, ...newItemsWithFlag].sort((a, b) =>
              a.level === b.level ? a.position - b.position : a.level - b.level
            )
          );
          // Remove flag after animation duration
          setTimeout(() => {
            setTodos((currentTodos) =>
              currentTodos.map((t) =>
                newItemsWithFlag.find(
                  (newItem: TodoItem) => newItem.id === t.id
                )
                  ? { ...t, isNew: false }
                  : t
              )
            );
          }, 1000); // Match animation duration (adjust if needed)
        } else {
          showToast("No sub-tasks generated.", "info");
        }
        // No full refetch needed if API returns created items
        // await fetchTodos();
      }
    } catch (e) {
      console.error("Failed to break down todo:", e);
      const errorMsg =
        e instanceof Error ? e.message : "Failed to break down task";
      setError(errorMsg);
      showToast(errorMsg, "error"); // Show generic error toast
    } finally {
      setIsLoading(false);
    }
  };

  const nestedTodos = useMemo(() => buildTree(todos), [todos]);

  const value = {
    todos,
    nestedTodos,
    isLoading,
    error,
    fetchTodos,
    addTodo,
    deleteTodo,
    toggleTodo,
    editTodo,
    reorderTodos,
    breakdownTodo,
    fetchTodosIfNeeded,
    lastFetchTime,
    togglingTodoId,
    editingTodoId,
  };

  return (
    <TodosContext.Provider value={value}>{children}</TodosContext.Provider>
  );
};

export const useTodos = (): TodosContextType => {
  const context = useContext(TodosContext);
  if (context === undefined) {
    throw new Error("useTodos must be used within a TodosProvider");
  }
  return context;
};
