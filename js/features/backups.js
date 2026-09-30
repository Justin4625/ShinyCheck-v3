// Backups dialog: weekly and manual backups in the account, with restore.
import { toast } from "../components/toast.js";
import { arm, disarm } from "../components/two-step.js";
import { fmtDate } from "../core/format.js";
import { $, esc } from "../core/util.js";
import { applyData, snapshot } from "./sync.js";

const bk = { root: $("#backups") };
const BK_KIND = { auto: "Weekly", manual: "Manual", "before-restore": "Before restore" };
async function paintBackups() {
  const list = $("#bkList"), api = window.Cloud && window.Cloud.backups;
  if (!api || !api.available()) {
    list.innerHTML = `<li class="bk-empty">Sign in to use backups — they're stored in your account. Without an account, use Export.</li>`;
    $("#bkNow").hidden = true;
    return;
  }
  $("#bkNow").hidden = false;
  list.innerHTML = `<li class="bk-empty">Loading…</li>`;
  try {
    const items = await api.list();
    list.innerHTML = items.length ? items.map(b => `<li>
          <span class="bk-main"><b>${new Date(b.date).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</b>
          <small>${esc(BK_KIND[b.kind] || b.kind)} · ${b.counts?.shinies ?? "?"} shinies · ${b.counts?.hunts ?? "?"} hunts</small></span>
          <button class="bk-restore" data-restore="${b.id}">Restore</button>
        </li>`).join("") : `<li class="bk-empty">No backups yet. The first one is made automatically, or press Back up now.</li>`;
  } catch (err) {
    list.innerHTML = `<li class="bk-empty">Backups aren't available yet (${esc(err.code || err.message || "error")}). The Firebase rules may need the backups section.</li>`;
  }
}
const closeBackups = () => { bk.root.hidden = true; document.body.classList.remove("drawer-open"); };

// Export / import / reset
const countShinies = data => Object.values(data.shinies || {}).reduce((n, list) => n + (Array.isArray(list) ? list.length : 0), 0);
const countHunts = data => Object.keys(data.hunts || {}).length;

// Wiring: runs once at startup, from main.js.
export function init() {
  $("#backupsOpen").addEventListener("click", () => { bk.root.hidden = false; document.body.classList.add("drawer-open"); paintBackups(); });
  bk.root.addEventListener("click", async e => {
    if (e.target === bk.root || e.target.closest("[data-bkclose]")) return closeBackups();
    const r = e.target.closest("[data-restore]");
    if (!r || !arm(r, "Tap again to restore")) return;
    disarm();
    r.disabled = true; r.textContent = "Restoring…";
    try { await window.Cloud.backups.restore(r.dataset.restore); toast("Backup restored ✦"); closeBackups(); }
    catch (err) { toast(`Restore failed (${err.code || err.message})`); paintBackups(); }
  });
  $("#bkNow").addEventListener("click", async e => {
    const b = e.currentTarget;
    b.disabled = true; b.textContent = "Backing up…";
    try { await window.Cloud.backups.create(); toast("Backup saved to your account ✦"); }
    catch (err) { toast(`Backup failed (${err.code || err.message})`); }
    b.disabled = false; b.textContent = "Back up now ✦";
    paintBackups();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !bk.root.hidden) { e.stopImmediatePropagation(); closeBackups(); } }, true);

  $("#export").addEventListener("click", () => {
    const data = { app: "ShinyCheck", ...snapshot(), exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob), download: `shinycheck-backup-${new Date().toISOString().slice(0, 10)}.json`,
    });
    document.body.append(a);
    a.click();
    a.remove();
    // Revoking right away can cancel the download in Safari/Firefox.
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    toast(`Backup saved · ${countShinies(data)} shinies, ${countHunts(data)} hunts`);
  });
  $("#import").addEventListener("change", async e => {
    const f = e.target.files[0];
    if (!f) return;
    e.target.value = "";
    let data;
    try { data = JSON.parse(await f.text()); } catch { return toast("That file couldn't be read"); }
    // Only accept ShinyCheck backups; anything else would silently wipe the collection.
    const isBackup = data && typeof data === "object" && !Array.isArray(data) && typeof data.version === "number"
      && ["shinies", "hunts", "caught"].some(k => k in data)
      && (!data.shinies || typeof data.shinies === "object") && (!data.hunts || typeof data.hunts === "object");
    if (!isBackup) return toast("That isn't a ShinyCheck backup — nothing was changed");
    const now = snapshot(), s = countShinies(data), h = countHunts(data);
    const when = data.exportedAt ? ` from ${fmtDate(data.exportedAt)}` : "";
    const warnEmpty = !s && !h ? "\n\nThis backup has no shinies or hunts." : "";
    if (!confirm(`Replace your current collection (${countShinies(now)} shinies, ${countHunts(now)} hunts) with this backup${when} (${s} shinies, ${h} hunts)?${warnEmpty}\n\nThis can't be undone — export first if you want to keep what you have now.`)) return;
    applyData(data);
    window.Cloud && window.Cloud.flush();
    toast(`Backup loaded · ${s} shinies, ${h} hunts`);
  });
  $("#reset").addEventListener("click", () => {
    if (!confirm("Reset your whole collection — every shiny log and hunt? Export a backup first if you want to keep it.")) return;
    applyData({});
    window.Cloud && window.Cloud.flush();
    toast("Collection reset");
  });
}
