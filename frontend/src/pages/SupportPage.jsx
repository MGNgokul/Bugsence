import MarketingInfoPage from "./MarketingInfoPage";

export default function SupportPage() {
  return (
    <MarketingInfoPage
      title="Support"
      subtitle="Get implementation and workflow support for your team when issues block delivery."
      icon="bell"
      points={[
        "Priority support channels for production blockers",
        "Guided workflow troubleshooting and best practices",
        "Operational help for team onboarding"
      ]}
    />
  );
}
