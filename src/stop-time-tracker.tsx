import { getPreferenceValues, LocalStorage, showHUD } from "@raycast/api";
import { ROUTES } from "./utils/routes";
import { PersonV2, TimerResponse } from "./types/forecast";

async function getCurrentUserId(): Promise<number | null> {
  try {
    const { forecastApiKey, forecastUserEmail } = getPreferenceValues<Preferences>();

    if (!forecastApiKey || !forecastUserEmail) {
      return null;
    }

    // Fetch users to find current user ID
    const response = await fetch(ROUTES.persons.getAll, {
      headers: {
        "X-FORECAST-API-KEY": forecastApiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch users: ${response.status}`);
    }

    const users = (await response.json()) as PersonV2[];
    const currentUser = users.find((person) => person.email?.toLowerCase() === forecastUserEmail.toLowerCase());

    return currentUser?.id || null;
  } catch (error) {
    console.error("Error getting user ID:", error);
    return null;
  }
}

export default async function StopTimeTrackerCommand() {
  try {
    // Check if timer is running
    const isRunning = await LocalStorage.getItem<boolean>("timer-is-running");
    const taskId = await LocalStorage.getItem<number>("timer-task-id");
    const userId = await getCurrentUserId();
    const { forecastApiKey } = getPreferenceValues<Preferences>();

    if (!userId || !forecastApiKey) {
      await showHUD("Error: User not found or API key not configured");
      return;
    }

    if (!isRunning || !taskId) {
      await showHUD("No timer is running");
      return;
    }

    // Calculate elapsed time for display
    const startTimeStr = await LocalStorage.getItem<string>("timer-start-time");
    let elapsedMessage = "";

    if (startTimeStr) {
      const startTime = new Date(startTimeStr);
      const elapsed = Date.now() - startTime.getTime();
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);

      if (hours > 0) {
        elapsedMessage = ` (${hours}h ${minutes}m ${seconds}s)`;
      } else if (minutes > 0) {
        elapsedMessage = ` (${minutes}m ${seconds}s)`;
      } else {
        elapsedMessage = ` (${seconds}s)`;
      }
    }

    const response = await fetch(ROUTES.timer.stop(userId), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-FORECAST-API-KEY": forecastApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to stop timer: ${response.status} ${errorText}`);
    }

    // Stop the timer
    await LocalStorage.removeItem("timer-is-running");
    await LocalStorage.removeItem("timer-start-time");
    await LocalStorage.removeItem("timer-task-id");

    await showHUD(`Timer stopped${elapsedMessage}`);
  } catch (error) {
    console.error("Error stopping timer:", error);
    await showHUD("Error stopping timer");
  }
}
