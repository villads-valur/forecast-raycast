import { TaskV3 } from "@/types/forecast";
import { showToast, Toast, LocalStorage, updateCommandMetadata, getPreferenceValues } from "@raycast/api";
import { useLocalStorage, useFetch } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import { useUser } from "./useUser";
import { Preferences } from "@/types/preferences";
import { ROUTES } from "@/utils/routes";

interface TimerStatus {
  id?: number;
  task_id?: number;
  project_id?: number;
  start_time?: string;
  end_time?: string;
  person_id?: number;
  is_running?: boolean;
}

interface TimerStartPayload {
  task: number;
  project?: number | null;
}

interface TimerResponse {
  task?: number;
  project?: number;
  start_time?: string;
}

/**
 * Custom hook to manage a timer with Forecast API integration
 * Handles both local state and remote timer synchronization
 */
export function useTimer() {
  const { value: isRunning, setValue: setIsRunning } = useLocalStorage("timer-is-running", false);
  const { value: startTime, setValue: setStartTime } = useLocalStorage<string | null>("timer-start-time", null);
  const { value: taskId, setValue: setTaskId } = useLocalStorage<number | null>("timer-task-id", null);
  const { value: projectId, setValue: setProjectId } = useLocalStorage<number | null>("timer-project-id", null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isApiLoading, setIsApiLoading] = useState(false);

  const { user, isReady: isUserReady } = useUser();
  const { forecastApiKey } = getPreferenceValues<Preferences>();

  // Fetch timer status from API for synchronization
  const shouldFetchTimerStatus = Boolean(user?.id && forecastApiKey && isUserReady);

  const {
    data: apiTimerStatus,
    isLoading: isLoadingApiStatus,
    error: apiError,
    revalidate: refetchTimerStatus,
  } = useFetch<TimerStatus[]>(user?.id ? `https://api.forecast.it/api/v1/persons/${user.id}/timer` : "", {
    headers: forecastApiKey
      ? {
          "X-FORECAST-API-KEY": forecastApiKey,
        }
      : {},
    execute: shouldFetchTimerStatus,
    keepPreviousData: true,
    onError: (error) => {
      console.warn("Failed to fetch timer status from API:", error);
    },
  });

  // Sync API state with local storage when API data changes
  useEffect(() => {
    if (!apiTimerStatus || !Array.isArray(apiTimerStatus)) {
      return;
    }

    const syncApiWithLocal = async () => {
      // Find the currently running timer from API
      const runningTimer = apiTimerStatus.find((timer) => timer.start_time && !timer.end_time);

      if (runningTimer && runningTimer.task_id && runningTimer.start_time) {
        // Timer is running on server but not locally - sync it
        if (!isRunning || taskId !== runningTimer.task_id) {
          console.log("useTimer: Syncing running timer from API:", runningTimer);

          await setIsRunning(true);
          await setStartTime(runningTimer.start_time);
          await setTaskId(runningTimer.task_id);
          await setProjectId(runningTimer.project_id || null);

          // Update LocalStorage
          await LocalStorage.setItem("timer-is-running", true);
          await LocalStorage.setItem("timer-start-time", runningTimer.start_time);
          await LocalStorage.setItem("timer-task-id", runningTimer.task_id);
          if (runningTimer.project_id) {
            await LocalStorage.setItem("timer-project-id", runningTimer.project_id);
          }
        }
      } else if (!runningTimer && isRunning) {
        // No timer running on server but running locally - clear local state
        console.log("useTimer: Clearing local timer state (no timer running on server)");

        await setIsRunning(false);
        await setStartTime(null);
        await setTaskId(null);
        await setProjectId(null);

        // Clear LocalStorage
        await LocalStorage.removeItem("timer-is-running");
        await LocalStorage.removeItem("timer-start-time");
        await LocalStorage.removeItem("timer-task-id");
        await LocalStorage.removeItem("timer-project-id");
      }
    };

    syncApiWithLocal().catch(console.error);
  }, [apiTimerStatus, isRunning, taskId, setIsRunning, setStartTime, setTaskId, setProjectId]);

  // Set up periodic API sync
  useEffect(() => {
    if (!shouldFetchTimerStatus) return;

    // Sync with API every 30 seconds
    const syncInterval = setInterval(() => {
      refetchTimerStatus();
    }, 30000);

    return () => clearInterval(syncInterval);
  }, [shouldFetchTimerStatus, refetchTimerStatus]);

  /**
   * Start timer via Forecast API
   */
  const startTimerAPI = useCallback(
    async (task: TaskV3): Promise<TimerResponse | null> => {
      if (!task || !task.id) {
        throw new Error("Invalid task provided for starting timer");
      }
      if (!user?.id || !forecastApiKey) {
        throw new Error("User not authenticated or API key missing");
      }

      const payload: TimerStartPayload = {
        task: task.id,
      };

      const response = await fetch(ROUTES.timer.start(user.id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-FORECAST-API-KEY": forecastApiKey,
        },
        body: JSON.stringify(payload),
      });

      try {
        return await response.json();
      } catch (parseError) {
        // Some endpoints might return empty body on success
        console.warn("Could not parse timer start response:", parseError);
        return null;
      }
    },
    [user?.id, forecastApiKey],
  );

  /**
   * Stop timer via Forecast API
   */
  const stopTimerAPI = useCallback(async (): Promise<TimerResponse | null> => {
    if (!user?.id || !forecastApiKey) {
      throw new Error("User not authenticated or API key missing");
    }

    const response = await fetch(ROUTES.timer.stop(user.id), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-FORECAST-API-KEY": forecastApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Timer stop API error:", response.status, errorText);
      throw new Error(`Failed to stop timer: ${response.status} ${response.statusText}`);
    }

    try {
      return await response.json();
    } catch (parseError) {
      // Some endpoints might return empty body on success
      console.warn("Could not parse timer stop response:", parseError);
      return null;
    }
  }, [user?.id, forecastApiKey]);

  /**
   * Start timer for a specific task
   */
  const startTimer = useCallback(
    async (task: TaskV3) => {
      if (!isUserReady) {
        await showToast({
          style: Toast.Style.Failure,
          title: "User Not Ready",
          message: "Please wait for user authentication to complete",
        });
        return;
      }

      // If timer is already running for a different task, stop it first
      if (isRunning && taskId && taskId !== task.id) {
        await stopTimer();
      }

      // Don't start if already running for the same task
      if (isRunning && taskId === task.id) {
        await showToast({
          style: Toast.Style.Animated,
          title: "Timer Already Running",
          message: `Timer is already active for this task`,
        });
        return;
      }

      setIsApiLoading(true);
      const loadingToast = await showToast({
        style: Toast.Style.Animated,
        title: "Starting Timer",
        message: `Starting timer for "${task.title}"...`,
      });

      try {
        // Start timer via API
        await startTimerAPI(task);

        const now = new Date().toISOString();

        // Update reactive state
        await setIsRunning(true);
        await setStartTime(now);
        await setTaskId(task.id);
        await setProjectId(task.project_id || null);

        // Also set in LocalStorage for menubar to access
        await LocalStorage.setItem("timer-is-running", true);
        await LocalStorage.setItem("timer-start-time", now);
        await LocalStorage.setItem("timer-task-id", task.id);
        if (task.project_id) {
          await LocalStorage.setItem("timer-project-id", task.project_id);
        }

        // Refresh API state to ensure sync
        setTimeout(() => {
          refetchTimerStatus();
        }, 1000);

        loadingToast.style = Toast.Style.Success;
        loadingToast.title = "Timer Started";
        loadingToast.message = `Timer started for "${task.title}"`;

        console.log("Timer started successfully:", {
          taskId: task.id,
          projectId: task.project_id,
          startTime: now,
        });
      } catch (error) {
        console.error("Failed to start timer:", error);

        loadingToast.style = Toast.Style.Failure;
        loadingToast.title = "Failed to Start Timer";
        loadingToast.message = error instanceof Error ? error.message : "Unknown error occurred";
      } finally {
        setIsApiLoading(false);
      }
    },
    [
      isUserReady,
      isRunning,
      taskId,
      startTimerAPI,
      setIsRunning,
      setStartTime,
      setTaskId,
      setProjectId,
      refetchTimerStatus,
    ],
  );

  /**
   * Stop the currently running timer
   */
  const stopTimer = useCallback(async () => {
    if (!isRunning || !startTime) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No Active Timer",
        message: "No timer is currently running",
      });
      return;
    }

    setIsApiLoading(true);
    const loadingToast = await showToast({
      style: Toast.Style.Animated,
      title: "Stopping Timer",
      message: "Stopping timer...",
    });

    try {
      // Stop timer via API
      await stopTimerAPI();

      // Calculate final elapsed time
      const finalElapsed = Date.now() - new Date(startTime).getTime();
      const hours = Math.floor(finalElapsed / 3600000);
      const minutes = Math.floor((finalElapsed % 3600000) / 60000);
      const seconds = Math.floor((finalElapsed % 60000) / 1000);

      let elapsedMessage = "";
      if (hours > 0) {
        elapsedMessage = `${hours}h ${minutes}m ${seconds}s`;
      } else if (minutes > 0) {
        elapsedMessage = `${minutes}m ${seconds}s`;
      } else {
        elapsedMessage = `${seconds}s`;
      }

      // Clear local state
      await setIsRunning(false);
      await setStartTime(null);
      await setTaskId(null);
      await setProjectId(null);

      await LocalStorage.removeItem("timer-is-running");
      await LocalStorage.removeItem("timer-start-time");
      await LocalStorage.removeItem("timer-task-id");
      await LocalStorage.removeItem("timer-project-id");

      loadingToast.style = Toast.Style.Success;
      loadingToast.title = "Timer Stopped";
      loadingToast.message = `Elapsed time: ${elapsedMessage}`;

      console.log("Timer stopped successfully:", {
        elapsedTime: finalElapsed,
        formattedTime: elapsedMessage,
      });
    } catch (error) {
      console.error("Failed to stop timer:", error);

      loadingToast.style = Toast.Style.Failure;
      loadingToast.title = "Failed to Stop Timer";
      loadingToast.message = error instanceof Error ? error.message : "Unknown error occurred";
    } finally {
      setIsApiLoading(false);
    }
  }, [isRunning, startTime, stopTimerAPI, setIsRunning, setStartTime, setTaskId, setProjectId]);

  /**
   * Clear local timer state
   */
  const clearLocalTimerState = useCallback(async () => {
    await setIsRunning(false);
    await setStartTime(null);
    await setTaskId(null);
    await setProjectId(null);

    // Clear LocalStorage
    await LocalStorage.removeItem("timer-is-running");
    await LocalStorage.removeItem("timer-start-time");
    await LocalStorage.removeItem("timer-task-id");
    await LocalStorage.removeItem("timer-project-id");
  }, [setIsRunning, setStartTime, setTaskId, setProjectId]);

  // Calculate elapsed time if the timer is running
  useEffect(() => {
    if (isRunning && startTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const startDate = new Date(startTime);
        const timeElapsed = now.getTime() - startDate.getTime();
        setElapsedTime(timeElapsed);
      }, 1000); // Update every second

      // Calculate initial elapsed time
      const now = new Date();
      const startDate = new Date(startTime);
      const initialElapsed = now.getTime() - startDate.getTime();
      setElapsedTime(initialElapsed);

      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [isRunning, startTime]);

  // Update command metadata for better UX
  useEffect(() => {
    const updateMetadata = async () => {
      if (isRunning && taskId) {
        await updateCommandMetadata({
          subtitle: "Timer running",
        });
      } else {
        await updateCommandMetadata({
          subtitle: undefined,
        });
      }
    };

    updateMetadata().catch(console.error);
  }, [isRunning, taskId]);

  return {
    isRunning: Boolean(isRunning),
    startTimer,
    stopTimer,
    elapsedTime,
    taskId,
    projectId,
    isApiLoading,
    isReady: isUserReady && Boolean(forecastApiKey),
    isSyncing: isLoadingApiStatus,
    syncError: apiError,
    clearLocalTimerState,
  };
}
