import { MenuBarExtra, showHUD } from "@raycast/api";
import { useMemo } from "react";
import { useTasks } from "./hooks/useTasks";
import { useTimer } from "./hooks/useTimer";

export default function MenubarTimer() {
  const { isRunning, elapsedTime, taskId, projectId, stopTimer, isApiLoading, isReady: isTimerReady } = useTimer();

  const { tasks } = useTasks();

  // Format timer display
  const timer = useMemo(() => {
    if (!isRunning || elapsedTime <= 0) return "00:00:00";

    const totalSeconds = Math.floor(elapsedTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [isRunning, elapsedTime]);

  // Get current task information
  const activeTask = useMemo(() => {
    if (!isRunning || !tasks || tasks.length === 0 || !taskId) return null;
    return tasks.find((task) => task.id === taskId) || null;
  }, [tasks, isRunning, taskId]);

  const taskTitle = useMemo(() => {
    if (!isRunning || !taskId) return "No active task";

    if (!activeTask) return `Task ${taskId}`;

    // Truncate the title to 25 characters if it's too long
    if (activeTask.title.length > 25) {
      return `${activeTask.title.substring(0, 25)}...`;
    }

    return activeTask.title;
  }, [isRunning, taskId, activeTask]);

  /**
   * Handle stop timer from menubar
   */
  const handleStopTimer = async () => {
    if (!isTimerReady) {
      await showHUD("Timer service not ready");
      return;
    }

    await stopTimer();
  };

  /**
   * Open task in Forecast web app
   */
  const handleOpenTask = async () => {
    if (!activeTask) return;

    const url = `https://app.forecast.it/T${activeTask.company_task_id}`;
    open(url);
  };

  // Show when no timer is running
  if (!isRunning || !taskId) {
    return (
      <MenuBarExtra icon="timer-stopped.png" title="No active task" tooltip="No timer is currently running">
        <MenuBarExtra.Section title="Timer Status">
          <MenuBarExtra.Item title="No timer running" subtitle="Start a timer from the task view" />
          {!isTimerReady && <MenuBarExtra.Item title="Service Status" subtitle="⚠️ Timer service not ready" />}
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  // Show when timer is running
  return (
    <MenuBarExtra icon="timer-running.png" title={`${timer}`} tooltip={`Timer running for: ${taskTitle}`}>
      <MenuBarExtra.Section title="Active Timer">
        <MenuBarExtra.Item title={taskTitle} subtitle={`T${activeTask?.company_task_id || taskId} • ${timer}`} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Actions">
        <MenuBarExtra.Item
          title={isApiLoading ? "Stopping..." : "Stop Timer"}
          onAction={isApiLoading ? undefined : handleStopTimer}
        />
        {activeTask && <MenuBarExtra.Item title="Open Task in Forecast" onAction={handleOpenTask} />}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Details">
        <MenuBarExtra.Item
          title="Project"
          subtitle={
            activeTask?.project_id
              ? `Project ${activeTask.project_id}`
              : projectId
                ? `Project ${projectId}`
                : "No project"
          }
        />
        {activeTask?.blocked && <MenuBarExtra.Item title="Status" subtitle="🚫 Blocked" />}
        {activeTask?.bug && <MenuBarExtra.Item title="Type" subtitle="🐛 Bug" />}
        {activeTask?.high_priority && <MenuBarExtra.Item title="Priority" subtitle="⚡ High Priority" />}
        {activeTask?.un_billable && <MenuBarExtra.Item title="Billing" subtitle="💸 Non-billable" />}
      </MenuBarExtra.Section>

      {!isTimerReady && (
        <MenuBarExtra.Section title="Status">
          <MenuBarExtra.Item title="Service Status" subtitle="⚠️ Timer service not ready" />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
