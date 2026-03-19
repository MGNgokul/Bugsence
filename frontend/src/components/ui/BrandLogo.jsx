import { useId } from "react";
import { Link } from "react-router-dom";

export default function BrandLogo({ size = 36, withText = true, subtitle = "Engineering Quality" }) {
  const id = useId().replace(/:/g, "");
  const gradA = `brand-grad-a-${id}`;
  const gradB = `brand-grad-b-${id}`;
  const glow = `brand-glow-${id}`;

  return (
    <Link className="brand-lockup" to="/" aria-label="Go to BugSense landing page">
      <svg className="brand-mark-svg" width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
        <defs>
          <linearGradient id={gradA} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--brand-grad-a-start)" />
            <stop offset="100%" stopColor="var(--brand-grad-a-end)" />
          </linearGradient>
          <linearGradient id={gradB} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-grad-b-start)" />
            <stop offset="100%" stopColor="var(--brand-grad-b-end)" />
          </linearGradient>
          <filter id={glow} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="var(--accent-2)" floodOpacity="0.28" />
          </filter>
        </defs>

        <rect x="4" y="4" width="48" height="48" rx="14" fill="var(--brand-frame-fill)" stroke="var(--brand-frame-stroke)" filter={`url(#${glow})`} />
        <rect x="8" y="8" width="40" height="40" rx="11" fill="none" stroke="color-mix(in srgb, var(--brand-frame-stroke) 62%, transparent)" />
        <circle cx="21" cy="20" r="10" fill={`url(#${gradA})`} />
        <circle cx="35" cy="35" r="11" fill={`url(#${gradB})`} />
        <path d="M19 29c4 0 7 3 7 7" stroke="var(--brand-mark)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="30.5" cy="24.5" r="2.7" fill="var(--brand-mark)" />
      </svg>

      {withText ? (
        <div>
          <h1 className="brand-title">BugSense</h1>
          <p className="brand-subtitle">{subtitle}</p>
        </div>
      ) : null}
    </Link>
  );
}
