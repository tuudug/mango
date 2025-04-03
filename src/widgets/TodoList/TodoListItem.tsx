import { NestedTodoItem, useTodos } from "@/contexts/TodosContext";
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight } from "lucide-react";
import React, { useState } from "react";
import { TodoItemActions } from "./TodoItemActions";
import { TodoItemEditForm } from "./TodoItemEditForm";

// --- Custom Hook for Editing State ---
const useTodoItemEditing = (
  todoId: string,
  onSaveCallback: (id: string, newTitle: string) => void
) => {
  const [isEditing, setIsEditing] = useState(false);

  const startEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsEditing(true);
  };

  const cancelEditing = (e?: React.MouseEvent | React.FocusEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
  };

  const saveEdit = (newTitle: string) => {
    onSaveCallback(todoId, newTitle);
    setIsEditing(false);
  };

  return {
    isEditing,
    startEditing,
    cancelEditing,
    saveEdit,
  };
};

// --- Constants ---
const MAX_TODO_LEVEL = 2;

// --- Interface ---
export interface TodoListItemProps {
  todo: NestedTodoItem;
  level: number;
  isToggling: boolean;
  isLoading: boolean;
  onEditSave: (id: string, newTitle: string) => void;
  onAddSubItem: (title: string, parentId: string) => void;
  onBreakdown: (todo: NestedTodoItem) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  isItemExpanded: (id: string) => boolean;
  isDraggingTopLevel?: boolean; // Added optional prop for animation control
}

// --- Component ---
export const TodoListItem: React.FC<TodoListItemProps> = ({
  todo,
  level,
  isToggling,
  isLoading,
  onEditSave,
  onAddSubItem,
  onBreakdown,
  isExpanded,
  onToggleExpand,
  isItemExpanded,
  isDraggingTopLevel, // Receive prop
}) => {
  const { toggleTodo, deleteTodo: deleteTodoContext, moveTodo } = useTodos();

  const { isEditing, startEditing, cancelEditing, saveEdit } =
    useTodoItemEditing(todo.id, onEditSave);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id, disabled: level > 0 });

  const liStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${level * 1.5}rem`,
  };

  const contentStyle = {
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(todo.id);
  };

  const handleAddSubClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddSubItem("New Sub-item", todo.id);
  };

  const handleBreakdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBreakdown(todo);
  };

  const handleMoveUp = (id: string) => {
    moveTodo(id, "up");
  };

  const handleMoveDown = (id: string) => {
    moveTodo(id, "down");
  };

  const canHaveChildren = level < MAX_TODO_LEVEL;
  const hasChildren = todo.children && todo.children.length > 0;

  const levelBorderClass =
    level === 1
      ? "border-l-2 border-l-slate-600"
      : level === 2
      ? "border-l-2 border-l-slate-500"
      : "";

  return (
    <>
      <li ref={setNodeRef} style={liStyle} className="list-none relative">
        <div
          style={contentStyle}
          className={cn(
            "flex items-center py-1 pr-1.5 pl-1 border border-gray-700 rounded-md group transition-colors bg-gray-800",
            levelBorderClass,
            isDragging && "shadow-lg",
            todo.isNew && "animate-fade-in-down"
          )}
        >
          {hasChildren ? (
            <button
              onClick={handleToggleExpand}
              disabled={isEditing}
              className={cn(
                "flex-shrink-0 p-1 mr-1 rounded text-gray-500 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed",
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
            <div className="w-6 h-6 mr-1 flex-shrink-0"></div>
          )}

          <input
            type="checkbox"
            onClick={(e) => e.stopPropagation()}
            checked={todo.is_completed}
            onChange={() => toggleTodo(todo.id)}
            disabled={isLoading || isToggling || isEditing}
            className="h-3.5 w-3.5 text-blue-500 rounded border-gray-600 focus:ring-blue-600 bg-gray-700 mr-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {isEditing ? (
            <TodoItemEditForm
              initialTitle={todo.title}
              isLoading={isLoading}
              onSave={saveEdit}
              onCancel={cancelEditing}
            />
          ) : (
            <span
              onClick={startEditing}
              className={cn(
                "flex-1 text-sm cursor-text",
                todo.is_completed
                  ? "line-through text-gray-500"
                  : "text-gray-300"
              )}
            >
              {todo.title}
            </span>
          )}

          <TodoItemActions
            todoId={todo.id}
            level={level}
            isEditing={isEditing}
            isLoading={isLoading}
            isToggling={isToggling}
            canHaveChildren={canHaveChildren}
            onEditClick={startEditing}
            onDelete={deleteTodoContext}
            onAddSubClick={handleAddSubClick}
            onBreakdownClick={handleBreakdownClick}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            dndAttributes={attributes}
            dndListeners={listeners}
          />
        </div>
      </li>
      {/* Conditionally apply transition class based on dragging state */}
      <div
        className={cn(
          "overflow-hidden",
          !isDraggingTopLevel && "transition-all duration-300 ease-in-out", // Only animate if not dragging
          isExpanded ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {hasChildren && (
          <ul className="list-none pl-0 m-0 space-y-1.5 pt-1.5">
            {todo.children.map((child) => (
              <TodoListItem
                key={child.id}
                todo={child}
                level={level + 1}
                isToggling={isToggling}
                isLoading={isLoading}
                isExpanded={isItemExpanded(child.id)}
                onToggleExpand={onToggleExpand}
                isItemExpanded={isItemExpanded}
                onEditSave={onEditSave}
                onAddSubItem={onAddSubItem}
                onBreakdown={onBreakdown}
                isDraggingTopLevel={isDraggingTopLevel} // Pass down drag state
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
};
