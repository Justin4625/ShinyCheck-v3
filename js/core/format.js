// Number, date, duration and percentage formatting.
export const fmtDate = ts => ts ? new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date unknown";
export const fmtTime = s => `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, "0")}m ${String(s % 60).padStart(2, "0")}s`;
export const fmtShort = s => s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.floor(s / 60) % 60}m` : s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
export const nf = n => n.toLocaleString("en-US");
export const fmtPct = p => (p === 100 || p === 0 ? p.toFixed(0) : p.toFixed(1)) + "%";
