import React, { useState } from "react";
import { useTodos } from "@/contexts/TodosContext";
import { Button } from "@/components/ui/button";
// Removed non-existent Checkbox import

export function TodosDataSource() {
  const { todos, addTodo, deleteTodo, toggleTodo } = useTodos();
  const [newTodoText, setNewTodoText] = useState("");

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodoText.trim()) {
      addTodo(newTodoText.trim());
      setNewTodoText("");
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 h-full overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-4">Todos Data Source</h2>

      <form
        onSubmit={handleAddTodo}
        className="mb-6 p-4 border rounded dark:border-gray-700"
      >
        <h3 className="text-lg font-medium mb-2">Add New Todo</h3>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Todo text..."
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            required
            className="flex-grow p-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-600"
          />
          <Button type="submit">Add Todo</Button>
        </div>
      </form>

      <div>
        <h3 className="text-lg font-medium mb-2">Existing Todos</h3>
        {todos.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No todos found.</p>
        ) : (
          <ul className="space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  {/* Using standard HTML checkbox */}
                  <input
                    type="checkbox"
                    id={`todo-${todo.id}`}
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label
                    htmlFor={`todo-${todo.id}`}
                    className={`flex-grow ${
                      todo.completed
                        ? "line-through text-gray-500 dark:text-gray-400"
                        : ""
                    }`}
                  >
                    {todo.text}
                  </label>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteTodo(todo.id)}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
