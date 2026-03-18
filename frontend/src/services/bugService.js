import { http } from "./http";

export const bugApi = {
  list: async (params) => (await http.get("/api/bugs", { params })).data,
  getById: async (id) => (await http.get(`/api/bugs/${id}`)).data,
  create: async (payload) => (await http.post("/api/bugs", payload)).data,
  previewSuggestion: async (payload) => (await http.post("/api/bugs/ai-suggestion/preview", payload)).data,
  update: async (id, payload) => (await http.put(`/api/bugs/${id}`, payload)).data,
  remove: async (id) => (await http.delete(`/api/bugs/${id}`)).data,
  assign: async (id, payload) => (await http.put(`/api/bugs/${id}/assign`, payload)).data,
  addComment: async (id, payload) => (await http.post(`/api/bugs/${id}/comments`, payload)).data
};
