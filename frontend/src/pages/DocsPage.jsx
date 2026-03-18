import MarketingInfoPage from "./MarketingInfoPage";

export default function DocsPage() {
  return (
    <MarketingInfoPage
      title="Docs"
      subtitle="Documentation for onboarding, workflow setup, and release governance operations."
      icon="activity"
      points={[
        "Setup guide for teams and environments",
        "Bug lifecycle policies and status definitions",
        "Best practices for triage and release readiness"
      ]}
    />
  );
}
