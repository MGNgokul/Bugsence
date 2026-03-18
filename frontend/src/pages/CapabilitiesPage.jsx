import MarketingInfoPage from "./MarketingInfoPage";

export default function CapabilitiesPage() {
  return (
    <MarketingInfoPage
      title="Capabilities"
      subtitle="Explore the core workflow capabilities that power premium delivery quality."
      icon="team"
      points={[
        "Priority triage with risk-aware severity signals",
        "Interactive assignment and ownership visibility",
        "Timeline-based auditing for every bug decision"
      ]}
    />
  );
}
