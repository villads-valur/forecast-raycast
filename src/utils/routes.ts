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
    getRecent: (updatedAt = getFormattedDateMinusHours(120)) =>
      `${API_BASE_URL}/v4/tasks/updated_after/${updatedAt}?pageNumber=1&pageSize=100`,
  },
} as const;
