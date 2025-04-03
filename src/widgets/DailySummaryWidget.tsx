import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useCalendar } from "@/contexts/CalendarContext";
import { useHealth } from "@/contexts/HealthContext";
import { useTodos } from "@/contexts/TodosContext";
import { format } from "date-fns"; // Removed isToday
import { CalendarDays, CheckSquare, Footprints } from "lucide-react"; // Icons for sections
import { useMemo } from "react";

const MAX_EVENTS_TO_SHOW = 3;
const MAX_TODOS_TO_SHOW = 5;
const STEP_GOAL = 10000;

export function DailySummaryWidget() {
  const { events: calendarEvents, isLoading: calendarLoading } = useCalendar();
  const { todos, isLoading: todosLoading, toggleTodo } = useTodos();
  const { healthData, isLoading: healthLoading } = useHealth();

  const todayDateString = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // Process Calendar Events
  const upcomingEvents = useMemo(() => {
    return calendarEvents
      .filter((event) => event.date === todayDateString)
      .sort((a, b) => {
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        if ((a.isAllDay && b.isAllDay) || (!a.startTime && !b.startTime)) {
          return a.title.localeCompare(b.title);
        }
        return (a.startTime ?? "").localeCompare(b.startTime ?? "");
      })
      .slice(0, MAX_EVENTS_TO_SHOW);
  }, [calendarEvents, todayDateString]);

  // Process Todos
  const incompleteTodos = useMemo(() => {
    // TODO: Add due date filtering/prioritization later if needed
    return todos
      .filter((todo) => !todo.is_completed)
      .slice(0, MAX_TODOS_TO_SHOW);
  }, [todos]);

  // Process Steps
  const todaysSteps = useMemo(() => {
    const entry = healthData.find(
      (d) => d.entry_date === todayDateString && d.type === "steps"
    );
    return entry ? entry.value : 0;
  }, [healthData, todayDateString]);

  const stepsPercentage = Math.min(
    Math.round((todaysSteps / STEP_GOAL) * 100),
    100
  );

  const isLoading = calendarLoading || todosLoading || healthLoading;

  return (
    <div className="p-3 h-full w-full flex flex-col text-sm">
      <h3 className="text-base font-semibold mb-3 text-gray-100">
        Today&#39;s Summary
      </h3>

      {/* Sections Container */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {/* Calendar Section */}
        <section>
          <h4 className="text-xs font-medium uppercase text-gray-400 mb-1.5 flex items-center gap-1.5">
            <CalendarDays size={14} /> Upcoming Events
          </h4>
          {isLoading && upcomingEvents.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Loading...</p>
          ) : upcomingEvents.length > 0 ? (
            <ul className="space-y-1">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-center gap-2 text-xs">
                  <span className="font-mono w-12 text-right text-gray-400 flex-shrink-0">
                    {event.isAllDay ? "All-day" : event.startTime ?? ""}
                  </span>
                  <span className="truncate text-gray-300">{event.title}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">
              No upcoming events today.
            </p>
          )}
        </section>

        {/* Todos Section */}
        <section>
          <h4 className="text-xs font-medium uppercase text-gray-400 mb-1.5 flex items-center gap-1.5">
            <CheckSquare size={14} /> Pending Tasks
          </h4>
          {isLoading && incompleteTodos.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Loading...</p>
          ) : incompleteTodos.length > 0 ? (
            <ul className="space-y-1">
              {incompleteTodos.map((todo) => (
                <li
                  key={todo.id}
                  className="flex items-center gap-2 text-xs group"
                >
                  <Checkbox
                    id={`summary-todo-${todo.id}`}
                    checked={todo.is_completed}
                    onCheckedChange={() => toggleTodo(todo.id)}
                    className="w-3.5 h-3.5"
                  />
                  <Label
                    htmlFor={`summary-todo-${todo.id}`}
                    className="truncate text-gray-300 cursor-pointer group-hover:text-blue-400"
                  >
                    {todo.title}
                  </Label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-400 italic">No pending tasks.</p>
          )}
        </section>

        {/* Steps Section */}
        <section>
          <h4 className="text-xs font-medium uppercase text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Footprints size={14} /> Steps
          </h4>
          {isLoading && todaysSteps === 0 ? (
            <p className="text-xs text-gray-400 italic">Loading...</p>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-gray-300">
                {todaysSteps.toLocaleString()} / {STEP_GOAL.toLocaleString()}{" "}
                steps
              </p>
              <Progress value={stepsPercentage} className="h-1.5" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
