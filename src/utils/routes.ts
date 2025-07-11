import { getFormattedDateMinusHours } from "./time";

const API_BASE_URL = "https://api.forecast.it/api";

export const ROUTES = {
  persons: {
    getAll: `${API_BASE_URL}/v2/persons`,
  },
  tasks: {
    getAllPaginated: (page: number = 1, pageSize = 100) =>
      `${API_BASE_URL}/v4/tasks?pageNumber=${page}&pageSize=${pageSize}`,
    getAll: `${API_BASE_URL}/v3/tasks`,
    getRecent: (
      hoursBack: number = 48, // Default to 48 hours instead of 120
    ) => `${API_BASE_URL}/v4/tasks/updated_after/${getFormattedDateMinusHours(hoursBack)}?pageNumber=1&pageSize=100`,
    browserURL: (taskId: number) => `https://app.forecast.it/T${taskId}`,
  },
  timer: {
    start: (personId: number) => `${API_BASE_URL}/v1/persons/${personId}/timer/start`,
    stop: (personId: number) => `${API_BASE_URL}/v1/persons/${personId}/timer/stop`,
    status: (personId: number) => `${API_BASE_URL}/v1/persons/${personId}/timer`,
  },
} as const;
