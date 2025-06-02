import { useUser } from "@/hooks/useUser";
import { Action, ActionPanel, Detail, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTimer } from "@/hooks/useTimer";

export default function Command() {
  const { pop } = useNavigation();
  const { startTimer, taskId, isRunning, stopTimer } = useTimer();
  const { isLoading: isLoadingUser } = useUser();
  const { isLoading: isLoadingTasks, tasks } = useTasks();
  const isLoading = useMemo(() => isLoadingUser || isLoadingTasks, [isLoadingTasks, isLoadingUser]);

  const onTaskSelected = (taskId: number) => {
    try {
      if (isRunning && taskId === taskId) {
        stopTimer();
        showToast({
          style: Toast.Style.Success,
          title: "Timer Stopped",
          message: `Timer stopped for "${tasks?.find((task) => task.id === taskId)?.title}"`,
        });
        pop();
        return;
      }
      if (!tasks) {
        throw new Error("No tasks available to select from.");
      }

      startTimer(taskId);

      showToast({
        style: Toast.Style.Success,
        title: "Timer Started",
        message: `Timer started for "${tasks?.find((task) => task.id === taskId)?.title}"`,
      });

      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Failed to select task: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      console.error("Error selecting task:", error);
    }
  };

  if (isLoading) {
    return <Detail isLoading={isLoading} markdown="Fetching user tasks..." />;
  }

  if (!tasks || tasks.length === 0) {
    return <Detail markdown="No tasks found." />;
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks..."
      actions={
        <ActionPanel>
          <ActionPanel.Item
            title="Refresh Tasks"
            onAction={() => {
              // Logic to refresh tasks can be added here
            }}
          />
        </ActionPanel>
      }
    >
      {tasks.map((task) => (
        <List.Item
          key={task.id}
          title={task.title}
          subtitle={isRunning && taskId === task.id ? "Timer is running" : "Click to start timer"}
          actions={
            <ActionPanel>
              <Action title="Start Timer for Task" onAction={() => onTaskSelected(task.id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
