import React, { useState, useRef, useEffect } from "react";
import {
  Trash,
  Pencil,
  Save,
  XCircle,
  GripVertical,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { NestedTodoItem } from "@/contexts/TodosContext"; // Import NestedTodoItem type
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

// --- Constants ---
const MAX_TODO_LEVEL = 2;

// --- Interface ---
export interface TodoListItemProps {
  todo: NestedTodoItem;
  level: number;
  isToggling: boolean;
  isLoading: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEditSave: (id: string, newTitle: string) => void;
  onAddSubItem: (title: string, parentId: string) => void;
  onBreakdown: (id: string) => void;
  renderChildren: (items: NestedTodoItem[], level: number) => React.ReactNode;
  isExpanded: boolean; // Added prop
  onToggleExpand: (id: string) => void; // Added prop
}

// --- Component ---
export const TodoListItem: React.FC<TodoListItemProps> = ({
  todo,
  level,
  isToggling,
  isLoading,
  onToggle,
  onDelete,
  onEditSave,
  onAddSubItem,
  onBreakdown,
  renderChildren,
  isExpanded, // Use prop
  onToggleExpand, // Use prop
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.title);
  // Removed local isExpanded state
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  // Style for the outer li (handles dragging transform and indentation via margin)
  const liStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${level * 1.5}rem`, // Use margin for indentation
  };

  // Style for the inner content div (handles visual appearance)
  const contentStyle = {
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditText(todo.title);
    setIsEditing(true);
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editText.trim() && editText.trim() !== todo.title) {
      onEditSave(todo.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === "Enter") {
      if (editText.trim() && editText.trim() !== todo.title) {
        onEditSave(todo.id, editText.trim());
      }
      setIsEditing(false);
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  // Use the passed-in handler
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(todo.id); // Call handler from props
  };

  const handleAddSubClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddSubItem("New Sub-item", todo.id);
    // Removed setIsExpanded(true); Parent handles expansion via context handler
  };

  const handleBreakdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBreakdown(todo.id);
    // Removed setIsExpanded(true); Parent handles expansion via context handler
  };

  const canHaveChildren = level < MAX_TODO_LEVEL;
  const hasChildren = todo.children && todo.children.length > 0;

  // Define border color based on level for the inner div
  const levelBorderClass =
    level === 1
      ? "border-l-2 border-l-slate-300 dark:border-l-slate-600"
      : level === 2
      ? "border-l-2 border-l-slate-400 dark:border-l-slate-500"
      : ""; // Level 0 has no extra left border thickness/color

  return (
    <>
      {/* Outer li for DnD and indentation */}
      <li ref={setNodeRef} style={liStyle} className="list-none relative">
        {/* Inner div for content box, background, border, padding */}
        <div
          style={contentStyle}
          className={cn(
            "flex items-center py-1 pr-1.5 pl-1 border border-gray-200 dark:border-gray-700 rounded-md group transition-colors bg-white dark:bg-gray-800",
            levelBorderClass, // Add conditional left border class
            isDragging && "shadow-lg",
            todo.isNew && "animate-fade-in-down" // Apply animation if new
          )}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={handleToggleExpand}
              disabled={isEditing}
              className={cn(
                "flex-shrink-0 p-1 mr-1 rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed",
                "bg-transparent border-none focus:outline-none focus:ring-0 w-6 h-6 flex items-center justify-center"
              )}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
          ) : (
            // Placeholder to align content when no expand button exists
            <div className="w-6 h-6 mr-1 flex-shrink-0"></div>
          )}

          {/* Checkbox */}
          <input
            type="checkbox"
            onClick={(e) => e.stopPropagation()}
            checked={todo.is_completed}
            onChange={() => onToggle(todo.id)}
            disabled={isLoading || isToggling || isEditing}
            className="h-3.5 w-3.5 text-blue-600 dark:text-blue-500 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-600 bg-white dark:bg-gray-700 mr-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {/* Title or Edit Input */}
          {isEditing ? (
            <Input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={() => setIsEditing(false)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 h-6 px-1 py-0 text-sm border-blue-500 ring-1 ring-blue-500 rounded focus:outline-none"
              disabled={isLoading}
            />
          ) : (
            <span
              onClick={handleEditClick}
              className={cn(
                "flex-1 text-sm cursor-text",
                todo.is_completed
                  ? "line-through text-gray-400 dark:text-gray-500"
                  : "text-gray-700 dark:text-gray-300"
              )}
            >
              {todo.title}
            </span>
          )}

          {/* Action Buttons */}
          <div className="flex items-center ml-auto pl-1 flex-shrink-0 space-x-0.5">
            {isEditing ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSaveClick}
                  disabled={isLoading || !editText.trim()}
                  className="h-6 w-6 p-1 text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save"
                >
                  {" "}
                  <Save size={14} />{" "}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancelClick}
                  disabled={isLoading}
                  className="h-6 w-6 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Cancel"
                >
                  {" "}
                  <XCircle size={14} />{" "}
                </Button>
              </>
            ) : (
              <>
                {canHaveChildren && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleAddSubClick}
                    disabled={isLoading || isToggling}
                    className="h-6 w-6 p-1 text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-green-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                    title="Add sub-item"
                  >
                    {" "}
                    <PlusCircle size={14} />{" "}
                  </Button>
                )}
                {canHaveChildren && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBreakdownClick}
                    disabled={isLoading || isToggling}
                    className="h-6 w-6 p-1 text-gray-400 dark:text-gray-500 hover:text-purple-500 dark:hover:text-purple-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                    title="Break down task"
                  >
                    {" "}
                    <Sparkles size={14} />{" "}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  {...attributes}
                  {...listeners}
                  disabled={isLoading || isToggling}
                  aria-label="Drag to reorder"
                  className="h-6 w-6 p-1 cursor-grab touch-none text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                  title="Drag to reorder"
                >
                  {" "}
                  <GripVertical size={14} />{" "}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEditClick}
                  disabled={isLoading || isToggling}
                  className="h-6 w-6 p-1 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                  title="Edit"
                >
                  {" "}
                  <Pencil size={14} />{" "}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(todo.id);
                  }}
                  disabled={isLoading || isToggling}
                  className="h-6 w-6 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                  title="Delete"
                >
                  {" "}
                  <Trash size={14} />{" "}
                </Button>
              </>
            )}
          </div>
        </div>
      </li>
      {/* Render Children with Animation Wrapper - outside the inner content div */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {hasChildren && (
          <ul className="list-none pl-0 m-0 space-y-1.5 pt-1.5">
            {renderChildren(todo.children, level + 1)}
          </ul>
        )}
      </div>
    </>
  );
};
