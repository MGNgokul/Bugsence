import { http } from "./http";

export const notificationApi = {
  list: async () => (await http.get("/api/notifications")).data,
  markRead: async (id) => (await http.put(`/api/notifications/${id}/read`)).data
};
