import { useUser } from "@/hooks/useUser";
import { Action, ActionPanel, Detail, List, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTimer } from "@/hooks/useTimer";
import { launchCommand, LaunchType } from "@raycast/api";
import { ROUTES } from "./utils/routes";

export default function Command() {
  const { startTimer, taskId: currentTaskId, isRunning, stopTimer } = useTimer(); // ✅ Renamed for clarity
  const { isLoading: isLoadingUser } = useUser();
  const { isLoading: isLoadingTasks, tasks, error } = useTasks();
  const isLoading = useMemo(() => isLoadingUser || isLoadingTasks, [isLoadingTasks, isLoadingUser]);

  const onTaskSelected = async (taskId: number) => {
    try {
      if (!tasks) {
        throw new Error("No tasks available to select from.");
      }

      if (isRunning && taskId === currentTaskId) {
        stopTimer();
        showToast({
          style: Toast.Style.Success,
          title: "Timer Stopped",
          message: `Timer stopped for "${tasks?.find((task) => task.id === taskId)?.title}"`,
        });
        return;
      }

      startTimer(taskId);

      await launchCommand({
        name: "menubar-timer",
        type: LaunchType.UserInitiated,
        context: {
          taskId: taskId.toString(),
          isRunning: "true",
          elapsedTime: "0",
        },
      });

      showToast({
        style: Toast.Style.Success,
        title: "Timer Started",
        message: `Timer started for "${tasks?.find((task) => task.id === taskId)?.title}"`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: `Failed to select task: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      console.error("Error selecting task:", error);
    }
  };

  if (error) {
    return (
      <Detail
        markdown={`# Error Loading Tasks\n\n${error.message}\n\nPlease check your API key and internet connection.`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={() => window.location.reload()} />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return <Detail isLoading={isLoading} markdown="Fetching user tasks..." />;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Detail
        markdown="# No Tasks Found\n\nNo tasks are currently assigned to you or match the recent activity filter."
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={() => window.location.reload()} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search tasks...">
      {tasks.map((task) => (
        <List.Item
          key={task.id}
          title={`T${task.company_task_id} - ${task.title}`}
          subtitle={isRunning && currentTaskId === task.id ? "⏱️ Timer is running" : "Click to start timer"}
          actions={
            <ActionPanel>
              <Action
                title={isRunning && currentTaskId === task.id ? "⛔ Stop Timer" : "✅ Start Timer"}
                onAction={() => onTaskSelected(task.id)}
              />
              <Action.OpenInBrowser title="Open in Forecast" url={ROUTES.tasks.browserURL(task.company_task_id)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
