import { useFinance } from "@/contexts/FinanceContext"; // Updated import path
import { Button } from "@/components/ui/button";
import { formatCurrency, getCurrencySymbol } from "@/lib/currencies"; // Import getCurrencySymbol
import { eachDayOfInterval, endOfWeek, format, startOfWeek } from "date-fns";
import {
  BarChartHorizontal,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell, // Import TooltipProps type
  ReferenceLine,
  ResponsiveContainer, // Import ReferenceLine
  Text,
  Tooltip, // Import Cell for custom bar colors
  TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

interface ExpensesReportWidgetProps {
  id: string;
  // w, h are provided by react-grid-layout but might not be needed directly
}

// Type for the data structure used by the chart
interface ChartDataPoint {
  name: string; // Short day name (e.g., "Mon")
  date: string; // Full date string (YYYY-MM-DD)
  amount: number;
  overLimit: boolean;
}

// Helper to get week range string
const getWeekRangeString = (startDate: Date): string => {
  const endDate = endOfWeek(startDate, { weekStartsOn: 1 });
  return `${format(startDate, "MMM d")} - ${format(endDate, "MMM d, yyyy")}`;
};

interface CustomTickProps {
  x: number;
  y: number;
  payload: {
    value: string;
  };
}

const CustomXAxisTick = ({ x, y, payload }: CustomTickProps) => {
  const tickValue = payload.value; // This is the 'name' (e.g., "Mon")

  // A more robust way to check if the tick corresponds to today
  // Find the data point associated with this tick's value (day name)
  // This requires access to chartData or passing it down, which complicates things.
  // Sticking with the simpler check for now, acknowledging its limitations.
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

export const ExpensesReportWidget: React.FC<ExpensesReportWidgetProps> = () => {
  const {
    settings,
    weeklyExpensesData,
    isLoadingWeeklyEntries,
    currentReportWeekStart,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
  } = useFinance();

  const dailyGoal = settings?.daily_allowance_goal ?? null;
  const currency = settings?.currency ?? "USD";

  // Process data for the chart: ensure all 7 days are present
  const chartData: ChartDataPoint[] = useMemo(() => {
    // Add type annotation
    const weekStart = startOfWeek(currentReportWeekStart, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentReportWeekStart, { weekStartsOn: 1 });
    const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const dataMap = new Map<string, number>();
    weeklyExpensesData.forEach((item) => {
      dataMap.set(item.date, item.totalAmount);
    });

    return daysInWeek.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayOfWeek = format(day, "eee"); // Short day name (Mon, Tue, etc.)
      const totalAmount = dataMap.get(dateStr) || 0;
      const overLimit = dailyGoal !== null && totalAmount > dailyGoal;

      return {
        name: dayOfWeek, // Use short day name for XAxis
        date: dateStr,
        amount: totalAmount,
        overLimit: overLimit,
      };
    });
  }, [weeklyExpensesData, currentReportWeekStart, dailyGoal]);

  // Custom Tooltip for Recharts - Use TooltipProps for typing
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) => {
    // Use recharts TooltipProps
    if (active && payload && payload.length) {
      // Access the original data point from the payload
      const data = payload[0].payload as ChartDataPoint;
      return (
        <div className="bg-gray-800 border border-gray-600 p-2 rounded shadow-lg text-sm">
          <p className="text-gray-300 font-medium">{`${label} (${data.date})`}</p>
          <p
            className={`font-semibold ${
              data.overLimit ? "text-red-400" : "text-green-400"
            }`}
          >
            Spent: {formatCurrency(data.amount, currency)}
          </p>
          {dailyGoal !== null && (
            <p className="text-xs text-gray-400">
              Goal: {formatCurrency(dailyGoal, currency)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-3 h-full w-full flex flex-col text-sm text-gray-300">
      {/* Header with Navigation */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-100 text-base flex items-center">
          <BarChartHorizontal className="w-4 h-4 mr-2 text-cyan-400" />
          Weekly Expenses
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-gray-100"
            onClick={goToPreviousWeek}
            disabled={isLoadingWeeklyEntries}
            title="Previous Week"
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-xs text-gray-400 hover:text-gray-100"
            onClick={goToCurrentWeek}
            disabled={isLoadingWeeklyEntries}
            title="Current Week"
          >
            <CalendarCheck2 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-gray-100"
            onClick={goToNextWeek}
            disabled={isLoadingWeeklyEntries}
            title="Next Week"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      <p className="text-xs text-center text-gray-400 mb-2">
        {getWeekRangeString(currentReportWeekStart)}
      </p>

      {/* Chart Area */}
      <div className="flex-1 relative">
        {isLoadingWeeklyEntries ? (
          <div className="absolute inset-0 flex justify-center items-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              // Increased left margin significantly
              margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
            >
              {" "}
              {/* Adjust margins */}
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
                // Added width to YAxis to prevent label cutoff
                width={55} // Adjust this value as needed based on expected label length
                tickFormatter={(value) =>
                  formatCurrency(value, currency, "en-US")?.replace(
                    getCurrencySymbol(currency) ?? "", // Use imported helper
                    ""
                  ) ?? ""
                }
              />{" "}
              {/* Basic YAxis formatting */}
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
              />
              {/* Add ReferenceLine for the goal */}
              {dailyGoal !== null && (
                <ReferenceLine
                  y={dailyGoal}
                  stroke="#a78bfa" // Purple color for goal line
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  // Use label prop which accepts a React element or string
                  label={
                    <Text
                      fill="#a78bfa"
                      fontSize={9}
                      dy={-4}
                      dx={4}
                      textAnchor="start"
                    >
                      Goal
                    </Text>
                  }
                />
              )}
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.overLimit ? "#f87171" : "#34d399"}
                  /> // Red if over limit, Green if not
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
