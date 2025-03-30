import React, { useState } from "react";

interface TrackableGraphWidgetProps {
  id: string;
}

interface DataPoint {
  date: string;
  value: number;
}

export const TrackableGraphWidget: React.FC<TrackableGraphWidgetProps> = ({
  id,
}) => {
  // Sample data for the graph
  const [data, setData] = useState<DataPoint[]>([
    { date: "Mon", value: 65 },
    { date: "Tue", value: 59 },
    { date: "Wed", value: 80 },
    { date: "Thu", value: 81 },
    { date: "Fri", value: 56 },
    { date: "Sat", value: 55 },
    { date: "Sun", value: 40 },
  ]);

  // Find the max value for scaling
  const maxValue = Math.max(...data.map((d) => d.value));

  // Calculate bar heights as percentages of the max
  const calculateHeight = (value: number) => {
    return (value / maxValue) * 100;
  };

  return (
    // Added dark mode classes
    <div className="p-2 h-full w-full flex flex-col text-sm text-gray-700 dark:text-gray-300">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-base">
          Trackable Graph
        </h3>
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
          Weekly Progress
        </div>
      </div>
      {/* Graph container */}
      <div className="flex-1 flex items-end space-x-1">
        {" "}
        {/* Reduced space */}
        {data.map((point, index) => (
          <div
            key={`${id}-${index}`}
            className="flex flex-col items-center flex-1"
          >
            {/* Bar */}
            <div className="w-full relative group">
              <div
                className="bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 rounded-t transition-all duration-300" // Dark mode bar color
                style={{
                  height: `${calculateHeight(point.value)}%`,
                  minHeight: "4px",
                }}
              ></div>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  {point.value}
                </div>
              </div>
            </div>
            {/* X-axis label */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {point.date}
            </div>
            {/* Reduced margin */}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between items-center">
        {" "}
        {/* Reduced margin */}
        <button
          className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
          onClick={() => {
            // Generate new random data
            const newData = data.map((point) => ({
              ...point,
              value: Math.floor(Math.random() * 100),
            }));
            setData(newData);
          }}
        >
          Refresh Data
        </button>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          Widget ID: {id.slice(0, 8)}
        </div>
      </div>
    </div>
  );
};
