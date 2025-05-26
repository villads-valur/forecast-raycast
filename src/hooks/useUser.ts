import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences } from "@/types/preferences";
import { useEffect, useState } from "react";
import { ROUTES } from "@/utils/routes";
import { PersonV2 } from "@/types/forecast";

export function useUser() {
  const { forecastApiKey, forecastUserEmail } = getPreferenceValues<Preferences>();
  const [user, setUser] = useState<PersonV2 | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUser = async () => {
    setIsLoading(true);
    if (!forecastApiKey || !forecastUserEmail) {
      throw new Error("API key and User ID are required");
    }

    try {
      const response = await fetch(ROUTES.persons.getAll, {
        headers: {
          "X-FORECAST-API-KEY": forecastApiKey,
        },
      });

      if (!response.ok) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch user",
          message: `Status: ${response.status} - ${response.statusText}`,
        });
        return console.error("Error fetching user:", response.status, response.statusText);
      }

      const allCompanyUsers = (await response.json()) as PersonV2[];
      const currentUserData = allCompanyUsers.find((user) => user.email === forecastUserEmail);

      if (!currentUserData) {
        showToast({
          style: Toast.Style.Failure,
          title: "User not found",
          message: `No user found with email: ${forecastUserEmail}`,
        });
        return console.error("No user found with email:", forecastUserEmail);
      }

      return setUser(currentUserData);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch user",
      });

      console.error("Failed to fetch user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (forecastApiKey && forecastUserEmail) {
      fetchUser();
    }
  }, [forecastApiKey, forecastUserEmail]);

  return {
    user,
    userId: user?.id,
    apiKey: forecastApiKey,
    userEmail: forecastUserEmail,
    isLoading,
  };
}
