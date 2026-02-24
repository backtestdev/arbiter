"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns a flash direction ("up" | "down" | null) whenever the value changes.
 * The flash auto-clears after the animation duration.
 */
export function usePriceFlash(value: number, duration = 600): "up" | "down" | null {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevRef = useRef(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (prevRef.current !== value) {
      const direction = value > prevRef.current ? "up" : "down";
      setFlash(direction);
      prevRef.current = value;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setFlash(null), duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, duration]);

  return flash;
}
