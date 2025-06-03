import { PaginatedResponse, TaskV3 } from "@/types/forecast";
import { getPreferenceValues, Cache, environment } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useEffect, useState, useCallback } from "react";
import { useUser } from "./useUser";
import { ROUTES } from "@/utils/routes";

// Cache configuration
const TASKS_CACHE_KEY = "user_tasks";
const CACHE_EXPIRY_HOURS = 1;
const cache = new Cache({
  namespace: `${environment.commandName}_tasks`,
  capacity: 5 * 1024 * 1024,
});

interface CachedTasksData {
  tasks: TaskV3[];
  timestamp: number;
  userId: string;
}

interface UseTasksOptions {
  hoursBack?: number;
}

/**
 * Get the number of hours to look back, considering weekends
 * - On Monday/Tuesday: Look back 5 days (to include Friday)
 * - Other days: Look back 3 days
 */
function getSmartLookbackHours(): number {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Monday (1) or Tuesday (2) - look back further to catch Friday's work
  if (dayOfWeek === 1 || dayOfWeek === 2) {
    return 5 * 24; // 5 days = 120 hours
  }

  // Other days - standard 3 day lookback
  return 3 * 24; // 3 days = 72 hours
}

export function useTasks(options: UseTasksOptions = {}) {
  const { hoursBack = 48 } = options;
  const { forecastApiKey } = getPreferenceValues<Preferences>();
  const { user, isLoading: isLoadingUser, error: userError } = useUser();
  const [cachedTasks, setCachedTasks] = useState<TaskV3[]>([]);
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);

  const userCacheKey = user?.id ? `${TASKS_CACHE_KEY}_${user.id}` : TASKS_CACHE_KEY;

  const lookbackHours = useMemo(() => getSmartLookbackHours(), []);

  useEffect(() => {
    if (!user?.id) {
      setCachedTasks([]);
      setCacheTimestamp(0);
      return;
    }

    try {
      const cached = cache.get(userCacheKey);
      if (cached) {
        const parsedData = JSON.parse(cached) as CachedTasksData;
        const isExpired = Date.now() - parsedData.timestamp > CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

        if (!isExpired && Number(parsedData.userId) === user.id) {
          setCachedTasks(parsedData.tasks);
          setCacheTimestamp(parsedData.timestamp);
        } else {
          cache.remove(userCacheKey);
        }
      }
    } catch (error) {
      console.warn("Failed to parse cached tasks data:", error);
      cache.remove(userCacheKey);
    }
  }, [user?.id, userCacheKey]);

  const shouldExecute = Boolean(forecastApiKey && user?.id && !isLoadingUser && !userError);

  const {
    data: tasksResponse,
    isLoading,
    error,
    revalidate,
  } = useFetch<PaginatedResponse<TaskV3>>(ROUTES.tasks.getRecent(hoursBack), {
    headers: {
      "X-FORECAST-API-KEY": forecastApiKey,
    },
    execute: shouldExecute,
    onError: (error) => {
      console.error("Failed to fetch tasks:", error);
    },
    onData: (response) => {
      if (response?.pageContents && user?.id) {
        const userTasks = response.pageContents
          .filter((task) => {
            const isAssigned = task.assigned_persons?.includes(user.id);
            return isAssigned;
          })
          .sort((a, b) => {
            const dateA = new Date(a.updated_at).getTime();
            const dateB = new Date(b.updated_at).getTime();
            return dateB - dateA;
          });

        const cacheData: CachedTasksData = {
          tasks: userTasks,
          timestamp: Date.now(),
          userId: user.id.toString(),
        };

        try {
          cache.set(userCacheKey, JSON.stringify(cacheData));
          setCachedTasks(userTasks);
          setCacheTimestamp(Date.now());
        } catch (cacheError) {
          console.warn("Failed to cache tasks:", cacheError);
        }
      }
    },
  });

  const userTasks = useMemo(() => {
    if (!user?.id) return [];

    if (tasksResponse?.pageContents) {
      return tasksResponse.pageContents
        .filter((task) => {
          const isAssigned = task.assigned_persons?.includes(user.id);
          return isAssigned;
        })
        .sort((a, b) => {
          const dateA = new Date(a.updated_at).getTime();
          const dateB = new Date(b.updated_at).getTime();
          return dateB - dateA;
        });
    }

    if (isLoading && cachedTasks.length > 0) {
      return cachedTasks;
    }

    return [];
  }, [tasksResponse?.pageContents, user?.id, isLoading, cachedTasks]);

  const recentTasks = useMemo(() => {
    if (userTasks.length === 0) return [];

    const cutoffTime = Date.now() - hoursBack * 60 * 60 * 1000;

    return userTasks.filter((task) => {
      const taskUpdateTime = new Date(task.updated_at).getTime();
      return taskUpdateTime > cutoffTime;
    });
  }, [userTasks, hoursBack]);

  const tasksGroupedByProject = useMemo(() => {
    if (userTasks.length === 0) return {};

    return userTasks.reduce<Record<string, TaskV3[]>>((acc, task) => {
      const projectId = task.project_id?.toString() || "unassigned";

      if (!acc[projectId]) {
        acc[projectId] = [];
      }

      acc[projectId].push(task);
      return acc;
    }, {});
  }, [userTasks]);

  const priorityTasks = useMemo(
    () => ({
      highPriority: userTasks.filter((task) => task.high_priority),
      blocked: userTasks.filter((task) => task.blocked),
      bugs: userTasks.filter((task) => task.bug),
    }),
    [userTasks],
  );

  const isUsingCachedData = Boolean(cachedTasks.length > 0 && !tasksResponse?.pageContents && cacheTimestamp > 0);
  const isCacheStale = cacheTimestamp > 0 && Date.now() - cacheTimestamp > CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

  const searchTasks = useCallback(
    (query: string, taskList: TaskV3[] = userTasks): TaskV3[] => {
      if (!query.trim()) {
        return taskList;
      }

      const searchTerm = query.toLowerCase().trim();

      return taskList.filter((task) => {
        // Search in title (highest priority)
        if (task.title.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in description
        if (task.description?.toLowerCase().includes(searchTerm)) {
          return true;
        }

        // Search in project ID (for users who remember project numbers)
        if (task.project_id?.toString().includes(searchTerm)) {
          return true;
        }

        // Search in company task ID
        if (task.company_task_id?.toString().includes(searchTerm)) {
          return true;
        }

        return false;
      });
    },
    [userTasks],
  );

  return {
    // Data
    tasks: userTasks,
    recentTasks,
    tasksGroupedByProject,
    priorityTasks,

    // State
    isLoading: isLoading || isLoadingUser,
    error: error || userError,
    isUsingCachedData,
    isCacheStale,

    // Actions
    searchTasks,
    revalidate,
    clearCache: () => {
      if (user?.id) {
        cache.remove(userCacheKey);
        setCachedTasks([]);
        setCacheTimestamp(0);
      }
    },

    // Computed values
    totalTaskCount: userTasks.length,
    recentTaskCount: recentTasks.length,
    projectCount: Object.keys(tasksGroupedByProject).length,
    cacheAge: cacheTimestamp > 0 ? Date.now() - cacheTimestamp : 0,
    lookbackHours,
  };
}
