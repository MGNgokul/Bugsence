import { useId } from "react";

const iconPaths = {
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </>
  ),
  bug: (
    <>
      <path d="M8 8c0-2.2 1.8-4 4-4s4 1.8 4 4v9a4 4 0 1 1-8 0Z" />
      <path d="M10 4 8.5 2.5M14 4l1.5-1.5M3 10h4M17 10h4M3 15h4M17 15h4" />
    </>
  ),
  work: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a3 3 0 0 1 6 0v2M3 12h18" />
    </>
  ),
  activity: (
    <>
      <path d="M3 12h4l2.5-5L14 17l2.5-5H21" />
      <circle cx="3" cy="12" r="1.2" />
      <circle cx="21" cy="12" r="1.2" />
    </>
  ),
  bell: (
    <>
      <path d="M6 10a6 6 0 1 1 12 0v4l2 2H4l2-2Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20a6 6 0 0 1 12 0M13.5 20a4.5 4.5 0 0 1 7.5-3.2" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6Z" />
      <path d="m9.5 12 1.8 1.8L15 10.2" />
    </>
  ),
  rocket: (
    <>
      <path d="M8 16c-2-5 2-10 9-11 1 7-4 11-9 9Z" />
      <path d="m10 14-4 4M7 17l-2 2M11 20l2-2" />
      <circle cx="13.5" cy="9.5" r="1.5" />
    </>
  ),
  stats: (
    <>
      <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" />
    </>
  )
};

const iconGradients = {
  dashboard: ["#ff8a00", "#ff5f6d"],
  bug: ["#ff4d6d", "#ff9e00"],
  work: ["#32d6a6", "#2f80ed"],
  activity: ["#00c6ff", "#0072ff"],
  bell: ["#f9d423", "#ff4e50"],
  team: ["#a18cd1", "#fbc2eb"],
  plus: ["#43e97b", "#38f9d7"],
  spark: ["#fddb92", "#d1fdff"],
  shield: ["#5ee7df", "#b490ca"],
  rocket: ["#fa709a", "#fee140"],
  stats: ["#30cfd0", "#330867"]
};

export default function AppIcon({ name, size = 18, className = "", colorful = true }) {
  const id = useId().replace(/:/g, "");
  const [start, end] = iconGradients[name] || iconGradients.spark;
  const gradientId = `icon-grad-${name || "spark"}-${id}`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colorful ? `url(#${gradientId})` : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {colorful ? (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={start} />
            <stop offset="100%" stopColor={end} />
          </linearGradient>
        </defs>
      ) : null}
      {iconPaths[name] || iconPaths.spark}
    </svg>
  );
}
