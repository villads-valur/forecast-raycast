import { LocalStorage, showHUD } from "@raycast/api";
import { useTimer } from "./hooks/useTimer";

export default async function Command() {
  LocalStorage.setItem("timer-is-running", "false");
  await showHUD("Timer stopped");
}
