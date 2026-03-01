"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { HealthStatus } from "@/lib/types";

export function useHealth(pollInterval = 30000) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await api.getHealth();
        setHealth(data);
        setIsOnline(data.status === "ok");
      } catch {
        setIsOnline(false);
        setHealth(null);
      } finally {
        setIsLoading(false);
      }
    };
    check();
    const interval = setInterval(check, pollInterval);
    return () => clearInterval(interval);
  }, [pollInterval]);

  return { health, isOnline, isLoading };
}
