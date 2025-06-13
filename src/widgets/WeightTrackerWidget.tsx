import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeightEntryModal } from "@/components/WeightEntryModal"; // Import the modal
import { useHealthStore } from "@/stores/healthStore"; // Import from Zustand store
import { format, parseISO, subDays } from "date-fns"; // Import date-fns helpers
import { CirclePlus, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer, // Use Area
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"; // Import recharts components

// Define the props your widget expects (must include id, w, h)
interface WidgetProps {
  id: string;
  w: number;
  h: number;
}

export function WeightTrackerWidget({ id: _id, w: _w, h: _h }: WidgetProps) {
  const { healthData, healthSettings, isLoading } = useHealthStore(); // Use Zustand store
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Find the latest weight entry
  const latestWeightEntry = useMemo(() => {
    return healthData
      .filter((entry) => entry.type === "weight")
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date))[0]; // Get the most recent
  }, [healthData]);

  const currentWeight = latestWeightEntry?.value;
  const weightGoal = healthSettings?.weight_goal;

  const chartData = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    return healthData
      .filter(
        (entry) =>
          entry.type === "weight" && parseISO(entry.entry_date) >= thirtyDaysAgo
      )
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date)) // Sort ascending for chart
      .map((entry) => ({
        date: format(parseISO(entry.entry_date), "MM/dd"), // Format date for X-axis
        weight: entry.value,
      }));
  }, [healthData]);

  // Calculate min/max for Y-axis domain
  const { yMin, yMax } = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return { yMin: 0, yMax: 100 }; // Default range if no data
    }
    const weights = chartData.map((d) => d.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    // Add buffer, ensure min is not negative if data is close to 0
    return {
      yMin: Math.max(0, Math.floor(minW - 2)), // Floor to nearest integer
      yMax: Math.ceil(maxW + 2), // Ceil to nearest integer
    };
  }, [chartData]);

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/80 backdrop-blur-sm text-white p-2 rounded border border-gray-700 shadow-lg text-xs">
          <p className="label">{`Date: ${label}`}</p>
          <p className="intro">{`Weight: ${payload[0].value.toFixed(1)} kg`}</p>
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    if (isLoading && !healthSettings) {
      // Replace Skeleton with simple text loading state
      return (
        <div className="p-4 h-full flex items-center justify-center text-gray-400 text-sm">
          Loading...
        </div>
      );
    }

    const weightDifference =
      currentWeight && weightGoal ? currentWeight - weightGoal : null;

    // Define the purple color based on widget config (purple-400)
    const purpleColor = "#c084fc"; // Tailwind purple-400

    return (
      <Card className="h-full flex flex-col border-none shadow-none bg-transparent">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
          <CardTitle className="text-sm font-medium text-gray-300">
            Weight Tracker
          </CardTitle>
          {/* Move Button to Header */}
          <Button
            variant="ghost" // Use ghost for header
            size="icon"
            className="rounded-full h-6 w-6 text-gray-400 hover:text-white hover:bg-gray-700 ml-auto" // Adjust styling and margin
            onClick={() => setIsModalOpen(true)}
            aria-label="Log new weight entry"
          >
            <CirclePlus className="h-4 w-4" />
          </Button>
          {/* <Scale className="h-4 w-4 text-gray-400" />  Optional: Keep or remove scale icon */}
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between px-4 pb-4 pt-2">
          {" "}
          {/* Add pt-2 */}
          <div className="text-2xl font-bold text-white">
            {currentWeight ? `${currentWeight.toFixed(1)} kg` : "N/A"}
          </div>
          <div>
            <p className="text-xs text-gray-400">
              Goal: {weightGoal ? `${weightGoal.toFixed(1)} kg` : "Not set"}
            </p>
            {weightDifference !== null && (
              <p
                className={`text-xs flex items-center ${
                  weightDifference <= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {weightDifference > 0 ? (
                  <TrendingDown className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingUp className="mr-1 h-3 w-3" />
                )}
                {weightDifference > 0 ? "+" : ""}
                {weightDifference.toFixed(1)} kg from goal
              </p>
            )}
          </div>
          {/* Minimalistic Chart */}
          {chartData.length > 1 && ( // Only show chart if more than 1 data point
            // Increase height (e.g., h-24) and adjust margins
            <div className="h-24 -mx-4 mt-2 mb-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 0, left: 0, bottom: 0 }} // Adjust margins
                >
                  {/* Use standard SVG <defs> tag directly */}
                  <defs>
                    <linearGradient
                      id="colorWeight"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={purpleColor}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="95%"
                        stopColor={purpleColor}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="" // Remove dasharray for solid lines
                    stroke="rgba(255, 255, 255, 0.1)"
                    horizontal={true}
                    vertical={false}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: purpleColor, strokeWidth: 1 }} // Match area color
                    wrapperStyle={{ outline: "none" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke={purpleColor}
                    fillOpacity={1}
                    fill="url(#colorWeight)" // Use gradient for fill
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <XAxis dataKey="date" hide={true} />
                  <YAxis domain={[yMin, yMax]} hide={true} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Removed Button from here */}
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {renderContent()}
      <WeightEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
