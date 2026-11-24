import { useState } from "react";

export default function Avatar({ user, size = 40 }) {
  const [failedSrc, setFailedSrc] = useState("");
  const name = user?.fullName || user?.username || "?";
  const style = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.42),
  };
  const src = user?.avatar || "";

  if (src && failedSrc !== src) {
    return (
      <img
        className="db-avatar"
        style={style}
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <span
      className="db-avatar db-avatar--letter"
      style={style}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
