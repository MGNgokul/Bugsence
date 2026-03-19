import { http } from "./http";

export const authApi = {
  register: async (payload) => (await http.post("/api/auth/register", payload)).data,
  login: async (payload) => (await http.post("/api/auth/login", payload)).data,
  providers: async () => (await http.get("/api/auth/providers")).data,
  profile: async () => (await http.get("/api/auth/profile")).data
};
