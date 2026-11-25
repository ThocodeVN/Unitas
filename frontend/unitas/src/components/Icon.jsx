const paths = {
  menu: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </>
  ),
  home: (
    <>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9M9 20v-6h6v6" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 9h18M16 14h2" />
    </>
  ),
  bank: (
    <>
      <path d="m3 9 9-6 9 6" />
      <path d="M4 10h16M5 10v8m4-8v8m6-8v8m4-8v8M3 21h18M3 18h18" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3" />
      <path d="M2 14h4m4-6h4m4 8h4" />
    </>
  ),
  plus: <path d="M12 5v14m-7-7h14" />,
  close: <path d="m18 6-12 12M6 6l12 12" />,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  "arrow-right": <path d="M5 12h14m-7-7 7 7-7 7" />,
  "arrow-down": <path d="M12 5v14m7-7-7 7-7-7" />,
  "arrow-up": <path d="M12 19V5m-7 7 7-7 7 7" />,
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5m0-8h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  "eye-off": (
    <>
      <path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a15 15 0 0 1-3 3.5M6.2 6.2C3.5 8 2 12 2 12s3.5 6 10 6c1.5 0 2.8-.4 4-1" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  task: (
    <>
      <path d="m5 12 4 4L19 6" />
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.5v1" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="m19.4 15 .1.1 1.2 1-1.2 2.1-1.5-.5a8 8 0 0 1-1.8 1l-.3 1.6h-2.4l-.3-1.6a8 8 0 0 1-1.8-1l-1.5.5-1.2-2.1 1.2-1a8 8 0 0 1 0-2l-1.2-1 1.2-2.1 1.5.5a8 8 0 0 1 1.8-1l.3-1.6h2.4l.3 1.6a8 8 0 0 1 1.8 1l1.5-.5 1.2 2.1-1.2 1a8 8 0 0 1 0 2Z" transform="translate(-1 -1)" />
    </>
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  chevron: <path d="m7 10 5 5 5-5" />,
};

export default function Icon({ name, className = "" }) {
  return (
    <svg
      className={`db-i ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.home}
    </svg>
  );
}
