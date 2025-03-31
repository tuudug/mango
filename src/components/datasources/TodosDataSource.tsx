import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card"; // Import Shadcn Card components
import { Checkbox } from "@/components/ui/checkbox"; // Import Shadcn Checkbox
import { Input } from "@/components/ui/input"; // Import Shadcn Input
import { Label } from "@/components/ui/label"; // Import Shadcn Label
import { useTodos } from "@/contexts/TodosContext";
import { ListChecks, X } from "lucide-react"; // Import icons
import React, { useState } from "react";

// Define props including onClose
interface TodosDataSourceProps {
  onClose?: () => void; // Make onClose optional
}

export function TodosDataSource({ onClose }: TodosDataSourceProps) {
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
    // Use Card as the main container, match panel background, remove rounding
    <Card className="h-full flex flex-col shadow-lg border-l bg-white dark:bg-gray-800 rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b flex-shrink-0 dark:border-gray-700">
        {" "}
        {/* Added dark border */}
        <div className="flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-green-500 dark:text-green-400" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Todos Data
          </h2>
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
            />
            <Button type="submit" size="sm">
              Add Todo
            </Button>
          </div>
        </form>

        {/* Existing Todos List */}
        <div className="space-y-3">
          <h3 className="text-base font-medium">Existing Todos</h3>
          {todos.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No todos found.
            </p>
          ) : (
            <ul className="space-y-2">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  {/* Use Shadcn Checkbox and Label */}
                  <div className="flex items-center space-x-3 flex-grow mr-2">
                    <Checkbox
                      id={`todo-${todo.id}`}
                      checked={todo.completed}
                      onCheckedChange={() => toggleTodo(todo.id)} // Use onCheckedChange
                      aria-label={`Mark ${todo.text} as ${
                        todo.completed ? "incomplete" : "complete"
                      }`}
                    />
                    <Label
                      htmlFor={`todo-${todo.id}`}
                      className={`text-sm flex-grow ${
                        todo.completed
                          ? "line-through text-gray-500 dark:text-gray-400"
                          : ""
                      }`}
                    >
                      {todo.text}
                    </Label>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTodo(todo.id)}
                    className="flex-shrink-0"
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
