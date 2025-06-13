import { Button } from "@/components/ui/button";
import { useHealthStore, HealthEntry } from "@/stores/healthStore"; // Import from Zustand store
import { eachDayOfInterval, endOfWeek, format, startOfWeek } from "date-fns";
import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Footprints,
} from "lucide-react";
import React, { useMemo } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Text,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

interface StepsTrackerWidgetProps {
  id: string;
  w: number;
  h: number;
}

// Define the structure for the chart data
interface StepsChartDataPoint {
  name: string; // Short day name (e.g., "Mon")
  date: string; // Full date string (YYYY-MM-DD)
  steps: number;
  overGoal: boolean;
}

// Helper to get week range string
const getWeekRangeString = (startDate: Date): string => {
  const endDate = endOfWeek(startDate, { weekStartsOn: 1 });
  return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
};

// --- Custom Recharts Components ---

interface CustomTickProps {
  x: number;
  y: number;
  payload: {
    value: string; // The 'name' (e.g., "Mon")
  };
}

const CustomXAxisTick = ({ x, y, payload }: CustomTickProps) => {
  const tickValue = payload.value;
  const todayShortName = format(new Date(), "eee");
  const isTickToday = tickValue === todayShortName;

  return (
    <g transform={`translate(${x},${y})`}>
      <Text
        x={0}
        y={0}
        dy={12}
        textAnchor="middle"
        fill={isTickToday ? "#FFFFFF" : "#9ca3af"}
        fontSize={10}
        fontWeight={isTickToday ? "bold" : "normal"}
      >
        {String(tickValue)}
      </Text>
    </g>
  );
};

// Custom Tooltip for Recharts - Accepts goalSteps prop
const CustomTooltip = (
  props: TooltipProps<number, string> & { goalSteps: number }
) => {
  // Destructure props including goalSteps
  const { active, payload, label, goalSteps } = props;

  if (active && payload && payload.length) {
    const data = payload[0].payload as StepsChartDataPoint;

    return (
      <div className="bg-gray-800 border border-gray-600 p-2 rounded shadow-lg text-sm">
        <p className="text-gray-300 font-medium">{`${label} (${data.date})`}</p>
        <p
          className={`font-semibold ${
            data.overGoal ? "text-green-400" : "text-blue-400"
          }`}
        >
          Steps: {data.steps.toLocaleString()}
        </p>
        <p className="text-xs text-gray-400">
          Goal: {goalSteps.toLocaleString()} {/* Use goalSteps from props */}
        </p>
      </div>
    );
  }
  return null;
};

// --- Main Widget Component ---

