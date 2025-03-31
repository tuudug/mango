import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";

// Define the structure of a todo item
export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

// Define the shape of the context data
interface TodosContextType {
  todos: TodoItem[];
  addTodo: (text: string) => void;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
}

// Create the context with a default value
const TodosContext = createContext<TodosContextType | undefined>(undefined);

// Define the props for the provider component
interface TodosProviderProps {
  children: ReactNode;
}

// Create the provider component
export const TodosProvider: React.FC<TodosProviderProps> = ({ children }) => {
  const [todos, setTodos] = useState<TodoItem[]>(() => {
    const savedTodos = localStorage.getItem("todosData");
    return savedTodos ? JSON.parse(savedTodos) : [];
  });

  // Persist todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("todosData", JSON.stringify(todos));
  }, [todos]);

  // Function to add a new todo item
  const addTodo = (text: string) => {
    const newTodo: TodoItem = {
      id: crypto.randomUUID(),
      text,
      completed: false,
    };
    setTodos((prevTodos) => [...prevTodos, newTodo]);
  };

  // Function to delete a todo item by ID
  const deleteTodo = (id: string) => {
    setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
  };

  // Function to toggle the completion status of a todo item
  const toggleTodo = (id: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // Provide the context value to children
  const value = { todos, addTodo, deleteTodo, toggleTodo };

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
