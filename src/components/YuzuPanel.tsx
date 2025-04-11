import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, X, SendHorizontal, User } from "lucide-react";
import { authenticatedFetch } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

interface YuzuPanelProps {
  onClose: () => void;
}

type ChatMessage = {
  id: number;
  sender: "user" | "yuzu";
  text: string;
};

const INITIAL_SUGGESTIONS = [
  "What should I do next?",
  "Tell me a joke",
  "Do I have any tasks?",
];

export function YuzuPanel({ onClose }: YuzuPanelProps) {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([
    {
      id: 1,
      sender: "yuzu",
      text: "Hi! I'm Yuzu, your friendly motivator. How can I help you today?",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [msgId, setMsgId] = useState(2);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const { showToast } = useToast();
  const { session } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSuggestions(INITIAL_SUGGESTIONS);
  }, []);

  const handleSend = async (overrideMessage?: string) => {
    const trimmed = (overrideMessage ?? message).trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: msgId,
      sender: "user",
      text: trimmed,
    };
    setHistory((h) => [...h, userMsg]);
    setMsgId((id) => id + 1);
    setMessage("");
    setLoading(true);

    try {
      const data = await authenticatedFetch<{
        yuzuResponse: string;
        suggestions?: string[];
      }>("/api/yuzu/message", "POST", session, {
        message: trimmed,
        history: [...history, userMsg].slice(-10),
      });
      const yuzuMsg: ChatMessage = {
        id: msgId + 1,
        sender: "yuzu",
        text:
          typeof data.yuzuResponse === "string" && data.yuzuResponse.trim()
            ? data.yuzuResponse.trim()
            : "Sorry, I couldn't think of a reply just now.",
      };
      setHistory((h) => [...h, yuzuMsg]);
      setMsgId((id) => id + 1);
      if (Array.isArray(data.suggestions) && data.suggestions.length >= 2) {
        setSuggestions(data.suggestions.slice(0, 4));
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      showToast({
        title: "Yuzu Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage("");
    handleSend(suggestion);
    setSuggestions([]);
  };

  useEffect(() => {
    // Scroll to bottom on new message
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  return (
    <aside className="h-full w-full bg-gray-800 border-l border-gray-700 shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-gray-100">Yuzu</h2>
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

      {/* Chat Area */}
      <div
        className="flex-1 p-4 overflow-y-auto space-y-4"
        ref={scrollRef}
        style={{ minHeight: 0 }}
      >
        {history.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.sender === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={
                "max-w-xs md:max-w-md rounded-lg px-4 py-2 shadow-sm " +
                (msg.sender === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-700 text-gray-200 flex items-center gap-2")
              }
            >
              {msg.sender === "yuzu" && (
                <Bot className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              )}
              <span>{msg.text}</span>
              {msg.sender === "user" && (
                <User className="w-4 h-4 text-white flex-shrink-0 ml-2" />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-xs md:max-w-md rounded-lg px-4 py-2 shadow-sm bg-gray-700 text-gray-400 flex items-center gap-2 animate-pulse">
              <Bot className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>Yuzu is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions Area */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 py-2 border-t border-b border-gray-700 bg-gray-800">
          {suggestions.map((s, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleSuggestionClick(s)}
              disabled={loading}
            >
              {s}
            </Button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="p-3 border-t border-gray-700 flex items-center gap-2 flex-shrink-0">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Send a message..."
          className="flex-1 px-3 py-1.5 border border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-gray-700 text-gray-100 placeholder-gray-500"
          disabled={loading}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleSend()}
          disabled={!message.trim() || loading}
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
