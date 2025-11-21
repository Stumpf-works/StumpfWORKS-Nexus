import { useMemo } from "react";
import { cn } from "../../lib/utils";

interface LatencyGraphProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  showLabels?: boolean;
}

export default function LatencyGraph({
  data,
  width = 200,
  height = 60,
  className,
  showLabels = true,
}: LatencyGraphProps) {
  const { path, minLatency, maxLatency, avgLatency, color } = useMemo(() => {
    if (data.length < 2) {
      return { path: "", minLatency: 0, maxLatency: 0, avgLatency: 0, color: "#34C759" };
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    const range = max - min || 1;

    // Padding for the graph
    const padding = 4;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Generate SVG path
    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * graphWidth;
      const y = padding + graphHeight - ((value - min) / range) * graphHeight;
      return `${x},${y}`;
    });

    const pathData = `M ${points.join(" L ")}`;

    // Determine color based on average latency
    let lineColor = "#34C759"; // Green (good)
    if (avg > 100) lineColor = "#FF9500"; // Orange (warning)
    if (avg > 300) lineColor = "#FF3B30"; // Red (bad)

    return {
      path: pathData,
      minLatency: min,
      maxLatency: max,
      avgLatency: avg,
      color: lineColor,
    };
  }, [data, width, height]);

  if (data.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-text-secondary text-xs",
          className
        )}
        style={{ width, height }}
      >
        Collecting data...
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width={width} height={height} fill="url(#grid)" />

        {/* Gradient fill under line */}
        <defs>
          <linearGradient id={`latency-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d={`${path} L ${width - 4},${height - 4} L 4,${height - 4} Z`}
          fill={`url(#latency-gradient-${color})`}
        />

        {/* Main line */}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Latest point indicator */}
        {data.length > 0 && (
          <circle
            cx={width - 4}
            cy={
              4 +
              (height - 8) -
              ((data[data.length - 1] - minLatency) / (maxLatency - minLatency || 1)) *
                (height - 8)
            }
            r="3"
            fill={color}
            stroke="white"
            strokeWidth="1.5"
          />
        )}
      </svg>

      {/* Labels */}
      {showLabels && (
        <div className="flex justify-between mt-1 text-xs text-text-secondary">
          <span>{Math.round(minLatency)}ms</span>
          <span className="font-medium" style={{ color }}>
            avg: {Math.round(avgLatency)}ms
          </span>
          <span>{Math.round(maxLatency)}ms</span>
        </div>
      )}
    </div>
  );
}

// Hook for managing latency data
import { useState, useEffect, useCallback } from "react";

export function useLatencyData(maxPoints: number = 30) {
  const [data, setData] = useState<number[]>([]);

  const addPoint = useCallback((latency: number) => {
    setData((prev) => {
      const newData = [...prev, latency];
      if (newData.length > maxPoints) {
        return newData.slice(-maxPoints);
      }
      return newData;
    });
  }, [maxPoints]);

  const clear = useCallback(() => {
    setData([]);
  }, []);

  return { data, addPoint, clear };
}

// Latency indicator badge
interface LatencyBadgeProps {
  latency: number | null;
  className?: string;
}

export function LatencyBadge({ latency, className }: LatencyBadgeProps) {
  if (latency === null) {
    return (
      <span className={cn("text-xs text-text-secondary", className)}>
        --ms
      </span>
    );
  }

  let color = "text-success";
  if (latency > 100) color = "text-warning";
  if (latency > 300) color = "text-error";

  return (
    <span className={cn("text-xs font-medium", color, className)}>
      {latency}ms
    </span>
  );
}

// Animated ping indicator
interface PingIndicatorProps {
  status: "connected" | "connecting" | "disconnected" | "error";
  className?: string;
}

export function PingIndicator({ status, className }: PingIndicatorProps) {
  const statusConfig = {
    connected: {
      color: "bg-success",
      animate: false,
    },
    connecting: {
      color: "bg-warning",
      animate: true,
    },
    disconnected: {
      color: "bg-gray-400",
      animate: false,
    },
    error: {
      color: "bg-error",
      animate: true,
    },
  };

  const config = statusConfig[status];

  return (
    <span className={cn("relative flex h-2 w-2", className)}>
      {config.animate && (
        <span
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            config.color
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full h-2 w-2",
          config.color
        )}
      />
    </span>
  );
}
