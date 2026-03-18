import MarketingInfoPage from "./MarketingInfoPage";

export default function PricingPage() {
  return (
    <MarketingInfoPage
      title="Pricing"
      subtitle="Flexible plans designed for startups, scaling teams, and enterprise delivery organizations."
      icon="stats"
      points={[
        "Startup: fast setup and core workflow controls",
        "Growth: advanced analytics and higher team limits",
        "Enterprise: custom governance and compliance support"
      ]}
    />
  );
}
