"use client";
import { useEffect, useRef, useState } from "react";
import { nearestCity } from "../lib/cities";

type Status = "idle" | "locating" | "denied" | "error" | "toofar";

/**
 * Shown in the empty state (no LoCAL selected). On first visit it auto-prompts
 * the browser location check and, on success, fills in the nearest supported
 * city. Remembers the user's decision so it doesn't re-prompt every reload, and
 * falls back to the manual picker on denial / no nearby city.
 */
export function LocationPrompt({
  onDetect,
  onManual,
}: {
  onDetect: (cityName: string) => void;
  onManual: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const triedAuto = useRef(false);

  const locate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try { localStorage.setItem("blocal_geo_decided", "1"); } catch {}
        const r = nearestCity(pos.coords.latitude, pos.coords.longitude);
        if (r) onDetect(r.city.name);
        else setStatus("toofar");
      },
      (err) => {
        try { localStorage.setItem("blocal_geo_decided", "1"); } catch {}
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  };

  // Auto-prompt once per browser, unless they've already made a choice.
  useEffect(() => {
    if (triedAuto.current) return;
    triedAuto.current = true;
    let decided = false;
    try { decided = localStorage.getItem("blocal_geo_decided") === "1"; } catch {}
    if (!decided) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const message =
    status === "denied"
      ? "Location access was blocked."
      : status === "toofar"
      ? "No B LoCAL near you yet."
      : status === "error"
      ? "Couldn't read your location."
      : "";

  return (
    <div className="w-full flex justify-center px-4 pt-6 font-mono">
      <div
        style={{ borderColor: "var(--primary)", backgroundColor: "var(--bg-main)" }}
        className="w-full max-w-md border rounded-sm px-6 py-5 flex flex-col items-center gap-3 text-center"
      >
        <p
          style={{ color: "var(--primary)" }}
          className="font-black uppercase tracking-tighter leading-tight text-sm"
        >
          {status === "locating"
            ? "📍 Finding events near you…"
            : message || "📍 Find events near you"}
        </p>

        {status !== "locating" && (
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={locate}
              style={{ backgroundColor: "var(--primary)", color: "var(--bg-main)" }}
              className="px-4 py-2 rounded-sm text-[11px] font-black uppercase tracking-wide hover:opacity-90 transition-opacity"
            >
              {status === "idle" ? "Use my location" : "Try again"}
            </button>
            <button
              onClick={onManual}
              style={{ borderColor: "var(--border-color)", color: "var(--text-main)" }}
              className="px-4 py-2 rounded-sm border text-[11px] font-black uppercase tracking-wide hover:border-[var(--primary)]/50 transition-colors"
            >
              Pick manually
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
