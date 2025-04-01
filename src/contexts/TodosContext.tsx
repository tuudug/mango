import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback, // Import useCallback
} from "react";
import { useAuth } from "./AuthContext"; // Import useAuth

// Define the structure of a todo item from backend
// Matches TodoItem in backend for now
export interface TodoItem {
  id: string;
  connection_id: string;
  title: string; // Renamed from text
  is_completed: boolean; // Renamed from completed
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  sourceProvider: "manual"; // Only manual for now
}

// Define the shape of the context data
interface TodosContextType {
  todos: TodoItem[];
  isLoading: boolean;
  error: string | null;
  fetchTodos: () => Promise<void>;
  addTodo: (title: string, due_date?: string | null) => Promise<void>; // Updated params
  deleteTodo: (id: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  fetchTodosIfNeeded: () => void; // Add throttled fetch
}

// Create the context with a default value
const TodosContext = createContext<TodosContextType | undefined>(undefined);

// Define the props for the provider component
interface TodosProviderProps {
  children: ReactNode;
}

// Create the provider component
export const TodosProvider: React.FC<TodosProviderProps> = ({ children }) => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null); // Track last fetch time
  const { session } = useAuth(); // Get session for auth token

  const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  // Helper for auth headers
  const getAuthHeaders = useCallback(() => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [session]);

  // Function to fetch todos from backend
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
      setLastFetchTime(new Date()); // Update last fetch time on success
    } catch (e) {
      console.error("Failed to fetch todos:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      setTodos([]);
    } finally {
      setIsLoading(false);
    }
  }, [session, getAuthHeaders]);

  // Throttled fetch function
  const fetchTodosIfNeeded = useCallback(() => {
    if (isLoading) return; // Don't fetch if already loading

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

  // Fetch data (if needed) on initial mount or session change
  useEffect(() => {
    if (session) {
      fetchTodosIfNeeded();
    } else {
      setTodos([]);
      setLastFetchTime(null); // Reset last fetch time
    }
  }, [session]); // Intentionally omit fetchTodosIfNeeded

  // Effect to refetch data when window becomes visible (throttled)
  useEffect(() => {
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

  // Function to add a new todo item via backend
  const addTodo = async (title: string, due_date?: string | null) => {
    if (!session) {
      setError("You must be logged in to add todos.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/todos/manual", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, due_date: due_date || null }),
      });
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          /* Ignore error parsing error body */
        }
        throw new Error(errorMsg);
      }
      // Optimistic update (optional) or refetch
      // setTodos((prev) => [...prev, await response.json()]); // Needs type assertion
      await fetchTodos(); // Simple refetch for now
    } catch (e) {
      console.error("Failed to add todo:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to delete a todo item by ID via backend
  const deleteTodo = async (id: string) => {
    if (!session) {
      setError("You must be logged in to delete todos.");
      return;
    }
    // Optimistic update (optional)
    // const originalTodos = [...todos];
    // setTodos((prev) => prev.filter((todo) => todo.id !== id));
    setIsLoading(true); // Indicate activity
    setError(null);
    try {
      const response = await fetch(`/api/todos/manual/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        // setTodos(originalTodos); // Revert optimistic update on error
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          /* Ignore error parsing error body */
        }
        throw new Error(errorMsg);
      }
      // Refetch if not doing optimistic update, or just confirm success
      await fetchTodos(); // Refetch to confirm deletion
    } catch (e) {
      // setTodos(originalTodos); // Revert optimistic update on error
      console.error("Failed to delete todo:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      await fetchTodos(); // Refetch even on error
    } finally {
      setIsLoading(false);
    }
  };

  // Function to toggle the completion status via backend
  const toggleTodo = async (id: string) => {
    if (!session) {
      setError("You must be logged in to toggle todos.");
      return;
    }
    // Optimistic update (optional)
    // const originalTodos = [...todos];
    // setTodos((prev) => prev.map((t) => t.id === id ? { ...t, is_completed: !t.is_completed } : t));
    setIsLoading(true); // Indicate activity
    setError(null);
    try {
      const response = await fetch(`/api/todos/manual/${id}/toggle`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        // setTodos(originalTodos); // Revert optimistic update
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          /* Ignore error parsing error body */
        }
        throw new Error(errorMsg);
      }
      // Update state with response or refetch
      // const updatedTodo = await response.json();
      // setTodos((prev) => prev.map((t) => t.id === id ? updatedTodo : t));
      await fetchTodos(); // Simple refetch
    } catch (e) {
      // setTodos(originalTodos); // Revert optimistic update
      console.error("Failed to toggle todo:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      await fetchTodos(); // Refetch even on error
    } finally {
      setIsLoading(false);
    }
  };

  // Provide the context value to children
  const value = {
    todos,
    isLoading,
    error,
    fetchTodos,
    addTodo,
    deleteTodo,
    toggleTodo,
    fetchTodosIfNeeded, // Add throttled fetch
  };

  return (
    <TodosContext.Provider value={value}>{children}</TodosContext.Provider>
  );
};

// Custom hook to use the Todos context
export const useTodos = (): TodosContextType => {
  const context = useContext(TodosContext);
  if (context === undefined) {
    throw new Error("useTodos must be used within a TodosProvider");
  }
  return context;
};
