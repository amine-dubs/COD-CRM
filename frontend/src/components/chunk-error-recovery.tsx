"use client";

import { useEffect } from "react";

const RELOAD_FLAG_KEY = "__chunk_error_reloaded_once__";
const CHUNK_PATTERNS = [
  /chunkloaderror/i,
  /failed to load chunk/i,
  /loading chunk .* failed/i,
  /css_chunk_load_failed/i,
];

function toMessage(error: unknown): string {
  if (!error) {
    return "";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isChunkError(error: unknown): boolean {
  const message = toMessage(error);
  return CHUNK_PATTERNS.some((pattern) => pattern.test(message));
}

export function ChunkErrorRecovery() {
  useEffect(() => {
    const reloadOnce = () => {
      if (sessionStorage.getItem(RELOAD_FLAG_KEY) === "1") {
        return;
      }

      sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
      window.location.reload();
    };

    const onWindowError = (event: ErrorEvent) => {
      if (isChunkError(event.error ?? event.message)) {
        reloadOnce();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason)) {
        reloadOnce();
      }
    };

    // Clear the guard after a successful render to allow future recovery.
    const cleanupTimer = window.setTimeout(() => {
      sessionStorage.removeItem(RELOAD_FLAG_KEY);
    }, 5000);

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.clearTimeout(cleanupTimer);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
