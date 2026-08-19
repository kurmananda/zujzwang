// Minimal line-icon set — replaces emoji glyphs throughout the app.
// All icons are 24x24, stroke-based, inherit color via currentColor.

function base(props) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    ...props,
  };
}

export function CrownIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M3 17h18l-1.4-7.2-4.1 3.4L12 7l-3.5 6.2-4.1-3.4L3 17Z" />
      <path d="M5 20h14" />
    </svg>
  );
}

export function KnightIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M7 20h10" />
      <path d="M8 20c-.3-2.6.2-4 1.4-5 1-.8 1.3-1.6.9-2.6-.5-1.3-.2-2.2.9-3l2-1.4c.9-.6 1-1.2.3-2L12.6 5" />
      <path d="M8.5 9.2C7.7 7.6 8 6 9.6 4.9 11 4 12.6 3.7 14 4.3c1.6.7 2.4 2 2.6 3.7.2 1.6-.3 2.8-1.3 4.1-.7.9-.9 1.7-.6 2.7l1.3 4.2" />
      <circle cx="14.3" cy="7.4" r=".6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CalendarIcon(props) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="15" rx="2.2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4M16 3v4" />
      <path d="M7.5 13h2M11 13h2M14.5 13h2M7.5 16.2h2M11 16.2h2" />
    </svg>
  );
}

export function GearIcon(props) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M17.7 6.3l-1.6 1.6M7.9 16.1l-1.6 1.6M17.7 17.7l-1.6-1.6M7.9 7.9 6.3 6.3" />
    </svg>
  );
}

export function TrophyIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4.5a1 1 0 0 0-1 1.2c.4 2 1.7 3.3 3.6 3.7M17 5h2.5a1 1 0 0 1 1 1.2c-.4 2-1.7 3.3-3.6 3.7" />
      <path d="M12 14v3M9 20.5h6M9.6 20.5c-.2-1.4.3-2.5 1.2-3M14.4 20.5c.2-1.4-.3-2.5-1.2-3" />
    </svg>
  );
}

export function PlusIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12.5 9 17l10.5-11" />
    </svg>
  );
}

export function XIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function BellIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.4 5.4 1.4 5.4H4.6S6 14 6 10Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function ChevronDownIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ArrowRightIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </svg>
  );
}

export function ExternalLinkIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M9 6h9v9" />
      <path d="M18 6 6.5 17.5" />
    </svg>
  );
}

export function UserIcon(props) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.2" r="3.4" />
      <path d="M4.7 20c1.2-3.6 4-5.5 7.3-5.5s6.1 1.9 7.3 5.5" />
    </svg>
  );
}

export function SwordsIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M4 4l7 7M4 4v4M4 4h4" />
      <path d="M20 4l-7 7M20 4v4M20 4h-4" />
      <path d="M6 14l4 4-2 2-4-4v-2h2Z" />
      <path d="M18 14l-4 4 2 2 4-4v-2h-2Z" />
    </svg>
  );
}

export function InstagramIcon(props) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LogOutIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M9 4.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 19.5h3" />
      <path d="M15 16l4.5-4-4.5-4" />
      <path d="M19.5 12H9" />
    </svg>
  );
}

export function SearchIcon(props) {
  return (
    <svg {...base(props)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.8-4.8" />
    </svg>
  );
}

export function MenuIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" />
    </svg>
  );
}

export function ShuffleIcon(props) {
  return (
    <svg {...base(props)}>
      <path d="M3 6h3.5c2 0 3 1 4.3 3M3 18h3.5c2 0 3-1 4.3-3" />
      <path d="M14 6h3.3c1.6 0 2.4.8 3.2 1.8M14 18h3.3c1.6 0 2.4-.8 3.2-1.8" />
      <path d="M17.5 3.5 20.5 6l-3 2.5M17.5 20.5l3-2.5-3-2.5" />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
