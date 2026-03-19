import { http } from "./http";

export const versionApi = {
  list: async () => (await http.get("/api/versions")).data,
  create: async (payload) => (await http.post("/api/versions", payload)).data,
  update: async (id, payload) => (await http.put(`/api/versions/${id}`, payload)).data,
  setReleaseReady: async (id, releaseReady) => (await http.put(`/api/versions/${id}/release-ready`, { releaseReady })).data,
  remove: async (id) => (await http.delete(`/api/versions/${id}`)).data
};
