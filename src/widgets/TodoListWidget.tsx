import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingBar } from "@/components/ui/loading-bar";
import { NestedTodoItem, useTodos } from "@/contexts/TodosContext"; // Import useTodos hook and types
import { cn } from "@/lib/utils"; // Import cn utility
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  PlusCircle,
  Save,
  Sparkles,
  Trash,
  XCircle,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

// --- Constants ---
const MAX_TODO_LEVEL = 2;

// --- Individual Todo Item Component (Recursive) ---
interface TodoListItemProps {
  todo: NestedTodoItem; // Use NestedTodoItem type
  level: number; // Pass level for indentation
  isToggling: boolean;
  isLoading: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEditSave: (id: string, newTitle: string) => void;
  onAddSubItem: (title: string, parentId: string) => void;
  onBreakdown: (id: string) => void; // Callback for magic breakdown
  renderChildren: (items: NestedTodoItem[], level: number) => React.ReactNode; // Function to render children
}

const TodoListItem: React.FC<TodoListItemProps> = ({
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
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.title);
  const [isExpanded, setIsExpanded] = useState(true); // Default to expanded
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    // Apply indentation directly to the li element's padding
    paddingLeft: `${level * 1.5 + 0.25}rem`, // Increased multiplier (1.5) for indentation
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

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleAddSubClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddSubItem("New Sub-item", todo.id);
    setIsExpanded(true);
  };

  const handleBreakdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onBreakdown(todo.id);
    setIsExpanded(true);
  };

  const canHaveChildren = level < MAX_TODO_LEVEL;
  const hasChildren = todo.children && todo.children.length > 0;

  return (
    <>
      <li
        ref={setNodeRef}
        style={style} // Apply style with paddingLeft for indentation
        className={cn(
          "flex items-center py-1 pr-1.5 border border-gray-200 dark:border-gray-700 rounded-md group transition-colors relative bg-white dark:bg-gray-800", // Removed pl-1
          isDragging && "shadow-lg"
        )}
      >
        {/* Expand/Collapse Button - Conditionally Rendered & Styled */}
        {hasChildren ? (
          <button
            onClick={handleToggleExpand}
            disabled={isEditing}
            className={cn(
              "flex-shrink-0 p-1 mr-1 rounded text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed",
              "bg-transparent border-none focus:outline-none focus:ring-0 w-6 h-6 flex items-center justify-center" // Explicit size and style reset
            )}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        ) : // Render nothing if no children, indentation is handled by li padding
        null}

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
            onClick={handleEditClick} // Edit on text click
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
              {/* Add Sub-item Button */}
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
              {/* Magic Breakdown Button */}
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
              {/* Drag Handle */}
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
              {/* Edit Button */}
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
              {/* Delete Button */}
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
      </li>
      {/* Render Children with Animation Wrapper */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded ? "max-h-[999px] opacity-100" : "max-h-0 opacity-0" // Animate max-height and opacity
        )}
      >
        {hasChildren && ( // Only render ul if children exist
          <ul className="list-none pl-0 m-0 space-y-1.5 pt-1.5">
            {" "}
            {/* Added pt-1.5 for spacing */}
            {renderChildren(todo.children, level + 1)}
          </ul>
        )}
      </div>
    </>
  );
};

// --- Main Widget Component ---
interface TodoListWidgetProps {
  id: string;
}

