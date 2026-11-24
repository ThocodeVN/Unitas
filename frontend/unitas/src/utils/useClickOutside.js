import { useEffect } from "react";

export default function useClickOutside(ref, onOutside) {
  useEffect(() => {
    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onOutside();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") onOutside();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [ref, onOutside]);
}
