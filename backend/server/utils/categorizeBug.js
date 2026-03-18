function categorizeBug(description = "") {
  const text = description.toLowerCase();

  if (text.includes("ui") || text.includes("button") || text.includes("layout")) return "UI Bug";
  if (text.includes("api") || text.includes("server") || text.includes("endpoint")) return "Backend Bug";
  if (text.includes("slow") || text.includes("lag") || text.includes("performance")) return "Performance Issue";
  if (text.includes("auth") || text.includes("token") || text.includes("vulnerability")) return "Security Bug";
  if (text.includes("query") || text.includes("database") || text.includes("sql")) return "Database Bug";

  return "Other";
}

module.exports = { categorizeBug };
