import { TaskV3 } from "@/types/forecast";
import { showToast, Toast } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";

/**
 * Custom hook to manage a simple timer. The timer indicates the time tracked on a task.
 **/
export function useTimer() {
  const { value: isRunning, setValue: setIsRunning } = useLocalStorage("timer-is-running", false);
  const { value: startTime, setValue: setStartTime } = useLocalStorage<Date | null>("timer-start-time", null);
  const { value: taskId, setValue: setTaskId } = useLocalStorage<number | null>("timer-task-id", null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  const startTimer = useCallback(
    (taskId: TaskV3["id"]) => {
      console.log("Starting timer for task ID:", taskId);
      if (isRunning) return;
      setIsRunning(true);
      setStartTime(new Date());
      setTaskId(taskId);
    },
    [isRunning],
  );

  const stopTimer = useCallback(() => {
    if (!isRunning || !startTime) return;
    setIsRunning(false);
    setStartTime(null);
    setTaskId(null);
    showToast({
      style: Toast.Style.Success,
      title: "Timer Stopped",
      message: `Elapsed time: ${Math.floor(elapsedTime / 1000)} seconds`,
    });
  }, [isRunning, startTime, elapsedTime, setIsRunning, setStartTime, setTaskId]);

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setStartTime(null);
  }, []);

  // Calculate elapsed time if the timer is running
  useEffect(() => {
    if (isRunning && startTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const timeElapsed = now.getTime() - startTime.getTime();
        setElapsedTime(timeElapsed);
      }, 1000); // Update every second

      return () => clearInterval(interval);
    }
  }, [isRunning, startTime]);

  return {
    isRunning,
    startTimer,
    stopTimer,
    resetTimer,
    elapsedTime,
    taskId,
  };
}
