"use client";

import { useEffect, useRef } from "react";
import { usePriceStore } from "@/stores/price-store";
import type { PriceUpdate } from "@/types";

/**
 * Connects to the SSE price stream and feeds updates into the Zustand store.
 * Handles reconnection with exponential backoff.
 */
export function usePriceStream() {
  const updatePrice = usePriceStore((s) => s.updatePrice);
  const retryCount = useRef(0);
  const maxRetries = 5;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      eventSource = new EventSource("/api/stream/prices");

      eventSource.onmessage = (event) => {
        try {
          const update: PriceUpdate = JSON.parse(event.data);
          updatePrice(update);
          retryCount.current = 0; // Reset on successful message
        } catch {
          // Ignore malformed messages
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        if (retryCount.current < maxRetries) {
          const delay = Math.pow(2, retryCount.current) * 1000;
          retryCount.current++;
          reconnectTimeout = setTimeout(connect, delay);
        }
      };
    }

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(reconnectTimeout);
    };
  }, [updatePrice]);
}
