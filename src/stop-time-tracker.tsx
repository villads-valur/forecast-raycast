import { LocalStorage, showHUD } from "@raycast/api";

export default async function StopTimeTrackerCommand() {
  try {
    // Check if timer is running
    const isRunning = await LocalStorage.getItem<boolean>("timer-is-running");
    const taskId = await LocalStorage.getItem<number>("timer-task-id");

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
