import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components
import { DraggableAttributes } from "@dnd-kit/core";
import { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  GripVertical,
  PlusCircle,
  Sparkles,
  Trash,
} from "lucide-react";
import React from "react";

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
  onEditClick: _onEditClick,
  onDelete,
  onAddSubClick,
  onBreakdownClick,
  onMoveUp, // Get new handlers
  onMoveDown, // Get new handlers
  dndAttributes,
  dndListeners,
}) => {
  return (
    // Wrap the entire action area with TooltipProvider
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center ml-auto pl-1 flex-shrink-0 space-x-0.5">
        {isEditing ? (
          <>
            {/* Save and Cancel buttons are removed. Form handles this now. */}
          </>
        ) : (
          <>
            {/* Buttons shown when NOT editing */}
            {level > 0 && ( // Only show Move buttons for nested items
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveUp(todoId);
                      }}
                      disabled={isLoading || isToggling}
                      className="h-6 w-6 p-1 text-gray-500 hover:text-sky-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                      // title removed
                    >
                      <ArrowUpCircle size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Move Up</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveDown(todoId);
                      }}
                      disabled={isLoading || isToggling}
                      className="h-6 w-6 p-1 text-gray-500 hover:text-sky-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                      // title removed
                    >
                      <ArrowDownCircle size={14} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Move Down</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
            {canHaveChildren && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onAddSubClick}
                    disabled={isLoading || isToggling}
                    className="h-6 w-6 p-1 text-gray-500 hover:text-green-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                    // title removed
                  >
                    <PlusCircle size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add sub-item</p>
                </TooltipContent>
              </Tooltip>
            )}
            {canHaveChildren && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBreakdownClick}
                    disabled={isLoading || isToggling}
                    className="h-6 w-6 p-1 text-gray-500 hover:text-purple-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                    // title removed
                  >
                    <Sparkles size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Break down task</p>
                </TooltipContent>
              </Tooltip>
            )}
            {level === 0 && ( // Only show Drag handle for top-level items
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    {...dndAttributes}
                    {...dndListeners}
                    disabled={isLoading || isToggling}
                    aria-label="Drag to reorder"
                    className="h-6 w-6 p-1 cursor-grab touch-none text-gray-500 hover:text-gray-300 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                    // title removed
                  >
                    <GripVertical size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Drag to reorder</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(todoId); // Use todoId passed as prop
                  }}
                  disabled={isLoading || isToggling}
                  className="h-6 w-6 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:enabled:opacity-100 transition-opacity disabled:cursor-not-allowed"
                  // title removed
                >
                  <Trash size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};
