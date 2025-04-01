import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import CardTitle
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTodos } from "@/contexts/TodosContext";
import { ListChecks, X, Trash2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { addMinutes, differenceInSeconds } from "date-fns"; // Import more date-fns

// Define props including onClose
interface TodosDataSourceProps {
  onClose?: () => void; // Make onClose optional
}

export function TodosDataSource({ onClose }: TodosDataSourceProps) {
  // Use refactored context
  const {
    todos,
    isLoading,
    error,
    addTodo,
    deleteTodo,
    toggleTodo,
    lastFetchTime, // Get last fetch time
    fetchTodosIfNeeded, // Get throttled fetch
  } = useTodos();
  const [newTodoText, setNewTodoText] = useState("");
  const [nextSyncCountdown, setNextSyncCountdown] = useState<string>(""); // State for countdown

  // Countdown timer effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const updateCountdown = () => {
      if (lastFetchTime) {
        const nextSyncTime = addMinutes(lastFetchTime, 5); // 5 minutes after last fetch
        const now = new Date();
        const secondsRemaining = differenceInSeconds(nextSyncTime, now);

        if (secondsRemaining > 0) {
          const minutes = Math.floor(secondsRemaining / 60);
          const seconds = secondsRemaining % 60;
          setNextSyncCountdown(
            `${minutes}m ${seconds < 10 ? "0" : ""}${seconds}s`
          );
        } else {
          setNextSyncCountdown("now");
          if (intervalId) clearInterval(intervalId);
        }
      } else {
        setNextSyncCountdown("");
        if (intervalId) clearInterval(intervalId);
      }
    };

    updateCountdown();
    intervalId = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [lastFetchTime]);

  const handleAddTodo = async (e: React.FormEvent) => {
    // Make async
    e.preventDefault();
    if (newTodoText.trim()) {
      // Call async context function
      await addTodo(newTodoText.trim()); // Pass only title for now
      setNewTodoText("");
      // setNewTodoDueDate(null); // Reset due date if using
    }
  };

  // Handlers now call async context functions directly
  const handleDeleteTodo = async (id: string) => {
    await deleteTodo(id);
  };

  const handleToggleTodo = async (id: string) => {
    await toggleTodo(id);
  };

  return (
    // Use Card as the main container, match panel background, remove rounding
    <Card className="h-full flex flex-col shadow-lg border-l bg-white dark:bg-gray-800 rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b flex-shrink-0 dark:border-gray-700">
        {" "}
        {/* Added dark border */}
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-green-500 dark:text-green-400" />
          {/* Use CardTitle */}
          <CardTitle className="text-lg font-semibold">Todos Data</CardTitle>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X size={16} />
            <span className="sr-only">Close Panel</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-4 overflow-y-auto space-y-6">
        {/* Add Todo Form */}
        <form onSubmit={handleAddTodo} className="space-y-3">
          <h3 className="text-base font-medium">Add New Todo</h3>
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="Todo text..."
              value={newTodoText}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewTodoText(e.target.value)
              }
              required
              className="flex-grow p-2"
              disabled={isLoading} // Disable when loading
            />
            {/* Optional: Add Due Date Input Here */}
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Todo"}
            </Button>
          </div>
        </form>

        {/* Display Error if any */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Error: {error}
          </p>
        )}

        {/* Existing Todos List */}
        <div className="space-y-3">
          <h3 className="text-base font-medium">Existing Todos</h3>
          {isLoading && todos.length === 0 && (
            <p className="text-sm text-gray-500">Loading todos...</p>
          )}
          {!isLoading && todos.length === 0 && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No todos found. Add one above.
            </p>
          )}
          {todos.length > 0 && (
            <ul className="space-y-2">
              {todos.map((todo) => (
                <li
                  key={todo.id} // Use ID from backend
                  className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-700 shadow-sm gap-2" // Added gap
                >
                  {/* Checkbox and Label */}
                  <div className="flex items-center space-x-3 flex-grow mr-2">
                    <Checkbox
                      id={`todo-${todo.id}`}
                      checked={todo.is_completed} // Use is_completed
                      onCheckedChange={() => handleToggleTodo(todo.id)} // Use handler
                      aria-label={`Mark ${todo.title} as ${
                        // Use title
                        todo.is_completed ? "incomplete" : "complete"
                      }`}
                      disabled={isLoading} // Disable when loading
                    />
                    <Label
                      htmlFor={`todo-${todo.id}`}
                      className={`text-sm flex-grow ${
                        todo.is_completed // Use is_completed
                          ? "line-through text-gray-500 dark:text-gray-400"
                          : ""
                      }`}
                    >
                      {todo.title} {/* Use title */}
                      {/* Optional: Display due date */}
                      {/* {todo.due_date && <span className="text-xs ml-2 text-gray-400">({todo.due_date})</span>} */}
                    </Label>
                  </div>
                  {/* Delete Button */}
                  <Button
                    variant="ghost" // Changed to ghost
                    size="icon"
                    className="h-6 w-6 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50 flex-shrink-0" // Smaller icon button
                    onClick={() => handleDeleteTodo(todo.id)} // Use handler
                    disabled={isLoading}
                    aria-label="Delete todo"
                  >
                    <Trash2 size={14} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sync Status Footer */}
        <div className="mt-auto pt-2 border-t dark:border-gray-700 text-center">
          {isLoading ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Syncing...
            </p>
          ) : lastFetchTime && nextSyncCountdown ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Next sync in: {nextSyncCountdown}
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Not synced yet.
            </p>
          )}
          {/* Optional Refresh Button */}
          {/* <Button variant="link" size="sm" onClick={fetchTodosIfNeeded} disabled={isLoading}>Refresh</Button> */}
        </div>
      </CardContent>
    </Card>
  );
}
