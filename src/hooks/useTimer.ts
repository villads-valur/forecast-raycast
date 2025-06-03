import { TaskV3 } from "@/types/forecast";
import { showToast, Toast, LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";

/**
 * Custom hook to manage a simple timer. The timer indicates the time tracked on a task.
 **/
export function useTimer() {
  const { value: isRunning, setValue: setIsRunning } = useLocalStorage("timer-is-running", false);
  const { value: startTime, setValue: setStartTime } = useLocalStorage<string | null>("timer-start-time", null);
  const { value: taskId, setValue: setTaskId } = useLocalStorage<number | null>("timer-task-id", null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const startTimer = useCallback(
    async (newTaskId: TaskV3["id"]) => {
      console.log("Starting timer for task ID:", newTaskId);

      // If timer is already running for a different task, stop it first
      if (isRunning && taskId && taskId !== newTaskId) {
        await stopTimer();
      }

      // Don't start if already running for the same task
      if (isRunning && taskId === newTaskId) {
        return;
      }

      const now = new Date().toISOString();

      // Update reactive state
      await setIsRunning(true);
      await setStartTime(now);
      await setTaskId(newTaskId);

      // Also set in LocalStorage for menubar to access
      await LocalStorage.setItem("timer-is-running", true);
      await LocalStorage.setItem("timer-start-time", now);
      await LocalStorage.setItem("timer-task-id", newTaskId);

      console.log("Timer started - Start time:", now, "Task ID:", newTaskId);
    },
    [isRunning, taskId, setIsRunning, setStartTime, setTaskId],
  );

  const stopTimer = useCallback(async () => {
    if (!isRunning || !startTime) return;

    console.log("Stopping timer - was running:", isRunning, "start time:", startTime);

    // Update reactive state
    await setIsRunning(false);
    await setStartTime(null);
    await setTaskId(null);

    // Also clear from LocalStorage
    await LocalStorage.removeItem("timer-is-running");
    await LocalStorage.removeItem("timer-start-time");
    await LocalStorage.removeItem("timer-task-id");

    showToast({
      style: Toast.Style.Success,
      title: "Timer Stopped",
      message: `Elapsed time: ${Math.floor(elapsedTime / 1000)} seconds`,
    });
  }, [isRunning, startTime, elapsedTime, setIsRunning, setStartTime, setTaskId]);

  const resetTimer = useCallback(async () => {
    await setIsRunning(false);
    await setStartTime(null);
    await setTaskId(null);

    // Also clear from LocalStorage
    await LocalStorage.removeItem("timer-is-running");
    await LocalStorage.removeItem("timer-start-time");
    await LocalStorage.removeItem("timer-task-id");
  }, [setIsRunning, setStartTime, setTaskId]);

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

  return {
    isRunning: Boolean(isRunning),
    startTimer,
    stopTimer,
    resetTimer,
    elapsedTime,
    taskId,
  };
}
