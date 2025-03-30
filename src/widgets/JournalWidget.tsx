import React, { useState, useEffect } from "react";

interface JournalWidgetProps {
  id: string;
}

interface JournalEntry {
  id: string;
  date: string;
  content: string;
  mood: Mood;
}

type Mood = "happy" | "neutral" | "sad" | "excited" | "tired";

export const JournalWidget: React.FC<JournalWidgetProps> = ({ id }) => {
  // Get current date in YYYY-MM-DD format
  const getCurrentDate = (): string => {
    const now = new Date();
    return now.toISOString().split("T")[0];
  };

  // State for journal entries
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    // Try to load from localStorage
    const savedEntries = localStorage.getItem(`journal-widget-${id}`);
    if (savedEntries) {
      return JSON.parse(savedEntries);
    }

    // Default entries
    return [
      {
        id: "1",
        date: getCurrentDate(),
        content: "Today I started using this amazing dashboard app!",
        mood: "excited",
      },
    ];
  });

  // Current entry being edited
  const [currentEntry, setCurrentEntry] = useState<JournalEntry>({
    id: Date.now().toString(),
    date: getCurrentDate(),
    content: "",
    mood: "neutral",
  });

  // Save entries to localStorage when they change
  useEffect(() => {
    localStorage.setItem(`journal-widget-${id}`, JSON.stringify(entries));
  }, [entries, id]);

  // Handle text change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentEntry({ ...currentEntry, content: e.target.value });
  };

  // Handle mood change
  const handleMoodChange = (mood: Mood) => {
    setCurrentEntry({ ...currentEntry, mood });
  };

  // Save current entry
  const saveEntry = () => {
    if (currentEntry.content.trim() === "") return;

    // Check if we're editing an existing entry
    const existingIndex = entries.findIndex((e) => e.id === currentEntry.id);

    if (existingIndex >= 0) {
      // Update existing entry
      const updatedEntries = [...entries];
      updatedEntries[existingIndex] = currentEntry;
      setEntries(updatedEntries);
    } else {
      // Add new entry
      setEntries([currentEntry, ...entries]);
    }

    // Reset current entry
    setCurrentEntry({
      id: Date.now().toString(),
      date: getCurrentDate(),
      content: "",
      mood: "neutral",
    });
  };

  // Load entry for editing
  const editEntry = (entry: JournalEntry) => {
    setCurrentEntry(entry);
  };

  // Delete entry
  const deleteEntry = (entryId: string) => {
    setEntries(entries.filter((e) => e.id !== entryId));

    // If we're currently editing this entry, reset
    if (currentEntry.id === entryId) {
      setCurrentEntry({
        id: Date.now().toString(),
        date: getCurrentDate(),
        content: "",
        mood: "neutral",
      });
    }
  };

  // Format date for display (e.g., "Mar 30, 2025")
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get emoji for mood
  const getMoodEmoji = (mood: Mood): string => {
    switch (mood) {
      case "happy":
        return "😊";
      case "sad":
        return "😔";
      case "excited":
        return "😃";
      case "tired":
        return "😴";
      case "neutral":
      default:
        return "😐";
    }
  };

  return (
    // Added dark mode classes
    <div className="p-2 h-full w-full flex flex-col text-sm text-gray-700 dark:text-gray-300">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-base">
          Journal
        </h3>
        <div className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
          {formatDate(currentEntry.date)}
        </div>
      </div>

      {/* Entry editor */}
      <div className="mb-2">
        <textarea
          value={currentEntry.content}
          onChange={handleContentChange}
          placeholder="What's on your mind?"
          // Dark mode textarea
          className="w-full h-16 p-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
        />
        {/* Mood selector */}
        <div className="flex justify-between items-center mt-1.5">
          <div className="flex space-x-1.5">
            {(["happy", "neutral", "sad", "excited", "tired"] as Mood[]).map(
              (mood) => (
                <button
                  key={mood}
                  onClick={() => handleMoodChange(mood)}
                  // Dark mode mood button
                  className={`text-base p-0.5 rounded-full transition-all ${
                    currentEntry.mood === mood
                      ? "bg-blue-100 dark:bg-blue-900/50 transform scale-125"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  title={`Feeling ${mood}`}
                >
                  {getMoodEmoji(mood)}
                </button>
              )
            )}
          </div>
          <button
            onClick={saveEntry}
            disabled={currentEntry.content.trim() === ""}
            // Dark mode save button
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              currentEntry.content.trim() === ""
                ? "bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700"
            }`}
          >
            {entries.some((e) => e.id === currentEntry.id) ? "Update" : "Save"}
          </button>
        </div>
      </div>

      {/* Previous entries */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div
              key={entry.id}
              // Dark mode entry item
              className={`p-1.5 border dark:border-gray-700 rounded-md text-sm ${
                entry.id === currentEntry.id
                  ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center">
                  <span className="mr-1.5 text-base">
                    {getMoodEmoji(entry.mood)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(entry.date)}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => editEntry(entry)}
                    // Dark mode edit button
                    className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    // Dark mode delete button
                    className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {entry.content.length > 100
                  ? `${entry.content.substring(0, 100)}...`
                  : entry.content}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-400 dark:text-gray-500 text-xs italic">
            No journal entries yet. Start writing!
          </div>
        )}
      </div>

      <div className="mt-1 text-xs text-gray-400 dark:text-gray-500 text-right">
        Widget ID: {id.slice(0, 8)}
      </div>
    </div>
  );
};
