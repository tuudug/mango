import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface TodoItemEditFormProps {
  initialTitle: string;
  isLoading: boolean;
  onSave: (newTitle: string) => void; // Callback with the final title
  onCancel: () => void; // Simple cancel callback
}

export const TodoItemEditForm: React.FC<TodoItemEditFormProps> = ({
  initialTitle,
  isLoading,
  onSave,
  onCancel,
}) => {
  const [editText, setEditText] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus and select text when the form mounts
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []); // Run only on mount

  const handleSave = () => {
    if (editText.trim() && editText.trim() !== initialTitle) {
      onSave(editText.trim());
    } else {
      // If the text is empty or unchanged, treat it as a cancel
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation(); // Prevent triggering other handlers (like DnD)
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const handleBlur = () => {
    // Save on blur only if the text is valid and changed
    // Otherwise, cancel to avoid saving empty/unchanged text accidentally
    if (editText.trim() && editText.trim() !== initialTitle) {
      handleSave();
    } else {
      onCancel();
    }
  };

  return (
    <Input
      ref={inputRef}
      type="text"
      value={editText}
      onChange={(e) => setEditText(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur} // Use custom blur handler
      onClick={(e) => e.stopPropagation()} // Prevent clicks propagating
      className="flex-1 h-6 px-1 py-0 text-sm border-blue-500 ring-1 ring-blue-500 rounded focus:outline-none"
      disabled={isLoading}
      aria-label="Edit todo title"
    />
  );
};
