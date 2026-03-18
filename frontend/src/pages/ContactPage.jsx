import MarketingInfoPage from "./MarketingInfoPage";

export default function ContactPage() {
  return (
    <MarketingInfoPage
      title="Contact"
      subtitle="Reach our team for demos, enterprise discussions, and onboarding consultation."
      icon="rocket"
      points={[
        "Sales: discuss plan and implementation fit",
        "Technical: integration and setup support",
        "Success: onboarding and adoption guidance"
      ]}
    />
  );
}
