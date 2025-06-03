import { getPreferenceValues, Cache, environment } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Preferences } from "@/types/preferences";
import { useMemo, useEffect, useState } from "react";
import { ROUTES } from "@/utils/routes";
import { PersonV2 } from "@/types/forecast";

// Cache configuration
const USER_CACHE_KEY = "current_user";
const cache = new Cache({
  namespace: `${environment.commandName}_user`,
  capacity: 1024 * 1024, // 1MB
});

/**
 * Custom hook for fetching and managing the current user from Forecast API
 * Finds the user by email from the company's person list with persistent caching
 */
export function useUser() {
  const { forecastApiKey, forecastUserEmail } = getPreferenceValues<Preferences>();
  const [cachedUser, setCachedUser] = useState<PersonV2 | undefined>(undefined);

  // Load cached user on mount
  useEffect(() => {
    const cached = cache.get(USER_CACHE_KEY);
    if (cached) {
      try {
        const parsedUser = JSON.parse(cached) as PersonV2;
        setCachedUser(parsedUser);
      } catch (error) {
        console.warn("Failed to parse cached user data:", error);
        cache.remove(USER_CACHE_KEY);
      }
    }
  }, []);

  const shouldExecute = Boolean(forecastApiKey && forecastUserEmail);

  const {
    data: allUsers,
    isLoading,
    error,
    revalidate,
  } = useFetch<PersonV2[]>(ROUTES.persons.getAll, {
    headers: {
      "X-FORECAST-API-KEY": forecastApiKey,
    },
    execute: shouldExecute,
    onError: (error) => {
      console.error("Failed to fetch users:", error);
    },
    onData: (data) => {
      // Cache successful response
      if (data && Array.isArray(data)) {
        const foundUser = data.find((person) => person.email?.toLowerCase() === forecastUserEmail?.toLowerCase());

        if (foundUser) {
          cache.set(USER_CACHE_KEY, JSON.stringify(foundUser));
          setCachedUser(foundUser);
        }
      }
    },
    failureToastOptions: {
      title: "Failed to fetch user data",
      message: "Please check your API key and try again",
    },
  });

  // Find the current user by email, preferring fresh data over cached
  const user = useMemo(() => {
    if (!forecastUserEmail) {
      return undefined;
    }

    // Use fresh data if available
    if (allUsers) {
      const foundUser = allUsers.find((person) => person.email?.toLowerCase() === forecastUserEmail.toLowerCase());

      if (!foundUser && allUsers.length > 0) {
        console.warn(`User not found with email: ${forecastUserEmail}`);
      }

      return foundUser;
    }

    // Fall back to cached data while loading
    if (isLoading && cachedUser) {
      return cachedUser;
    }

    return undefined;
  }, [allUsers, forecastUserEmail, isLoading, cachedUser]);

  // Clear cache when configuration changes
  useEffect(() => {
    if (forecastUserEmail && cachedUser && cachedUser.email !== forecastUserEmail) {
      cache.remove(USER_CACHE_KEY);
      setCachedUser(undefined);
    }
  }, [forecastUserEmail, cachedUser]);

  const hasValidConfiguration = Boolean(forecastApiKey && forecastUserEmail);
  const isUserFound = Boolean(user);
  const isUsingCachedData = Boolean(cachedUser && !allUsers);

  return {
    user,
    userId: user?.id,
    userName: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : user?.email,
    userEmail: user?.email,
    apiKey: forecastApiKey,
    configuredEmail: forecastUserEmail,
    isLoading,
    error,
    hasValidConfiguration,
    isUserFound,
    isUsingCachedData,
    revalidate,
    clearCache: () => {
      cache.remove(USER_CACHE_KEY);
      setCachedUser(undefined);
    },
    isReady: !isLoading && !error && isUserFound,
  };
}
