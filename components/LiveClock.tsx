"use client";

import { useEffect, useState } from "react";

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="live-clock" aria-live="polite">
      <span className="clock-dot" />
      <div>
        <small>Waktu server lokal</small>
        <strong>{now ? formatDateTime(now) : "Memuat waktu..."}</strong>
      </div>
    </div>
  );
}
