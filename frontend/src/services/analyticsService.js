import { http } from "./http";

export const analyticsApi = {
  summary: async () => (await http.get("/api/analytics/summary")).data
};
