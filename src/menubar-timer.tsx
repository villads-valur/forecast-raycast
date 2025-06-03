import { MenuBarExtra, showHUD, LocalStorage } from "@raycast/api";
import { useMemo, useEffect, useState, useCallback } from "react";
import { useTasks } from "./hooks/useTasks";

export default function MenubarTimer() {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastStateCheck, setLastStateCheck] = useState<string>("");
  const { tasks } = useTasks();

  // Load timer state from LocalStorage
  const loadTimerState = useCallback(async () => {
    try {
      const running = await LocalStorage.getItem<boolean>("timer-is-running");
      const start = await LocalStorage.getItem<string>("timer-start-time");
      const id = await LocalStorage.getItem<number>("timer-task-id");

      const stateSignature = `${Boolean(running)}-${start || "null"}-${id || "null"}`;

      if (stateSignature !== lastStateCheck) {
        console.log("MenuBar: State changed from", lastStateCheck, "to", stateSignature);
        setIsRunning(Boolean(running));
        setStartTime(start || null);
        setTaskId(id || null);
        setLastStateCheck(stateSignature);

        // If timer was stopped, reset elapsed time immediately
        if (!running) {
          setElapsedTime(0);
        }
      }
    } catch (error) {
      console.error("Error loading timer state:", error);
    }
  }, [lastStateCheck]);

  // Initial load and periodic state checking
  useEffect(() => {
    loadTimerState();

    // Check for state changes every 2 seconds
    const stateInterval = setInterval(loadTimerState, 2000);

    return () => clearInterval(stateInterval);
  }, [loadTimerState]);

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (!isRunning || !startTime) {
      setElapsedTime(0);
      return;
    }

    const updateElapsedTime = () => {
      const now = Date.now();
      const start = new Date(startTime).getTime();
      const elapsed = now - start;
      setElapsedTime(Math.max(0, elapsed));
    };

    // Calculate initial elapsed time
    updateElapsedTime();

    // Update every second
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const timer = useMemo(() => {
    if (!isRunning || elapsedTime <= 0) return "00:00:00";

    const totalSeconds = Math.floor(elapsedTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [isRunning, elapsedTime]);

  const taskTitle = useMemo(() => {
    if (!isRunning || !tasks || tasks.length === 0 || !taskId) return "No active task";

    const activeTask = tasks.find((task) => task.id === taskId);

    if (!activeTask) return "Task not found";

    // Truncate the title to 25 characters if it's too long
    if (activeTask.title.length > 25) {
      return `${activeTask.title.substring(0, 25)}...`;
    }

    return activeTask.title;
  }, [tasks, isRunning, taskId]);

  const activeTask = useMemo(() => {
    if (!isRunning || !tasks || tasks.length === 0 || !taskId) return null;
    return tasks.find((task) => task.id === taskId) || null;
  }, [tasks, isRunning, taskId]);

  const handleStopTimer = async () => {
    try {
      // Stop the timer
      await LocalStorage.removeItem("timer-is-running");
      await LocalStorage.removeItem("timer-start-time");
      await LocalStorage.removeItem("timer-task-id");

      // Update local state immediately
      setIsRunning(false);
      setStartTime(null);
      setTaskId(null);
      setElapsedTime(0);
      setLastStateCheck(`false-null-null`);

      await showHUD("Timer stopped");
    } catch (error) {
      console.error("Error stopping timer:", error);
      await showHUD("Error stopping timer");
    }
  };

  if (!isRunning || !taskId) {
    return (
      <MenuBarExtra icon="timer-stopped.png" title="No active task" tooltip="No timer is currently running">
        <MenuBarExtra.Section title="Timer Status">
          <MenuBarExtra.Item title="No timer running" subtitle="Start a timer from the task view" />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra icon="timer-running.png" title={`${timer}`} tooltip={`Timer running for: ${taskTitle}`}>
      <MenuBarExtra.Section title="Active Timer">
        <MenuBarExtra.Item title={taskTitle} subtitle={`T${activeTask?.company_task_id || taskId} • ${timer}`} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item title="Stop Timer" onAction={handleStopTimer} />
        {activeTask && (
          <MenuBarExtra.Item
            title="Open Task in Forecast"
            onAction={async () => {
              const url = `https://app.forecast.it/T${activeTask.company_task_id}`;
              const { exec } = require("child_process");
              exec(`open "${url}"`);
            }}
          />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Details">
        <MenuBarExtra.Item
          title="Project"
          subtitle={activeTask?.project_id ? `Project ${activeTask.project_id}` : "No project"}
        />
        {activeTask?.blocked && <MenuBarExtra.Item title="Status" subtitle="🚫 Blocked" />}
        {activeTask?.bug && <MenuBarExtra.Item title="Type" subtitle="🐛 Bug" />}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
