import React, { useState } from "react";

interface SleepStepWidgetProps {
  id: string;
}

interface DailyData {
  day: string;
  sleep: number; // hours
  steps: number;
}

export const SleepStepWidget: React.FC<SleepStepWidgetProps> = ({ id }) => {
  // Sample data for the week
  const [weekData, setWeekData] = useState<DailyData[]>([
    { day: "Mon", sleep: 7.5, steps: 8432 },
    { day: "Tue", sleep: 6.8, steps: 10253 },
    { day: "Wed", sleep: 8.2, steps: 7654 },
    { day: "Thu", sleep: 7.0, steps: 9123 },
    { day: "Fri", sleep: 6.5, steps: 11542 },
    { day: "Sat", sleep: 8.5, steps: 5421 },
    { day: "Sun", sleep: 9.0, steps: 4210 },
  ]);

  // Calculate averages
  const avgSleep =
    weekData.reduce((sum, day) => sum + day.sleep, 0) / weekData.length;
  const avgSteps =
    weekData.reduce((sum, day) => sum + day.steps, 0) / weekData.length;

  // We could use these max values for dynamic scaling if needed
  // const maxSleep = Math.max(...weekData.map((day) => day.sleep));
  // const maxSteps = Math.max(...weekData.map((day) => day.steps));

  // Calculate sleep bar height as percentage of max
  const getSleepBarHeight = (sleep: number) => {
    return (sleep / 12) * 100; // Assuming 12 hours is max
  };

  // Calculate step bar height as percentage of max
  const getStepBarHeight = (steps: number) => {
    return (steps / 15000) * 100; // Assuming 15000 steps is max
  };

  // Generate random data for demo
  const generateRandomData = () => {
    const newData = weekData.map((day) => ({
      ...day,
      sleep: Math.round((Math.random() * 4 + 5) * 10) / 10, // 5-9 hours
      steps: Math.round(Math.random() * 12000 + 3000), // 3000-15000 steps
    }));
    setWeekData(newData);
  };

  return (
    <div className="p-2 h-full w-full flex flex-col text-sm text-gray-300">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-100 text-base">Sleep & Steps</h3>
        <div className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
          Weekly Data
        </div>
      </div>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div className="bg-indigo-900/30 rounded p-1.5">
          <div className="text-xs text-gray-400">Avg. Sleep</div>
          <div className="font-bold text-indigo-300 text-base">
            {avgSleep.toFixed(1)}h
          </div>
        </div>
        <div className="bg-green-900/30 rounded p-1.5">
          <div className="text-xs text-gray-400">Avg. Steps</div>
          <div className="font-bold text-green-300 text-base">
            {Math.round(avgSteps).toLocaleString()}
          </div>
        </div>
      </div>
      {/* Chart */}
      <div className="flex-1 flex items-end space-x-1">
        {weekData.map((day, index) => (
          <div
            key={`${id}-${index}`}
            className="flex-1 flex flex-col items-center"
          >
            {/* Sleep bar */}
            <div className="w-full mb-0.5 flex justify-center">
              <div
                className="w-2.5 bg-indigo-500 rounded-t transition-all duration-300"
                style={{
                  height: `${getSleepBarHeight(day.sleep)}%`,
                  minHeight: "3px",
                }}
                title={`${day.sleep}h sleep`}
              ></div>
            </div>
            {/* Steps bar */}
            <div className="w-full mb-0.5 flex justify-center">
              <div
                className="w-2.5 bg-green-500 rounded-t transition-all duration-300"
                style={{
                  height: `${getStepBarHeight(day.steps)}%`,
                  minHeight: "3px",
                }}
                title={`${day.steps} steps`}
              ></div>
            </div>
            {/* Day label */}
            <div className="text-xs text-gray-400 mt-0.5">{day.day}</div>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="mt-2 flex justify-between text-xs text-gray-400">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-indigo-500 rounded mr-1"></div>
          <span>Sleep</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded mr-1"></div>
          <span>Steps</span>
        </div>
        <button
          onClick={generateRandomData}
          className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>
      <div className="mt-1 text-xs text-gray-500 text-right">
        Widget ID: {id.slice(0, 8)}
      </div>
    </div>
  );
};
