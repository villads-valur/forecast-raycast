import { MenuBarExtra } from "@raycast/api";
import { useTimer } from "./hooks/useTimer";
import { useMemo } from "react";
import { useTasks } from "./hooks/useTasks";

export default function MenubarTimer() {
  const { isRunning, elapsedTime, taskId } = useTimer();
  const { tasks } = useTasks();

  const timer = useMemo(() => {
    if (!isRunning) return "00:00:00";
    const hours = Math.floor(elapsedTime / 3600000);
    const minutes = Math.floor((elapsedTime % 3600000) / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }, [isRunning, elapsedTime]);

  const taskTitle = useMemo(() => {
    if (!isRunning || !tasks || tasks.length === 0) return "No active task";

    const activeTask = tasks.find((task) => task.id === taskId);

    //truncate the title to 30 characters if it's too long
    if (activeTask && activeTask.title.length > 20) return `${activeTask.title.substring(0, 20)}...`;

    return activeTask?.title;
  }, [tasks, isRunning, taskId]);

  return (
    <MenuBarExtra
      icon={isRunning ? "timer-running.png" : "timer-stopped.png"}
      title={isRunning ? `${taskTitle} - ${timer}` : undefined}
      tooltip={isRunning ? "Click to stop the timer" : "Click to start the timer"}
    />
  );
}
