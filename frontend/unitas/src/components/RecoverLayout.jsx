import logo from "../assets/unitas-logo-white.png";
import "../styles/auth.css";
import "../styles/recover.css";

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const MailIcon = () => (
  <svg {...svgProps}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const LockIcon = () => (
  <svg {...svgProps}>
    <rect x="5" y="11" width="14" height="9" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.8 2.8L16 9.8" />
  </svg>
);

export const AlertIcon = () => (
  <svg {...svgProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5" />
    <path d="M12 16.5h.01" />
  </svg>
);

export default function RecoverLayout({ children }) {
  return (
    <div className="rc-page">
      <aside className="rc-brand">
        <img className="rc-logo" src={logo} alt="Unitas" />
        <span className="rc-bar" />
        <h2 className="rc-tagline">Ở chung, chi tiêu rõ ràng.</h2>
        <p className="rc-tag-sub">
          Quỹ chung, việc chung của cả phòng trọ — gọn trong một nơi.
        </p>
      </aside>
      <main className="rc-main">
        <div className="rc-card">{children}</div>
      </main>
    </div>
  );
}