export const StepsTrackerWidget: React.FC<StepsTrackerWidgetProps> = ({
  w,
}) => {
  // Get data, navigation functions, and settings from context
  const {
    healthData,
    isLoading,
    currentStepsWeekStart,
    goToPreviousStepsWeek,
    goToNextStepsWeek,
    goToCurrentStepsWeek,
    healthSettings, // Get health settings
  } = useHealthStore(); // Use Zustand store

  // Calculate goalSteps from context, with a default fallback
  const goalSteps = healthSettings?.daily_steps_goal ?? 10000;

  // --- Process Data ---
  const today = new Date();

  // Data for the Recharts graph (based on currentStepsWeekStart)
  const chartData: StepsChartDataPoint[] = useMemo(() => {
    const weekStart = startOfWeek(currentStepsWeekStart, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentStepsWeekStart, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const daysMap = new Map<string, number>();
    healthData
      .filter((d: HealthEntry) => d.type === "steps")
      .forEach((entry: HealthEntry) => {
        daysMap.set(
          entry.entry_date,
          (daysMap.get(entry.entry_date) || 0) + entry.value
        );
      });

    return daysInWeek.map((day) => {
      const dateString = format(day, "yyyy-MM-dd");
      const dayLabel = format(day, "eee");
      const steps = daysMap.get(dateString) || 0;
      // Use the calculated goalSteps here
      const overGoal = steps >= goalSteps;

      return {
        name: dayLabel,
        date: dateString,
        steps: steps,
        overGoal: overGoal,
      };
    });
    // Add goalSteps (derived from healthSettings) to dependency array
  }, [healthData, goalSteps, currentStepsWeekStart]);

  // Today's steps for the mini view
  const todayString = format(today, "yyyy-MM-dd");
  const currentSteps = useMemo(() => {
    return healthData
      .filter(
        (d: HealthEntry) => d.entry_date === todayString && d.type === "steps"
      )
      .reduce((sum: number, entry: HealthEntry) => sum + entry.value, 0);
  }, [healthData, todayString]);

  // --- Conditional Rendering Logic ---
  const isMiniView = w < 6;
  // Use calculated goalSteps for percentage
  const percentage =
    goalSteps > 0 ? Math.round((currentSteps / goalSteps) * 100) : 0;

  let pathColor = "rgba(59, 130, 246, 1)"; // Default blue

  if (isMiniView) {
    // --- Render Mini View ---
    return (
      <div className="p-2 h-full w-full flex flex-row items-center justify-center gap-3">
        <div className="w-16 h-16 relative flex-shrink-0">
          <CircularProgressbar
            value={percentage}
            strokeWidth={8}
            styles={buildStyles({
              strokeLinecap: "round",
              pathTransitionDuration: 0.5,
              pathColor: pathColor,
              trailColor: "rgba(255, 255, 255, 0.1)",
            })}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Footprints className="w-5 h-5 text-blue-400" />
          </div>
        </div>
        <div className="text-left leading-tight">
          <span className="text-2xl font-bold text-gray-100 block">
            {currentSteps.toLocaleString()}
          </span>
          <span className="text-xs text-gray-400">
            {/* Use calculated goalSteps */}
            Out of {goalSteps.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  // --- Render Full Graph View ---
  return (
    <div className="p-3 h-full w-full flex flex-col text-sm text-gray-300">
      {/* Header with Navigation */}
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-semibold text-gray-100 text-base flex items-center">
          <Footprints className="w-4 h-4 mr-2 text-blue-400" />
          Weekly Steps
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-gray-100"
            onClick={goToPreviousStepsWeek}
            disabled={isLoading}
            title="Previous Week"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs text-gray-400 hover:text-gray-100"
            onClick={goToCurrentStepsWeek}
            disabled={isLoading}
            title="Current Week"
          >
            <CalendarCheck2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-gray-100"
            onClick={goToNextStepsWeek}
            disabled={isLoading}
            title="Next Week"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      {/* Week Range Display */}
      <p className="text-xs text-center text-gray-400 mb-2">
        {getWeekRangeString(currentStepsWeekStart)}
      </p>

      {/* Chart Area */}
      <div className="flex-1 relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.1)"
            />
            <XAxis
              dataKey="name"
              fontSize={10}
              stroke="#9ca3af"
              tickLine={false}
              axisLine={false}
              tick={(props) => <CustomXAxisTick {...props} />}
              interval={0}
            />
            <YAxis
              fontSize={10}
              stroke="#9ca3af"
              tickLine={false}
              axisLine={false}
              width={45}
              tickFormatter={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value)
              }
            />
            <Tooltip
              // Pass calculated goalSteps to tooltip component
              content={<CustomTooltip goalSteps={goalSteps} />}
              cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
            />
            <ReferenceLine
              // Use calculated goalSteps for reference line
              y={goalSteps}
              stroke="#a78bfa" // Purple color for goal line
              strokeDasharray="3 3"
              strokeWidth={1}
              label={
                <Text fill="#a78bfa" fontSize={9} dy={-4} textAnchor="middle">
                  Goal
                </Text>
              }
            />
            <Bar dataKey="steps" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  // Use calculated goalSteps for coloring
                  fill={entry.overGoal ? "#10b981" : "#3b82f6"} // Green if over goal, blue otherwise
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
