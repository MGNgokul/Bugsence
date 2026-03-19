import { http } from "./http";

function getFileName(headers = {}, fallback) {
  const disposition = headers["content-disposition"] || "";
  const match = disposition.match(/filename=\"?([^"]+)\"?/i);
  return match?.[1] || fallback;
}

export const analyticsApi = {
  summary: async () => (await http.get("/api/analytics/summary")).data,
  report: async () => (await http.get("/api/analytics/report")).data,
  downloadCsv: async () => {
    const response = await http.get("/api/analytics/report.csv", { responseType: "blob" });
    return {
      blob: response.data,
      filename: getFileName(response.headers, "bugsense-analytics-report.csv")
    };
  }
};
