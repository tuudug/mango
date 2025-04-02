import React from "react";
import {
  Trash,
  Pencil,
  GripVertical,
  PlusCircle,
  Sparkles,
  ArrowUpCircle, // Import new icons
  ArrowDownCircle, // Import new icons
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DraggableAttributes } from "@dnd-kit/core";
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

interface TodoItemActionsProps {
  todoId: string;
  level: number; // Need level to conditionally show buttons
  isEditing: boolean;
  isLoading: boolean;
  isToggling: boolean;
  canHaveChildren: boolean;
  onEditClick: (e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  onAddSubClick: (e: React.MouseEvent) => void;
  onBreakdownClick: (e: React.MouseEvent) => void;
  onMoveUp: (id: string) => void; // New handler prop
  onMoveDown: (id: string) => void; // New handler prop
  dndAttributes: DraggableAttributes;
  dndListeners: SyntheticListenerMap | undefined;
}

export const TodoItemActions: React.FC<TodoItemActionsProps> = ({
  todoId,
  level, // Get level
  isEditing,
  isLoading,
  isToggling,
  canHaveChildren,
  onEditClick,
  onDelete,
  onAddSubClick,
  onBreakdownClick,
  onMoveUp, // Get new handlers
  onMoveDown, // Get new handlers
  dndAttributes,
  dndListeners,
}) => {
  return (
    <div className="flex items-center ml-auto pl-1 flex-shrink-0 space-x-0.5">
      {isEditing ? (
        <>{/* Save and Cancel buttons are removed. Form handles this now. */}</>
      ) : (
        <>
          {/* Buttons shown when NOT editing */}
          {level > 0 && ( // Only show Move buttons for nested items
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp(todoId);
                }}
                disabled={isLoading || isToggling}
                className="h-6 w-6 p-1 text-gray-400 dark:text-gray-500 hover:text-sky-500 dark:hover:text-sky-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                title="Move Up"
              >
                <ArrowUpCircle size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown(todoId);
                }}
                disabled={isLoading || isToggling}
                className="h-6 w-6 p-1 text-gray-400 dark:text-gray-500 hover:text-sky-500 dark:hover:text-sky-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                title="Move Down"
              >
                <ArrowDownCircle size={14} />
              </Button>
            </>
          )}
          {canHaveChildren && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onAddSubClick}
              disabled={isLoading || isToggling}
              className="h-6 w-6 p-1 text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-green-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
              title="Add sub-item"
            >
              <PlusCircle size={14} />
            </Button>
          )}
          {canHaveChildren && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBreakdownClick}
              disabled={isLoading || isToggling}
              className="h-6 w-6 p-1 text-gray-400 dark:text-gray-500 hover:text-purple-500 dark:hover:text-purple-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
              title="Break down task"
            >
              <Sparkles size={14} />
            </Button>
          )}
          {level === 0 && ( // Only show Drag handle for top-level items
            <Button
              variant="ghost"
              size="icon"
              {...dndAttributes}
              {...dndListeners}
              disabled={isLoading || isToggling}
              aria-label="Drag to reorder"
              className="h-6 w-6 p-1 cursor-grab touch-none text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
              title="Drag to reorder"
            >
              <GripVertical size={14} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onEditClick}
            disabled={isLoading || isToggling}
            className="h-6 w-6 p-1 text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
            title="Edit"
          >
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(todoId); // Use todoId passed as prop
            }}
            disabled={isLoading || isToggling}
            className="h-6 w-6 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
            title="Delete"
          >
            <Trash size={14} />
          </Button>
        </>
      )}
    </div>
  );
};
