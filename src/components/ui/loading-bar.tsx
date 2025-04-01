import React from "react";
import { cn } from "@/lib/utils"; // For combining class names

interface LoadingBarProps extends React.HTMLAttributes<HTMLDivElement> {
  isLoading: boolean; // Control animation visibility
  colorClassName?: string; // e.g., 'bg-blue-500'
}

export const LoadingBar: React.FC<LoadingBarProps> = ({
  isLoading, // Destructure isLoading
  className,
  colorClassName = "bg-blue-500", // Default color
  ...props
}) => {
  return (
    <div
      className={cn(
        "relative h-0.5 w-full overflow-hidden bg-gray-200 dark:bg-gray-700", // Container bar
        className
      )}
      {...props}
    >
      {/* Inner animated bar - Conditionally render based on isLoading */}
      {isLoading && (
        <div
          className={cn(
            "absolute left-0 top-0 h-full w-full animate-loading-bar", // Base styles + animation
            colorClassName
          )}
          style={{
            // Simple animation using transform
            transformOrigin: "left center",
          }}
        ></div>
      )}
    </div>
  );
};

// Add the keyframes animation to your global CSS (e.g., src/index.css)
/*
@keyframes loading-bar {
  0% {
    transform: translateX(-100%) scaleX(0.1);
  }
  50% {
    transform: translateX(0%) scaleX(0.8);
  }
  100% {
    transform: translateX(100%) scaleX(0.1);
  }
}

.animate-loading-bar {
  animation: loading-bar 1.5s infinite ease-in-out;
}
*/
