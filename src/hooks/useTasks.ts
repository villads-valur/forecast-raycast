import { PaginatedResponse, TaskV3 } from "@/types/forecast";
import { Cache, getPreferenceValues } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "./useUser";
import { ROUTES } from "@/utils/routes";

const CACHE_KEY = "tasks";
const cache = new Cache();

export function useTasks() {
  const { forecastApiKey } = getPreferenceValues<Preferences>();
  const { user, isLoading: isLoadingUser } = useUser();
  const [tasks, setTasks] = useState<TaskV3[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTasks = async () => {
    setIsLoading(true);

    if (!forecastApiKey || !user) {
      throw new Error("API key and User ID are required");
    }

    try {
      if (cache.has(CACHE_KEY)) {
        const cachedTasks = cache.get(CACHE_KEY) ?? "[";
        const parsedTasks = JSON.parse(cachedTasks) as TaskV3[];

        setTasks(parsedTasks);
        return setIsLoading(false);
      }

      const response = await fetch(ROUTES.tasks.getRecent(), {
        headers: {
          "X-FORECAST-API-KEY": forecastApiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching tasks: ${response.status} - ${response.statusText}`);
      }

      const allTasks = (await response.json()) as PaginatedResponse<TaskV3>;

      const userTasks = allTasks.pageContents
        .filter((task) => task.assigned_persons.includes(user.id))
        .toSorted((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setTasks(userTasks);
      cache.set(CACHE_KEY, JSON.stringify(userTasks));
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const recentTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks
      .filter((task) => {
        const taskDate = new Date(task.updated_at);
        const currentDate = new Date();
        const timeDifference = currentDate.getTime() - taskDate.getTime();
        const hoursDifference = timeDifference / (1000 * 60 * 60);
        return hoursDifference <= 48; // Filter tasks updated in the last 48 hours
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }, [tasks]);

  const tasksGroupedByProject = useMemo(() => {
    if (!tasks) return {};
    return tasks.reduce(
      (acc, task) => {
        const projectId = task.project_id;
        if (!acc[projectId]) {
          acc[projectId] = [];
        }
        acc[projectId].push(task);
        return acc;
      },
      {} as Record<string, TaskV3[]>,
    );
  }, [tasks]);

  useEffect(() => {
    if (forecastApiKey && user && !isLoadingUser) {
      fetchTasks();
    }
  }, [forecastApiKey, user, isLoadingUser]);

  return {
    isLoading,
    tasks,
    tasksGroupedByProject,
    recentTasks,
  };
}
