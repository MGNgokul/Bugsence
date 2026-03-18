import MarketingInfoPage from "./MarketingInfoPage";

export default function PreviewPage() {
  return (
    <MarketingInfoPage
      title="Preview"
      subtitle="A snapshot of how teams monitor execution, backlog pressure, and release readiness."
      icon="dashboard"
      points={[
        "Live productivity board with KPIs and readiness signals",
        "Status-flow visibility for engineering and QA teams",
        "Executive-level metrics for release confidence"
      ]}
    />
  );
}
