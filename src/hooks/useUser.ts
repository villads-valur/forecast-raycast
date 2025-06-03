import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Preferences } from "@/types/preferences";
import { useMemo } from "react";
import { ROUTES } from "@/utils/routes";
import { PersonV2 } from "@/types/forecast";

/**
 * Custom hook for fetching and managing the current user from Forecast API
 * Finds the user by email from the company's person list
 */
export function useUser() {
  const { forecastApiKey, forecastUserEmail } = getPreferenceValues<Preferences>();

  // Only execute fetch when we have all required preferences
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
    failureToastOptions: {
      title: "Failed to fetch user data",
      message: "Please check your API key and try again",
    },
  });

  // Find the current user by email
  const user = useMemo(() => {
    if (!allUsers || !forecastUserEmail) {
      return undefined;
    }

    const foundUser = allUsers.find((person) => person.email?.toLowerCase() === forecastUserEmail.toLowerCase());

    if (!foundUser && allUsers.length > 0) {
      console.warn(`User not found with email: ${forecastUserEmail}`);
    }

    return foundUser;
  }, [allUsers, forecastUserEmail]);

  // Derived values for convenience
  const hasValidConfiguration = Boolean(forecastApiKey && forecastUserEmail);
  const isUserFound = Boolean(user);

  return {
    // Core data
    user,

    // Convenience accessors
    userId: user?.id,
    userName: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}`.trim() : user?.email,
    userEmail: user?.email,

    // Configuration
    apiKey: forecastApiKey,
    configuredEmail: forecastUserEmail,

    // State
    isLoading,
    error,
    hasValidConfiguration,
    isUserFound,

    // Actions
    revalidate,

    // Computed state
    isReady: !isLoading && !error && isUserFound,
  };
}
