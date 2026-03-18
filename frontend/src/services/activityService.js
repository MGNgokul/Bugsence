import { http } from "./http";

export const activityApi = {
  list: async (params) => (await http.get("/api/activity", { params })).data
};
