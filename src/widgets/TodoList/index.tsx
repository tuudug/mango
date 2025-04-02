import React, { useState, useMemo, useCallback } from "react"; // Added useCallback
import { useTodos, NestedTodoItem } from "@/contexts/TodosContext";
import { LoadingBar } from "@/components/ui/loading-bar";
import { Input } from "@/components/ui/input";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { TodoListItem } from "./TodoListItem"; // Import the extracted component

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
    deleteTodo,
    toggleTodo,
    editTodo,
    reorderTodos,
    breakdownTodo,
    togglingTodoId,
  } = useTodos();

  const [newTodoText, setNewTodoText] = useState("");
  // State to manage expanded items
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Initialize expanded state based on fetched todos (optional, could default to collapsed)
  // This runs only once when the component mounts or nestedTodos initially loads
  // We might want to default all to collapsed instead. Let's default to collapsed.
  // useEffect(() => {
  //   const initialExpanded = new Set<string>();
  //   const setInitial = (items: NestedTodoItem[]) => {
  //     items.forEach(item => {
  //       if (item.children && item.children.length > 0) {
  //         initialExpanded.add(item.id); // Default expand items with children
  //         setInitial(item.children);
  //       }
  //     });
  //   };
  //   setInitial(nestedTodos);
  //   setExpandedItems(initialExpanded);
  // }, []); // Run only once

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Toggle expansion state for an item
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

  // Check if an item is expanded
  const isItemExpanded = useCallback(
    (id: string) => {
      return expandedItems.has(id);
    },
    [expandedItems]
  );

  // Modified Add/Breakdown handlers to ensure parent expansion
  const handleAddSubItem = useCallback(
    async (title: string, parentId: string) => {
      setExpandedItems((prev) => new Set(prev).add(parentId)); // Ensure parent is expanded
      await addTodoContext(title, parentId);
    },
    [addTodoContext]
  );

  const handleBreakdown = useCallback(
    async (id: string) => {
      setExpandedItems((prev) => new Set(prev).add(id)); // Ensure parent is expanded
      await breakdownTodo(id);
    },
    [breakdownTodo]
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

  // Recursive rendering function - pass down expansion state and toggle handler
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
            isExpanded={isItemExpanded(todo.id)} // Pass expanded state
            onToggleExpand={toggleItemExpansion} // Pass toggle handler
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onEditSave={editTodo}
            onAddSubItem={handleAddSubItem} // Use wrapped handler
            onBreakdown={handleBreakdown} // Use wrapped handler
            renderChildren={renderTodoList}
          />
        ))}
      </SortableContext>
    );
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
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
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

export default TodoListWidget;
