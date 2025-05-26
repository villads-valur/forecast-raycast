import { useUser } from "@/hooks/useUser";
import { Action, ActionPanel, Detail, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useMemo } from "react";
import { useTasks } from "@/hooks/useTasks";

export default function Command() {
  const { pop } = useNavigation();
  const { isLoading: isLoadingUser } = useUser();
  const { isLoading: isLoadingTasks, tasks } = useTasks();
  const isLoading = useMemo(() => isLoadingUser || isLoadingTasks, [isLoadingTasks, isLoadingUser]);

  const onTaskSelected = (taskId: number) => {
    showToast({
      style: Toast.Style.Success,
      title: "Task Selected",
      message: `You selected task with ID: ${taskId}`,
    });
    pop();
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
          subtitle={`Project: ${task.project_id}`}
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
