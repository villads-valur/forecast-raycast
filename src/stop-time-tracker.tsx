import { launchCommand, LaunchType, LocalStorage, showHUD, updateCommandMetadata } from "@raycast/api";

export default async function Command() {
  const isRunning = LocalStorage.getItem<boolean>("timer-is-running");

  if (!isRunning) {
    await showHUD("No timer is running");
    return;
  }

  await updateCommandMetadata({ subtitle: "Stopping timer..." });
  await launchCommand({ name: "menubar-timer", type: LaunchType.UserInitiated });
  LocalStorage.setItem("timer-is-running", "false");
  await showHUD("Timer stopped");
}
