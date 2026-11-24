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
