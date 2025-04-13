import { ApiError, authenticatedFetch } from "@/lib/apiClient"; // Import the new utility and error class
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  // Removed duplicate useContext
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { useQuests } from "./QuestsContext"; // Import useQuests
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
  error: string | null;
  fetchTodos: () => Promise<void>; // This is the main fetch function
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
  moveTodo: (id: string, direction: "up" | "down") => Promise<void>; // Added moveTodo
  // Removed fetchTodosIfNeeded and lastFetchTime
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
  const [error, setError] = useState<string | null>(null);
  // Removed lastFetchTime state
  const [togglingTodoId, setTogglingTodoId] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const { session } = useAuth();
  const { showToast } = useToast();
  const { fetchQuests: fetchQuestsData } = useQuests(); // Get fetchQuests from QuestsContext
  const initialFetchDoneRef = useRef(false); // Ref to track initial fetch

  // Removed REFRESH_INTERVAL_MS constant
  // Removed getAuthHeaders as it's handled by authenticatedFetch

  const fetchTodos = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      // Use authenticatedFetch
      const data = await authenticatedFetch<{ todoItems: TodoItem[] }>(
        "/api/todos",
        "GET",
        session
      );
      setTodos(data.todoItems || []);
      // Removed setLastFetchTime
    } catch (e) {
      console.error("[TodosContext] Failed to fetch todos:", e); // Prefixed log
      // ApiError has a message property, other errors might too
      const errorMsg = e instanceof Error ? e.message : "Failed to fetch todos";
      setError(errorMsg);
      showToast({
        title: "Fetch Error",
        description: errorMsg,
        variant: "error",
      });
      setTodos([]);
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast]); // Removed getAuthHeaders from dependencies

  // Removed fetchTodosIfNeeded function

  // Effect to fetch todos when session changes - only fetch once
  useEffect(() => {
    if (session && !initialFetchDoneRef.current) {
      console.log(
        "[TodosContext] Session detected for the first time, fetching initial todos..."
      ); // Prefixed log
      initialFetchDoneRef.current = true; // Mark initial fetch as done
      fetchTodos();
    } else if (!session) {
      // Clear data and reset flag on logout
      setTodos([]);
      // Removed setLastFetchTime
      initialFetchDoneRef.current = false; // Reset flag
    }
  }, [session, fetchTodos]); // Depend on session and fetchTodos

  // Removed visibility change useEffect hook

  const addTodo = async (
    title: string,
    parentId?: string | null,
    dueDate?: string | null
  ) => {
    if (!session) {
      showToast({
        title: "You must be logged in to add todos.",
        variant: "error",
      });
      return;
    }
    setIsLoading(true); // Consider a more specific loading state if needed
    setError(null);
    try {
      // Use authenticatedFetch - assuming API returns nothing significant on success (or refetch covers it)
      await authenticatedFetch<void>("/api/todos/manual", "POST", session, {
        title,
        parent_id: parentId,
        due_date: dueDate || null,
      });
      // Refetch after successful add
      await fetchTodos();
    } catch (e) {
      console.error("[TodosContext] Failed to add todo:", e); // Prefixed log
      const errorMsg = e instanceof Error ? e.message : "Failed to add todo";
      setError(errorMsg);
      showToast({
        title: "Add Error",
        description: errorMsg,
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTodo = async (id: string) => {
    if (!session) {
      showToast({
        title: "You must be logged in to delete todos.",
        variant: "error",
      });
      return;
    }
    const originalTodos = [...todos];
    // Optimistic update logic remains the same
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

    // Consider a more specific loading state?
    // setIsLoading(true); // Maybe not needed for delete? Or use a specific deleting state?
    setError(null);
    try {
      // Use authenticatedFetch for the DELETE request
      await authenticatedFetch<void>(
        `/api/todos/manual/${id}`,
        "DELETE",
        session
      );
      // No need to refetch if optimistic update is sufficient and API confirms success
    } catch (e) {
      // Revert optimistic update on error
      setTodos(originalTodos);
      console.error("Failed to delete todo:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to delete todo";
      setError(errorMsg);
      showToast({
        title: "Delete Error",
        description: errorMsg,
        variant: "error",
      });
      // Optionally refetch here if needed to ensure consistency after error
      // await fetchTodos();
    } finally {
      // setIsLoading(false);
    }
  };

  const toggleTodo = async (id: string) => {
    if (!session) {
      showToast({
        title: "You must be logged in to toggle todos.",
        variant: "error",
      });
      return;
    }
    const originalTodos = [...todos];
    // Optimistic update logic remains the same
    const todoIndex = originalTodos.findIndex((t) => t.id === id);
    if (todoIndex === -1) return;
    const originalTodo = originalTodos[todoIndex];
    const updatedTodo = {
      ...originalTodo,
      is_completed: !originalTodo.is_completed,
    };
    setTodos((prev) => prev.map((t) => (t.id === id ? updatedTodo : t)));
    setTogglingTodoId(id); // Keep specific loading state for UI feedback
    setError(null);
    try {
      // Use authenticatedFetch for the PUT request
      await authenticatedFetch<void>(
        `/api/todos/manual/${id}/toggle`,
        "PUT",
        session
      );
      console.log(`Successfully toggled todo ${id}`);
      // API confirmed success, optimistic update is now the source of truth

      // Trigger quest refresh if todo was marked complete, with a short delay
      if (updatedTodo.is_completed === true) {
        console.log(
          `[TodosContext] Todo ${id} completed, triggering delayed quest refresh.`
        ); // Prefixed log
        setTimeout(() => fetchQuestsData({ forceRefresh: true }), 750); // Delay 750ms
      }
    } catch (e) {
      // Revert optimistic update on error
      setTodos(originalTodos);
      console.error("[TodosContext] Failed to toggle todo:", e); // Prefixed log
      const errorMsg = e instanceof Error ? e.message : "Failed to toggle todo";
      setError(errorMsg);
      showToast({
        title: "Toggle Error",
        description: errorMsg,
        variant: "error",
      });
    } finally {
      setTogglingTodoId(null); // Clear specific loading state
    }
  };

  const editTodo = async (id: string, newTitle: string) => {
    if (!session || !newTitle.trim()) {
      showToast({
        title: "Login and title required to edit.",
        variant: "warning",
      });
      return;
    }
    const originalTodos = [...todos];
    // Optimistic update logic remains the same
    const todoIndex = originalTodos.findIndex((t) => t.id === id);
    if (todoIndex === -1) return;
    const originalTodo = originalTodos[todoIndex];
    const updatedTodo = { ...originalTodo, title: newTitle.trim() };
    setTodos((prev) => prev.map((t) => (t.id === id ? updatedTodo : t)));
    setEditingTodoId(id); // Keep specific loading state
    setError(null);
    try {
      // Use authenticatedFetch for the PUT request, expecting the updated TodoItem
      const confirmedTodo = await authenticatedFetch<TodoItem>(
        `/api/todos/manual/${id}`,
        "PUT",
        session,
        { title: newTitle.trim() }
      );
      console.log(`Successfully edited todo ${id}`);
      // Update state with the confirmed data from the server
      setTodos((prev) =>
        prev.map((t) =>
          t.id === id ? { ...confirmedTodo, sourceProvider: "manual" } : t
        )
      );
    } catch (e) {
      // Revert optimistic update on error
      setTodos(originalTodos);
      console.error("[TodosContext] Failed to edit todo:", e); // Prefixed log
      const errorMsg = e instanceof Error ? e.message : "Failed to edit todo";
      setError(errorMsg);
      showToast({
        title: "Edit Error",
        description: errorMsg,
        variant: "error",
      });
    } finally {
      setEditingTodoId(null); // Clear specific loading state
    }
  };

  const reorderTodos = async (
    parentId: string | null,
    orderedIds: string[]
  ) => {
    if (!session) {
      showToast({
        title: "You must be logged in to reorder todos.",
        variant: "error",
      });
      return;
    }
    const originalTodos = [...todos];
    // Optimistic update logic remains the same
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
          // Should not happen if filtering by parentId correctly, but safe fallback
          return 0;
        }
        return a.position - b.position;
      });
    setTodos(newOptimisticTodos);
    setIsLoading(true); // Use general loading state for reorder
    setError(null);
    try {
      // Use authenticatedFetch for the PUT request
      await authenticatedFetch<void>(
        `/api/todos/manual/reorder`,
        "PUT",
        session,
        { parentId, orderedIds }
      );
      console.log(
        `Successfully reordered todos under parent ${parentId || "NULL"}`
      );
      // Refetch after successful reorder to ensure consistency
      await fetchTodos();
    } catch (e) {
      // Revert optimistic update on error
      setTodos(originalTodos);
      console.error("[TodosContext] Failed to reorder todos:", e); // Prefixed log
      const errorMsg =
        e instanceof Error ? e.message : "Failed to reorder todos";
      setError(errorMsg);
      showToast({
        title: "Reorder Error",
        description: errorMsg,
        variant: "error",
      });
      // Refetch needed after failed reorder to get correct state
      await fetchTodos();
    } finally {
      setIsLoading(false);
    }
  };

  const breakdownTodo = async (todo: TodoItem) => {
    const id = todo.id;
    if (!session) {
      showToast({
        title: "You must be logged in to break down todos.",
        variant: "error",
      });
      return;
    }
    setIsLoading(true); // Use general loading state
    setError(null);

    // Parent title logic remains the same
    let parentTitle: string | undefined = undefined;
    if (todo.level === 1 && todo.parent_id) {
      const parent = todos.find((t) => t.id === todo.parent_id);
      if (parent) {
        parentTitle = parent.title;
        console.log(
          `[TodosContext] Found parent title for breakdown: "${parentTitle}"`
        ); // Prefixed log
      } else {
        console.warn(
          `[TodosContext] Parent todo with id ${todo.parent_id} not found in context state.` // Prefixed log
        );
      }
    }

    try {
      const requestBody: { parentTitle?: string } = {};
      if (parentTitle) {
        requestBody.parentTitle = parentTitle;
      }

      // Use authenticatedFetch for the POST request
      const result = await authenticatedFetch<{ createdSubItems: TodoItem[] }>(
        `/api/todos/manual/${id}/breakdown`,
        "POST",
        session,
        requestBody
      );

      // Success handling remains the same
      const createdCount = result.createdSubItems?.length || 0;
      if (createdCount > 0) {
        showToast({
          title: `Generated ${createdCount} sub-tasks!`,
          variant: "success",
        });
        const newItemsWithFlag = result.createdSubItems.map(
          (item: TodoItem) => ({ ...item, isNew: true })
        );
        setTodos((prev) =>
          [...prev, ...newItemsWithFlag].sort((a, b) =>
            a.level === b.level ? a.position - b.position : a.level - b.level
          )
        );
        // Animation flag removal logic remains the same
        setTimeout(() => {
          setTodos((currentTodos) =>
            currentTodos.map((t) =>
              newItemsWithFlag.find((newItem: TodoItem) => newItem.id === t.id)
                ? { ...t, isNew: false }
                : t
            )
          );
        }, 1000);
      } else {
        showToast({ title: "No sub-tasks generated.", variant: "info" });
      }
    } catch (e) {
      // Specific error handling for 422 / NEED_MORE_CONTEXT
      if (
        e instanceof ApiError &&
        e.status === 422 &&
        e.errorBody?.code === "NEED_MORE_CONTEXT"
      ) {
        showToast({
          title: "Task too ambiguous",
          description: "Please refine the task title for automatic breakdown.",
          variant: "warning",
        });
      } else {
        // General error handling
        console.error("[TodosContext] Failed to break down todo:", e); // Prefixed log
        const errorMsg =
          e instanceof Error ? e.message : "Failed to break down task";
        setError(errorMsg);
        showToast({
          title: "Breakdown Error",
          description: errorMsg,
          variant: "error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // New function to handle moving items up/down
  const moveTodo = async (id: string, direction: "up" | "down") => {
    if (!session) {
      showToast({
        title: "You must be logged in to move todos.",
        variant: "error",
      });
      return;
    }
    // Optimistic update logic remains the same
    const itemToMove = todos.find((t) => t.id === id);
    if (!itemToMove) return;
    const siblings = todos
      .filter((t) => t.parent_id === itemToMove.parent_id)
      .sort((a, b) => a.position - b.position);
    const currentIndex = siblings.findIndex((t) => t.id === id);

    let canMove = false;
    if (direction === "up" && currentIndex > 0) {
      const targetIndex = currentIndex - 1;
      const tempPos = siblings[targetIndex].position;
      siblings[targetIndex].position = siblings[currentIndex].position;
      siblings[currentIndex].position = tempPos;
      canMove = true;
    } else if (direction === "down" && currentIndex < siblings.length - 1) {
      const targetIndex = currentIndex + 1;
      const tempPos = siblings[targetIndex].position;
      siblings[targetIndex].position = siblings[currentIndex].position;
      siblings[currentIndex].position = tempPos;
      canMove = true;
    }

    if (!canMove) return; // Cannot move further

    const originalTodos = [...todos]; // Store state before optimistic update
    setTodos([...todos]); // Trigger re-render with optimistic update

    setIsLoading(true); // Consider a different loading state?
    setError(null);
    try {
      // Use authenticatedFetch for the PUT request
      await authenticatedFetch<void>(
        `/api/todos/manual/${id}/move`,
        "PUT",
        session,
        {
          direction,
        }
      );
      console.log(`Successfully moved todo ${id} ${direction}`);
      // Refetch to confirm final order from DB
      await fetchTodos();
    } catch (e) {
      // Revert optimistic update on error
      setTodos(originalTodos);
      console.error(`[TodosContext] Failed to move todo ${direction}:`, e); // Prefixed log
      const errorMsg =
        e instanceof Error ? e.message : `Failed to move todo ${direction}`;
      setError(errorMsg);
      showToast({
        title: "Move Error",
        description: errorMsg,
        variant: "error",
      });
      // Refetch needed after failed move to get correct state
      await fetchTodos();
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
    moveTodo, // Add moveTodo to context value
    // Removed fetchTodosIfNeeded and lastFetchTime
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
