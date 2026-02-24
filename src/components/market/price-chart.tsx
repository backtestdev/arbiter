"use client";

import { useMemo, useId } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

interface PriceChartProps {
  data: { timestamp: number; price: number }[];
  height?: number;
  width?: string;
  color?: string;
  showTooltip?: boolean;
  className?: string;
}

function formatTooltipTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTooltipPrice(price: number): string {
  return `${Math.round(price * 100)}¢`;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { timestamp: number; price: number } }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const point = payload[0];
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-card border border-arbiter-border-subtle"
      style={{ background: "rgba(19, 19, 26, 0.95)", backdropFilter: "blur(12px)" }}
    >
      <p className="text-sm font-semibold tabular-nums text-text-primary">
        {formatTooltipPrice(point.value)}
      </p>
      <p className="text-2xs text-text-tertiary mt-0.5">
        {formatTooltipTime(point.payload.timestamp)}
      </p>
    </div>
  );
}

export function PriceChart({
  data,
  height = 64,
  width = "100%",
  color = "#6366F1",
  showTooltip = false,
  className,
}: PriceChartProps) {
  const gradientId = useId();
  const safeGradientId = gradientId.replace(/:/g, "_");

  const domain = useMemo(() => {
    if (!data.length) return [0, 1] as [number, number];
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1 || 0.01;
    return [min - padding, max + padding] as [number, number];
  }, [data]);

  if (!data.length) {
    return (
      <div
        className={cn("flex items-center justify-center text-text-muted text-2xs", className)}
        style={{ height, width }}
      >
        No data
      </div>
    );
  }

  return (
    <div className={cn("select-none", className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={safeGradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis dataKey="timestamp" hide />
          <YAxis domain={domain} hide />

          {showTooltip && (
            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "rgba(255, 255, 255, 0.08)",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
              isAnimationActive={false}
              allowEscapeViewBox={{ x: true, y: true }}
            />
          )}

          <Area
            type="monotone"
            dataKey="price"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#${safeGradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriceChartSkeleton({
  height = 64,
  width = "100%",
  className,
}: {
  height?: number;
  width?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-lg", className)}
      style={{ width, height }}
    >
      {/* Shimmer base */}
      <div className="absolute inset-0 bg-arbiter-elevated/50 rounded-lg" />

      {/* Fake sparkline path */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 200 50"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 35 Q25 30 50 28 T100 22 T150 25 T200 20"
          stroke="rgba(255, 255, 255, 0.04)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M0 35 Q25 30 50 28 T100 22 T150 25 T200 20 V50 H0 Z"
          fill="rgba(255, 255, 255, 0.02)"
        />
      </svg>

      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 animate-shimmer rounded-lg"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.03) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
      />
    </div>
  );
}
