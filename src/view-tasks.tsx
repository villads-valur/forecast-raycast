import { useUser } from "@/hooks/useUser";
import { Action, ActionPanel, Detail, List, showToast, Toast, Icon } from "@raycast/api";
import { useMemo, useState } from "react";
import { useTasks } from "@/hooks/useTasks";
import { useTimer } from "@/hooks/useTimer";
import { launchCommand, LaunchType } from "@raycast/api";
import { ROUTES } from "@/utils/routes";
import { TaskV3 } from "@/types/forecast";

// Helper function to format task subtitle
function getTaskSubtitle(task: TaskV3): string {
  const parts: string[] = [];

  if (task.project_id) {
    parts.push(`Project ${task.project_id}`);
  }

  if (task.high_priority) {
    parts.push("🔴 High Priority");
  }

  if (task.blocked) {
    parts.push("🚫 Blocked");
  }

  if (task.bug) {
    parts.push("🐛 Bug");
  }

  // Show how long ago it was updated

  return parts.join(" • ");
}

const formatUpdatedAtAccessory = (updatedAt: Date): string => {
  const hoursAgo = Math.round((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60));
  if (hoursAgo < 1) {
    return "Updated just now";
  } else if (hoursAgo < 24) {
    return `Updated ${hoursAgo}h ago`;
  } else {
    const daysAgo = Math.round(hoursAgo / 24);
    return `Updated ${daysAgo}d ago`;
  }
};

export default function ViewTasksCommand() {
  const { startTimer, taskId: currentTaskId, isRunning, stopTimer } = useTimer();
  const { isLoading: isLoadingUser } = useUser();
  const { tasks, searchTasks, priorityTasks, isLoading: isLoadingTasks, error, lookbackHours } = useTasks();

  const [searchText, setSearchText] = useState("");
  const [showingCategory, setShowingCategory] = useState<"all" | "priority" | "blocked" | "bugs">("all");

  const isLoading = useMemo(() => isLoadingUser || isLoadingTasks, [isLoadingTasks, isLoadingUser]);

  // Filter tasks based on search and category
  const filteredTasks: TaskV3[] = useMemo(() => {
    let baseList: TaskV3[];

    switch (showingCategory) {
      case "priority":
        baseList = priorityTasks.highPriority;
        break;
      case "blocked":
        baseList = priorityTasks.blocked;
        break;
      case "bugs":
        baseList = priorityTasks.bugs;
        break;
      default:
        baseList = tasks;
    }

    return searchTasks(searchText, baseList);
  }, [tasks, priorityTasks, searchText, searchTasks, showingCategory]);

  const onTaskSelected = async (taskId: number) => {
    try {
      if (!tasks) {
        throw new Error("No tasks available to select from.");
      }

      // Check if this task is already running
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
    return <Detail isLoading={isLoading} markdown="Fetching your most relevant tasks..." />;
  }

  if (!tasks || tasks.length === 0) {
    return (
      <Detail
        markdown={`# No Relevant Tasks Found\n\nNo tasks assigned to you have been updated in the last ${Math.round(lookbackHours / 24)} days.\n\nThis search looks further back on Mondays and Tuesdays to account for weekend gaps.`}
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={() => window.location.reload()} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false} // We handle our own filtering
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tasks by title, description, or ID..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          value={showingCategory}
          onChange={(newValue) => setShowingCategory(newValue as typeof showingCategory)}
        >
          <List.Dropdown.Item title="All Tasks" value="all" />
          <List.Dropdown.Item title={`High Priority (${priorityTasks.highPriority.length})`} value="priority" />
          <List.Dropdown.Item title={`Blocked (${priorityTasks.blocked.length})`} value="blocked" />
          <List.Dropdown.Item title={`Bugs (${priorityTasks.bugs.length})`} value="bugs" />
        </List.Dropdown>
      }
    >
      {filteredTasks.length === 0 && searchText ? (
        <List.EmptyView title="No matching tasks found" description={`No tasks match "${searchText}"`} />
      ) : (
        filteredTasks.map((task) => {
          const isTimerRunning = isRunning && currentTaskId === task.id;

          return (
            <List.Item
              key={task.id}
              title={`T${task.company_task_id}: ${task.title}`}
              subtitle={getTaskSubtitle(task)}
              accessories={[
                isTimerRunning ? { icon: Icon.Clock, tooltip: "Timer running" } : {},
                { text: formatUpdatedAtAccessory(task.updated_at) },
              ].filter((acc) => Object.keys(acc).length > 0)}
              keywords={[
                task.title,
                task.description || "",
                task.company_task_id?.toString() || "",
                task.project_id?.toString() || "",
                task.high_priority ? "priority" : "",
                task.blocked ? "blocked" : "",
                task.bug ? "bug" : "",
              ].filter(Boolean)}
              actions={
                <ActionPanel>
                  <Action
                    title={isTimerRunning ? "Stop Timer" : "Start Timer"}
                    icon={isTimerRunning ? Icon.Stop : Icon.Play}
                    onAction={() => onTaskSelected(task.id)}
                  />
                  <Action.OpenInBrowser
                    title="Open in Forecast"
                    url={ROUTES.tasks.browserURL(task.company_task_id)}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Task URL"
                    content={ROUTES.tasks.browserURL(task.company_task_id)}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Task Title"
                    content={task.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
