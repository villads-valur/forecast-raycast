import { ROUTES } from "@/utils/routes";

export async function getUser(id: string) {
  const response = await fetch(ROUTES.singleUser.get(id));
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const user = await response.json();
  return user;
}
