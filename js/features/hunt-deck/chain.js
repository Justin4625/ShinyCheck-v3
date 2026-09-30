// Poké Radar chain (X & Y, BD & SP): every encounter adds one to the chain, "Chain broke" drops it
// back to 0 (with Undo), and the odds follow the chain. The chain lives in the hunt's setup, so it
// carries over to the next hunt in that game, like it does in the game after a shiny.
import { toast } from "../../components/toast.js";
import { nf } from "../../core/format.js";
import { $ } from "../../core/util.js";
import { curGame, hunt, setHunt } from "./deck.js";
import { chainOf, defaultSetup, evalSetup, liveChain, patchSetup } from "../../model/hunt-setup.js";

const setupOf = h => h.setup || defaultSetup(curGame);
// The hunt fields for a new chain length: setup (and the level it picks) plus the odds.
function withChain(h, n) {
  const b = liveChain(curGame, setupOf(h));
  const setup = patchSetup(curGame, setupOf(h), { [b.id + "N"]: Math.max(0, n) });
  return { setup, odds: evalSetup(curGame, setup).odds, best: Math.max(h.best || 0, n) };
}
// Fields to add to an encounter (+1 / −1): the chain moves along with the count.
export function chainStep(h, sign) {
  const b = liveChain(curGame, setupOf(h));
  return b ? withChain(h, chainOf(b, setupOf(h)) + sign) : {};
}

export function paintChain(h) {
  const b = liveChain(curGame, setupOf(h)), box = $("#drChain");
  box.hidden = !b;
  if (!b) return;
  const n = chainOf(b, setupOf(h)), breaks = h.breaks || 0;
  $("#drChainN").textContent = nf(n);
  $("#drChainNote").textContent = [breaks ? `broke ${breaks}×` : "", h.best ? `longest ${nf(h.best)}` : ""].filter(Boolean).join(" · ");
  $("#drChainBreak").disabled = !n;
}

function breakChain() {
  const h = hunt(), b = liveChain(curGame, setupOf(h));
  const n = b && chainOf(b, setupOf(h));
  if (!n) return;
  setHunt({ ...withChain(h, 0), breaks: (h.breaks || 0) + 1 });
  toast(`Chain broke at ${nf(n)} — back to 0`, { label: "Undo", run: () => {
    const now = hunt();
    setHunt({ ...withChain(now, n), breaks: Math.max(0, (now.breaks || 1) - 1) });
  } });
}

// Wiring: runs once at startup, from main.js.
export function init() {
  $("#drChainBreak").addEventListener("click", breakChain);
}
