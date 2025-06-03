import { PaginatedResponse, TaskV3 } from "@/types/forecast";
import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { useUser } from "./useUser";
import { ROUTES } from "@/utils/routes";

/**
 * Custom hook for fetching and managing user tasks from Forecast API
 * Provides filtered, sorted, and grouped task data with automatic caching
 */
export function useTasks() {
  const { forecastApiKey } = getPreferenceValues<Preferences>();
  const { user, isLoading: isLoadingUser } = useUser();

  // Only execute fetch when we have all required dependencies
  const shouldExecute = Boolean(forecastApiKey && user && !isLoadingUser);

  const {
    data: tasksResponse,
    isLoading,
    error,
    revalidate,
  } = useFetch<PaginatedResponse<TaskV3>>(ROUTES.tasks.getRecent(), {
    headers: {
      "X-FORECAST-API-KEY": forecastApiKey,
    },
    execute: shouldExecute,
    onError: (error) => {
      console.error("Failed to fetch tasks:", error);
    },
  });

  // Filter and sort user's tasks
  const userTasks = useMemo(() => {
    if (!tasksResponse?.pageContents || !user?.id) {
      return [];
    }

    return tasksResponse.pageContents
      .filter((task) => task.assigned_persons?.includes(user.id))
      .sort((a, b) => {
        const dateA = new Date(a.updated_at).getTime();
        const dateB = new Date(b.updated_at).getTime();
        return dateB - dateA; // Most recent first
      });
  }, [tasksResponse?.pageContents, user?.id]);

  // Filter tasks updated within the last 48 hours
  const recentTasks = useMemo(() => {
    if (userTasks.length === 0) return [];

    const fortyEightHoursAgo = Date.now() - 48 * 60 * 60 * 1000;

    return userTasks.filter((task) => {
      const taskUpdateTime = new Date(task.updated_at).getTime();
      return taskUpdateTime > fortyEightHoursAgo;
    });
  }, [userTasks]);

  // Group tasks by project ID
  const tasksGroupedByProject = useMemo(() => {
    if (userTasks.length === 0) return {};

    return userTasks.reduce<Record<string, TaskV3[]>>((acc, task) => {
      const projectId = task.project_id;

      if (!projectId) return acc; // Skip tasks without project_id

      if (!acc[projectId]) {
        acc[projectId] = [];
      }

      acc[projectId].push(task);
      return acc;
    }, {});
  }, [userTasks]);

  return {
    // Data
    tasks: userTasks,
    recentTasks,
    tasksGroupedByProject,

    // State
    isLoading: isLoading || isLoadingUser,
    error,

    // Actions
    revalidate,

    // Computed values
    totalTaskCount: userTasks.length,
    recentTaskCount: recentTasks.length,
    projectCount: Object.keys(tasksGroupedByProject).length,
  };
}
