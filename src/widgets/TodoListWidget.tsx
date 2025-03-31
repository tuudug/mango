import React, { useState } from "react"; // Removed useEffect import
import { Trash } from "lucide-react"; // Import the X icon

interface TodoListWidgetProps {
  id: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const TodoListWidget: React.FC<TodoListWidgetProps> = ({ id: _id }) => {
  // Prefix unused id
  // Use widget ID as part of localStorage key for persistence
  // const storageKey = `todo-widget-${id}`; // Removed storage key

  // Initialize todos with default values only
  const [todos, setTodos] = useState<Todo[]>([
    { id: "1", text: "Complete project proposal", completed: true },
    { id: "2", text: "Review code changes", completed: false },
    { id: "3", text: "Prepare for meeting", completed: false },
    { id: "4", text: "Update documentation", completed: false },
  ]);

  const [newTodoText, setNewTodoText] = useState("");

  // Removed useEffect hook for saving to localStorage

  // Toggle todo completion status
  const toggleTodo = (todoId: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  // Add a new todo
  const addTodo = () => {
    if (newTodoText.trim() === "") return;

    const newTodo: Todo = {
      id: Date.now().toString(),
      text: newTodoText,
      completed: false,
    };

    setTodos([...todos, newTodo]);
    setNewTodoText("");
  };

  // Delete a todo
  const deleteTodo = (todoId: string) => {
    setTodos(todos.filter((todo) => todo.id !== todoId));
  };

  // Handle key press in input field
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addTodo();
    }
  };

  // Calculate completion stats
  const completedCount = todos.filter((todo) => todo.completed).length;
  const totalCount = todos.length;
  const percentComplete =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    // Added dark mode classes
    <div className="p-2 h-full w-full flex flex-col text-sm text-gray-700 dark:text-gray-300">
      {/* Progress bar - Taller and with percentage inside */}
      <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full mb-2 overflow-hidden">
        {" "}
        {/* Increased height, added relative, overflow-hidden */}
        {/* Progress Fill */}
        <div
          className="absolute top-0 left-0 h-full bg-green-500 dark:bg-green-600 rounded-full transition-all duration-500 ease-in-out" // Added absolute positioning
          style={{ width: `${percentComplete}%` }}
        ></div>
        {/* Percentage Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* White text with subtle black shadow for contrast */}
          <span
            className="text-xs font-medium text-white"
            style={{ textShadow: "0px 0px 3px rgba(0, 0, 0, 0.7)" }} // Added text shadow
          >
            {percentComplete}%
          </span>
        </div>
      </div>
      {/* Todo input */}
      <div className="flex mb-2">
        {" "}
        {/* Reduced margin */}
        <input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="↵ Quick todo"
          // Dark mode input
          className="flex-1 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>
      {/* Todo list */}
      <div className="flex-1 overflow-y-auto pr-1">
        {" "}
        {/* Added padding-right for scrollbar */}
        <ul className="space-y-1.5">
          {" "}
          {/* Reduced spacing */}
          {todos.map((todo) => (
            <li
              key={todo.id}
              onClick={() => toggleTodo(todo.id)} // Add onClick to the whole item
              // Dark mode list item
              className="flex items-center py-1 px-1.5 border border-gray-200 dark:border-gray-700 rounded-md group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer" // Adjusted hover colors
            >
              <input
                type="checkbox"
                // Stop propagation on checkbox click to avoid double toggle (optional but cleaner)
                onClick={(e) => e.stopPropagation()}
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-gray-700 mr-2" // Dark mode checkbox
              />
              <span
                className={`flex-1 text-sm ${
                  // Dark mode text color
                  /* Kept text-sm */
                  todo.completed
                    ? "line-through text-gray-400 dark:text-gray-500"
                    : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {todo.text}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent li onClick from firing
                  deleteTodo(todo.id);
                }}
                className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0 p-0.5" // Added padding for click area
              >
                <Trash size={14} /> {/* Replaced SVG with Lucide icon */}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {todos.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm italic">
          No tasks yet. Add one above!
        </div>
      )}
    </div>
  );
};
