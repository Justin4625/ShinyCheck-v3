// Hunt pace: encounters per hour from a hunt's own count and timer, and what that pace means for the odds.
// Shiny rolls don't remember earlier encounters, so the average wait for a shiny from any point in a hunt
// is always odds ÷ pace; "to N× odds" is only a milestone, not a promise.

// Below this the pace swings too much to be worth showing.
export const PACE_MIN_SECS = 60, PACE_MIN_COUNT = 5;

// secs = the hunt's elapsed seconds. Returns null until there's enough to go on.
export function huntPace(h, secs) {
  if (secs < PACE_MIN_SECS || h.count < PACE_MIN_COUNT) return null;
  const perSec = h.count / secs;
  // Next whole multiple of the odds still ahead: 1× (63% of hunters have it), then 2×, 3×, …
  const next = Math.floor(h.count / h.odds) + 1;
  return {
    perHour: perSec * 3600,
    next,
    toNext: (next * h.odds - h.count) / perSec,
    perShiny: h.odds / perSec,
  };
}
