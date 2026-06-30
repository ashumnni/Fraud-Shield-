"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { FraudAnalysisResult } from "@/types";

export function useSSE(maxItems = 50) {
  const [events, setEvents] = useState<FraudAnalysisResult[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (esRef.current) return;
    const es = new EventSource("http://localhost:8000/api/v1/stream");
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      es.close();
      esRef.current = null;
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "heartbeat" || data.type === "connected") return;
        setEvents((prev) => [data, ...prev].slice(0, maxItems));
      } catch {
        // ignore parse errors
      }
    };
  }, [maxItems]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [connect]);

  return { events, connected };
}
