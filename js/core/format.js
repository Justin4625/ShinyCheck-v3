// Number, date, duration and percentage formatting.
export const fmtDate = ts => ts ? new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date unknown";
export const fmtTime = s => `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, "0")}m ${String(s % 60).padStart(2, "0")}s`;
export const fmtShort = s => s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
export const nf = n => n.toLocaleString("en-US");
export const fmtPct = p => (p === 100 || p === 0 ? p.toFixed(0) : p.toFixed(1)) + "%";
// Rough duration for estimates: "~2d 5h", "~9h 20m", "~12m", "<1m".
export const fmtEta = s => s < 60 ? "<1m" : "~" + (s >= 86400 ? `${Math.floor(s / 86400)}d ${Math.floor(s / 3600) % 24}h`
  : s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : `${Math.floor(s / 60)}m`);
// Clock time for "around 21:40", with the weekday when it's not today: "Sat 14:05".
export const fmtClock = ts => {
  const d = new Date(ts), t = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? t : `${d.toLocaleDateString("en-GB", { weekday: "short" })} ${t}`;
};
