// Alternate forms per entry (data/forms.js): cosmetic forms, switchable forms, gender differences.
// A shiny's `alt` is the form id; any shiny still counts the entry, forms are extra.
const FORMS = window.FORMS || {};
export const altsOf = m => FORMS[m.key] || [];
export const altOf = (m, id) => id && altsOf(m).find(f => f.id === id) || null;
export const altSprite = (m, id) => (altOf(m, id) || {}).s || m.sprite;
// Name plus regional form and alternate form, e.g. "Vivillon · Marine Pattern".
export const formText = (m, alt) => [m.form && m.form !== "Original" ? m.form : "", (altOf(m, alt) || {}).n].filter(Boolean).join(" · ");
