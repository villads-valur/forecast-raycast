import { PaginatedResponse, TaskV3 } from "@/types/forecast";
import { getPreferenceValues, Cache, environment } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useMemo, useEffect, useState } from "react";
import { useUser } from "./useUser";
import { ROUTES } from "@/utils/routes";

// Cache configuration
const TASKS_CACHE_KEY = "user_tasks";
const CACHE_EXPIRY_HOURS = 1; // Cache tasks for 1 hour
const cache = new Cache({
  namespace: `${environment.commandName}_tasks`,
  capacity: 5 * 1024 * 1024, // 5MB for tasks data
});

interface CachedTasksData {
  tasks: TaskV3[];
  timestamp: number;
  userId: string;
}

/**
 * Custom hook for fetching and managing user tasks from Forecast API
 * Provides filtered, sorted, and grouped task data with intelligent caching
 */
export function useTasks() {
  const { forecastApiKey } = getPreferenceValues<Preferences>();
  const { user, isLoading: isLoadingUser } = useUser();
  const [cachedTasks, setCachedTasks] = useState<TaskV3[]>([]);
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);

  // Generate cache key based on user ID
  const userCacheKey = user?.id ? `${TASKS_CACHE_KEY}_${user.id}` : TASKS_CACHE_KEY;

  // Load cached tasks on mount or when user changes
  useEffect(() => {
    if (!user?.id) {
      setCachedTasks([]);
      setCacheTimestamp(0);
      return;
    }

    const cached = cache.get(userCacheKey);
    if (cached) {
      try {
        const parsedData = JSON.parse(cached) as CachedTasksData;

        // Check if cache is still valid (within expiry time)
        const isExpired = Date.now() - parsedData.timestamp > CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

        if (!isExpired && Number(parsedData.userId) === user.id) {
          setCachedTasks(parsedData.tasks);
          setCacheTimestamp(parsedData.timestamp);
        } else {
          // Remove expired or mismatched cache
          cache.remove(userCacheKey);
        }
      } catch (error) {
        console.warn("Failed to parse cached tasks data:", error);
        cache.remove(userCacheKey);
      }
    }
  }, [user?.id, userCacheKey]);

  // Only execute fetch when we have all required dependencies
  const shouldExecute = Boolean(forecastApiKey && user?.id && !isLoadingUser);

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
    onData: (response) => {
      // Process and cache successful response
      if (response?.pageContents && user?.id) {
        const userTasks = response.pageContents
          .filter((task) => task.assigned_persons?.includes(user.id))
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

        cache.set(userCacheKey, JSON.stringify(cacheData));
        setCachedTasks(userTasks);
        setCacheTimestamp(Date.now());
      }
    },
  });

  // Get current user tasks, preferring fresh data over cached
  const userTasks = useMemo(() => {
    if (!user?.id) return [];

    // Use fresh data if available
    if (tasksResponse?.pageContents) {
      return tasksResponse.pageContents
        .filter((task) => task.assigned_persons?.includes(user.id))
        .sort((a, b) => {
          const dateA = new Date(a.updated_at).getTime();
          const dateB = new Date(b.updated_at).getTime();
          return dateB - dateA;
        });
    }

    // Fall back to cached data while loading
    if (isLoading && cachedTasks.length > 0) {
      return cachedTasks;
    }

    return [];
  }, [tasksResponse?.pageContents, user?.id, isLoading, cachedTasks]);

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

      if (!projectId) return acc;

      if (!acc[projectId]) {
        acc[projectId] = [];
      }

      acc[projectId].push(task);
      return acc;
    }, {});
  }, [userTasks]);

  // Clear cache when user changes
  useEffect(() => {
    return () => {
      // Cleanup function - could be used for cache invalidation logic
    };
  }, [user?.id]);

  // Check if we're using cached data
  const isUsingCachedData = Boolean(cachedTasks.length > 0 && !tasksResponse?.pageContents && cacheTimestamp > 0);

  // Check if cached data is stale
  const isCacheStale = cacheTimestamp > 0 && Date.now() - cacheTimestamp > CACHE_EXPIRY_HOURS * 60 * 60 * 1000;

  return {
    // Data
    tasks: userTasks,
    recentTasks,
    tasksGroupedByProject,

    // State
    isLoading: isLoading || isLoadingUser,
    error,
    isUsingCachedData,
    isCacheStale,

    // Actions
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
  };
}
