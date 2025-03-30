import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface DraggableProps {
  id: string;
  children: React.ReactNode;
  data?: Record<string, unknown>;
  disabled?: boolean; // Add disabled prop
}

export function Draggable({ id, children, data, disabled }: DraggableProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    data: data,
    disabled: disabled, // Pass disabled to the hook
  });
  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 10, // Ensure dragged item is on top
        cursor: "grabbing",
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
}
