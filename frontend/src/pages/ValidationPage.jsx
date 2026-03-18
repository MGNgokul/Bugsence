import MarketingInfoPage from "./MarketingInfoPage";

export default function ValidationPage() {
  return (
    <MarketingInfoPage
      title="Validation"
      subtitle="Validation controls ensure quality inputs and improve reliability across release workflows."
      icon="shield"
      points={[
        "Work-email validation for onboarding quality",
        "Input checks for triage and reporting consistency",
        "Operational guardrails to reduce workflow errors"
      ]}
    />
  );
}
