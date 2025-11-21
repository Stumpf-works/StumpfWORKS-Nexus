import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { AppEvent } from "../types";

/**
 * Hook to invoke Tauri commands with error handling
 */
export function useTauriCommand<T, Args extends unknown[] = []>(
  command: string
) {
  const execute = useCallback(
    async (...args: Args): Promise<T> => {
      try {
        return await invoke<T>(command, args[0] as Record<string, unknown>);
      } catch (error) {
        console.error(`Tauri command "${command}" failed:`, error);
        throw error;
      }
    },
    [command]
  );

  return execute;
}

/**
 * Hook to listen to Tauri events
 */
export function useTauriEvent(
  eventName: string,
  handler: (event: AppEvent) => void
) {
  useEffect(() => {
    let unlisten: UnlistenFn;

    const setupListener = async () => {
      unlisten = await listen<AppEvent>(eventName, (event) => {
        handler(event.payload);
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [eventName, handler]);
}

/**
 * Hook to check if running in Tauri
 */
export function useIsTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}
