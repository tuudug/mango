import React, { useState, useEffect } from "react";

interface TodoListWidgetProps {
  id: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export const TodoListWidget: React.FC<TodoListWidgetProps> = ({ id }) => {
  // Use widget ID as part of localStorage key for persistence
  const storageKey = `todo-widget-${id}`;

  // Initialize todos from localStorage if available, otherwise use defaults
  const [todos, setTodos] = useState<Todo[]>(() => {
    const savedTodos = localStorage.getItem(storageKey);
    return savedTodos
      ? JSON.parse(savedTodos)
      : [
          { id: "1", text: "Complete project proposal", completed: true },
          { id: "2", text: "Review code changes", completed: false },
          { id: "3", text: "Prepare for meeting", completed: false },
          { id: "4", text: "Update documentation", completed: false },
        ];
  });

  const [newTodoText, setNewTodoText] = useState("");

  // Save todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(todos));
  }, [todos, storageKey]);

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
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-base">
          To-do List
        </h3>
        <div className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
          {completedCount}/{totalCount} ({percentComplete}%)
        </div>
      </div>
      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full mb-2">
        {" "}
        {/* Dark mode bg */}
        <div
          className="h-full bg-green-500 dark:bg-green-600 rounded-full transition-all duration-500 ease-in-out" // Dark mode progress color
          style={{ width: `${percentComplete}%` }}
        ></div>
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
          placeholder="New task..."
          // Dark mode input
          className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
        <button
          onClick={addTodo}
          className="px-2 py-1 bg-blue-500 dark:bg-blue-600 text-white rounded-r-md hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors text-sm" // Dark mode button
        >
          Add
        </button>
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
              // Dark mode list item
              className="flex items-center p-1.5 border border-gray-200 dark:border-gray-700 rounded-md group hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <input
                type="checkbox"
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
                onClick={() => deleteTodo(todo.id)}
                className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" // Dark mode delete icon color
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5" /* Smaller icon */
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
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
      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-right">
        Widget ID: {id.slice(0, 8)}
      </div>
    </div>
  );
};
