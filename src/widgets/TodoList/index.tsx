import { Input } from "@/components/ui/input";
import { LoadingBar } from "@/components/ui/loading-bar";
import { NestedTodoItem, useTodos } from "@/contexts/TodosContext"; // Added TodoItem
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor, // Import DragStartEvent
  UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import React, { useCallback, useMemo, useState } from "react";
import { TodoListItem } from "./TodoListItem";

// --- Helper Type for findItemAndSiblings ---
interface FindResult {
  item: NestedTodoItem | null;
  siblings: NestedTodoItem[] | null;
  parentId: string | null;
}

// --- Recursive Helper to Find Item, its Siblings, and Parent ID ---
const findItemAndSiblings = (
  items: NestedTodoItem[],
  idToFind: UniqueIdentifier,
  currentParentId: string | null = null
): FindResult => {
  for (const item of items) {
    if (item.id === idToFind) {
      return { item, siblings: items, parentId: currentParentId };
    }
    if (item.children && item.children.length > 0) {
      const result = findItemAndSiblings(item.children, idToFind, item.id);
      if (result.item) {
        return result; // Found in children
      }
    }
  }
  return { item: null, siblings: null, parentId: null }; // Not found at this level or below
};

// --- Main Widget Component ---
interface TodoListWidgetProps {
  id: string; // Widget ID from dashboard config
}

export const TodoListWidget: React.FC<TodoListWidgetProps> = ({ id: _id }) => {
  const {
    nestedTodos,
    isLoading,
    error,
    addTodo: addTodoContext,
    editTodo,
    reorderTodos,
    breakdownTodo,
    togglingTodoId,
    // moveTodo // Context function for move buttons
  } = useTodos();

  const [newTodoText, setNewTodoText] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isDraggingTopLevel, setIsDraggingTopLevel] = useState(false); // State for drag animation control

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toggleItemExpansion = useCallback((id: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const isItemExpanded = useCallback(
    (id: string) => {
      // If dragging, nothing is considered expanded visually (for animation control)
      return !isDraggingTopLevel && expandedItems.has(id);
    },
    [expandedItems, isDraggingTopLevel] // Add dependency
  );

  const handleAddSubItem = useCallback(
    async (title: string, parentId: string) => {
      setExpandedItems((prev) => new Set(prev).add(parentId));
      await addTodoContext(title, parentId);
    },
    [addTodoContext]
  );

  const handleBreakdown = useCallback(
    async (todo: NestedTodoItem) => {
      setExpandedItems((prev) => new Set(prev).add(todo.id));
      await breakdownTodo(todo);
    },
    [breakdownTodo]
  );

  // const handleMoveUp = useCallback((id: string) => {
  //   console.log("Move Up requested for:", id, "(Placeholder in Widget)");
  // }, []);

  // const handleMoveDown = useCallback((id: string) => {
  //   console.log("Move Down requested for:", id, "(Placeholder in Widget)");
  // }, []);

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

  // --- Drag Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    // Check if the dragged item is top-level
    const activeItem = nestedTodos.find((item) => item.id === event.active.id);
    if (activeItem && activeItem.level === 0) {
      setIsDraggingTopLevel(true); // Set dragging state
      setExpandedItems(new Set()); // Collapse immediately
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDraggingTopLevel(false); // Reset dragging state regardless of outcome

    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const activeResult = findItemAndSiblings(nestedTodos, active.id);
    const overResult = findItemAndSiblings(nestedTodos, over.id);

    if (
      activeResult.item &&
      overResult.item &&
      activeResult.parentId === overResult.parentId &&
      activeResult.siblings
    ) {
      if (activeResult.item.level === 0) {
        // Redundant check now, but safe
        const currentSiblings = activeResult.siblings;
        const parentId = activeResult.parentId;

        const oldIndex = currentSiblings.findIndex((t) => t.id === active.id);
        const newIndex = currentSiblings.findIndex((t) => t.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrderedIds = arrayMove(
            currentSiblings,
            oldIndex,
            newIndex
          ).map((t) => t.id);
          reorderTodos(parentId, newOrderedIds);
        } else {
          console.warn(
            "Could not determine indices within siblings for drag and drop",
            active.id,
            over.id,
            currentSiblings
          );
        }
      }
      // No need for the 'else' warning anymore as drag is disabled for nested
    } else {
      console.warn(
        "Drag and drop failed: Items not found or not siblings.",
        activeResult,
        overResult
      );
    }
  };

  // Calculate completion stats
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
  const { completed: completedCount, total: totalCount } = useMemo(
    () => calculateStats(nestedTodos),
    [nestedTodos]
  );
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
          onDragStart={handleDragStart} // Updated handler
          onDragEnd={handleDragEnd} // Updated handler
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={nestedTodos.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-1.5 list-none p-0 m-0">
              {nestedTodos.map((todo) => (
                <TodoListItem
                  key={todo.id}
                  todo={todo}
                  level={0}
                  isToggling={togglingTodoId === todo.id}
                  isLoading={isLoading}
                  isExpanded={isItemExpanded(todo.id)} // Uses updated logic
                  onToggleExpand={toggleItemExpansion}
                  onEditSave={editTodo}
                  onAddSubItem={handleAddSubItem}
                  onBreakdown={handleBreakdown}
                  isItemExpanded={isItemExpanded} // Pass down check function
                  isDraggingTopLevel={isDraggingTopLevel} // Pass down drag state
                  // onMoveUp/Down removed as they are handled via context in TodoListItem
                />
              ))}
            </ul>
          </SortableContext>
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

export default TodoListWidget;
