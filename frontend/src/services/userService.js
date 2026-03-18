import { http } from "./http";

export const userApi = {
  list: async () => (await http.get("/api/users")).data,
  productivity: async () => (await http.get("/api/users/productivity")).data
};