export const TodoListWidget: React.FC<TodoListWidgetProps> = ({ id: _id }) => {
  const {
    nestedTodos,
    isLoading,
    error,
    addTodo: addTodoContext,
    deleteTodo,
    toggleTodo,
    editTodo,
    reorderTodos,
    breakdownTodo,
    togglingTodoId,
  } = useTodos();

  const [newTodoText, setNewTodoText] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddTopLevelTodo = () => {
    if (newTodoText.trim() === "") return;
    addTodoContext(newTodoText.trim(), null);
    setNewTodoText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddTopLevelTodo();
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      let parentId: string | null = null;
      let siblings: NestedTodoItem[] = [];

      const findSiblings = (
        items: NestedTodoItem[],
        idToFind: string
      ): boolean => {
        for (const item of items) {
          if (item.id === idToFind) {
            siblings = items;
            return true;
          }
          if (item.children && item.children.length > 0) {
            if (findSiblings(item.children, idToFind)) {
              parentId = item.id;
              return true;
            }
          }
        }
        return false;
      };

      findSiblings(nestedTodos, active.id as string);

      const oldIndex = siblings.findIndex((t) => t.id === active.id);
      const newIndex = siblings.findIndex((t) => t.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrderedIds = arrayMove(siblings, oldIndex, newIndex).map(
          (t) => t.id
        );
        reorderTodos(parentId, newOrderedIds);
      } else {
        console.warn(
          "Could not determine siblings for drag and drop",
          active.id,
          over.id
        );
      }
    }
  };

  // Recursive rendering function needs to handle SortableContext per level
  const renderTodoList = (
    items: NestedTodoItem[],
    level: number
  ): React.ReactNode => {
    return (
      <SortableContext
        items={items.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((todo) => (
          <TodoListItem
            key={todo.id}
            todo={todo}
            level={level}
            isToggling={togglingTodoId === todo.id}
            isLoading={isLoading}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onEditSave={editTodo}
            onAddSubItem={addTodoContext}
            onBreakdown={breakdownTodo}
            renderChildren={renderTodoList}
          />
        ))}
      </SortableContext>
    );
  };

  // Calculate completion stats
  const { completed: completedCount, total: totalCount } = useMemo(() => {
    const calculateStats = (
      items: NestedTodoItem[]
    ): { completed: number; total: number } => {
      let completed = 0;
      let total = 0;
      items.forEach((item) => {
        total++;
        if (item.is_completed) completed++;
        if (item.children && item.children.length > 0) {
          const childStats = calculateStats(item.children);
          completed += childStats.completed;
          total += childStats.total;
        }
      });
      return { completed, total };
    };

    return calculateStats(nestedTodos);
  }, [nestedTodos]);
  const percentComplete =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="p-2 h-full w-full flex flex-col text-sm text-gray-700 dark:text-gray-300">
      {/* Header Area */}
      <div className="flex-shrink-0 mb-2">
        <LoadingBar isLoading={isLoading} colorClassName="bg-yellow-500" />
      </div>

      {/* Progress bar */}
      <div className="relative w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full mb-2 overflow-hidden flex-shrink-0">
        <div
          className="absolute top-0 left-0 h-full bg-green-500 dark:bg-green-600 rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${percentComplete}%` }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-xs font-medium text-white"
            style={{ textShadow: "0px 0px 3px rgba(0, 0, 0, 0.7)" }}
          >
            {percentComplete}%
          </span>
        </div>
      </div>

      {/* Todo input */}
      <div className="flex mb-2 flex-shrink-0">
        <Input
          type="text"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="↵ Quick todo"
          disabled={isLoading}
          className="flex-1 h-8 px-2 py-1 text-sm"
        />
      </div>

      {/* Todo list area */}
      <div className="flex-1 overflow-y-auto pr-1 relative custom-scrollbar-yellow">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          {/* Render top-level items using the recursive function */}
          {/* Removed outer SortableContext, handled within renderTodoList */}
          <ul className="space-y-1.5 list-none p-0 m-0">
            {renderTodoList(nestedTodos, 0)}
          </ul>
        </DndContext>

        {/* Error State Overlay */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-800/50 p-2">
            <p className="text-xs text-red-600 dark:text-red-400 text-center">
              Error: {error}
            </p>
          </div>
        )}
      </div>

      {/* No Todos Message */}
      {!isLoading && !error && nestedTodos.length === 0 && (
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm italic">
          No tasks yet. Add one above!
        </div>
      )}
    </div>
  );
};
