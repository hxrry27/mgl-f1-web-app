"use client";

import { cn } from "@/lib/utils";

export function ShineBorder({
  className,
  duration = 14,
  color = ["#22d3ee", "#14b8a6", "#06b6d4"],
  ...props
}) {
  return (
    <div
      style={{
        "--duration": `${duration}s`,
        "--color-1": Array.isArray(color) ? color[0] : color,
        "--color-2": Array.isArray(color) ? color[1] : color,
        "--color-3": Array.isArray(color) ? color[2] : color,
      }}
      className={cn(
        "pointer-events-none absolute -inset-[1px] rounded-[inherit] opacity-100",
        "before:absolute before:inset-0 before:rounded-[inherit] before:bg-[linear-gradient(to_right,var(--color-1),var(--color-2),var(--color-3),var(--color-2),var(--color-1))] before:bg-[length:200%_100%] before:animate-shine-border",
        "after:absolute after:inset-[1px] after:rounded-[inherit] after:bg-primary",
        className
      )}
      {...props}
    />
  );
}