// Alternate forms per entry (data/forms.js): cosmetic forms, switchable forms, gender differences.
// A shiny's `alt` is the form id; any shiny still counts the entry, forms are extra.
const FORMS = window.FORMS || {};
// Old form ids that still live in saved shinies: Alcremie used to list cream + sweet (63 forms), but a shiny
// Alcremie only differs by its sweet, so "ruby-swirl-love-sweet" now means "love-sweet".
const OLD_IDS = { alcremie: id => id.replace(/^[a-z]+-(cream|swirl)-/, "") };
export const altId = (m, id) => id && OLD_IDS[m.key] ? OLD_IDS[m.key](id) : id;
export const altsOf = m => FORMS[m.key] || [];
export const altOf = (m, id) => id && altsOf(m).find(f => f.id === altId(m, id)) || null;
export const altSprite = (m, id) => (altOf(m, id) || {}).s || m.sprite;
// Name plus regional form and alternate form, e.g. "Vivillon · Marine Pattern".
export const formText = (m, alt) => [m.form && m.form !== "Original" ? m.form : "", (altOf(m, alt) || {}).n].filter(Boolean).join(" · ");
