import { http } from "./http";

function buildBugCreatePayload(payload = {}) {
  const hasAttachments = Array.isArray(payload.attachments) && payload.attachments.length > 0;

  if (!hasAttachments) {
    return payload;
  }

  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;

    if (key === "attachments") {
      value.forEach((file) => formData.append("attachments", file));
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => formData.append(key, item));
      return;
    }

    formData.append(key, value);
  });

  return formData;
}

function buildAttachmentPayload(files = []) {
  const formData = new FormData();
  files.forEach((file) => formData.append("attachments", file));
  return formData;
}

export const bugApi = {
  list: async (params) => (await http.get("/api/bugs", { params })).data,
  getById: async (id) => (await http.get(`/api/bugs/${id}`)).data,
  create: async (payload) => (await http.post("/api/bugs", buildBugCreatePayload(payload))).data,
  previewDuplicates: async (payload) => (await http.post("/api/bugs/duplicates/preview", payload)).data,
  previewSuggestion: async (payload) => (await http.post("/api/bugs/ai-suggestion/preview", payload)).data,
  previewTriage: async (payload) => (await http.post("/api/bugs/ai-triage/preview", payload)).data,
  askAssistant: async (payload) => (await http.post("/api/bugs/ai-assistant/ask", payload)).data,
  update: async (id, payload) => (await http.put(`/api/bugs/${id}`, payload)).data,
  remove: async (id) => (await http.delete(`/api/bugs/${id}`)).data,
  addAttachments: async (id, files) => (await http.post(`/api/bugs/${id}/attachments`, buildAttachmentPayload(files))).data,
  assign: async (id, payload) => (await http.put(`/api/bugs/${id}/assign`, payload)).data,
  addComment: async (id, payload) => (await http.post(`/api/bugs/${id}/comments`, payload)).data
};
