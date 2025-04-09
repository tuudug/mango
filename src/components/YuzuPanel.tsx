import React, { useState } from "react"; // Added useState
import { Button } from "@/components/ui/button";
import { Bot, X, SendHorizontal } from "lucide-react"; // Added SendHorizontal icon

interface YuzuPanelProps {
  // Renamed from GameMasterPanelProps
  onClose: () => void; // Function to close the panel
}

export function YuzuPanel({ onClose }: YuzuPanelProps) {
  // Renamed from GameMasterPanel
  const [message, setMessage] = useState(""); // State for input

  const handleSend = () => {
    if (message.trim()) {
      console.log("Sending message:", message); // Placeholder action
      setMessage(""); // Clear input
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Send on Enter, allow Shift+Enter for newline
      e.preventDefault(); // Prevent default newline on Enter
      handleSend();
    }
  };

  return (
    // Remove fixed width w-72, add w-full
    <aside className="h-full w-full bg-gray-800 border-l border-gray-700 shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
        {" "}
        {/* Added flex-shrink-0 */}
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-gray-100">Yuzu</h2>{" "}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
        >
          <X size={16} />
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Placeholder Message/Quest */}
        <div className="bg-gray-700 p-3 rounded-lg shadow-sm">
          <p className="text-sm text-gray-200 mb-3">
            Greetings! Fancy a quick challenge? Complete 3 tasks from your To-do
            list in the next hour for a bonus!
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              Later
            </Button>
            <Button
              variant="default"
              size="sm"
              className="text-xs bg-indigo-600 hover:bg-indigo-700"
            >
              Accept
            </Button>
          </div>
        </div>

        <div className="bg-gray-700 p-3 rounded-lg shadow-sm">
          <p className="text-sm text-gray-200">
            Remember to take a short break and stretch! Your well-being is
            important.
          </p>
        </div>

        {/* Add more placeholder content as needed */}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-700 flex items-center gap-2 flex-shrink-0">
        {" "}
        {/* Added flex-shrink-0 */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Send a message..."
          className="flex-1 px-3 py-1.5 border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-700 text-gray-100 placeholder-gray-500"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSend}
          disabled={!message.trim()}
          className="h-8 w-8 text-indigo-400 disabled:text-gray-600"
          title="Send Message"
        >
          <SendHorizontal size={18} />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    </aside>
  );
}
