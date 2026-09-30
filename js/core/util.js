// Small helpers used everywhere: DOM lookup, safe storage access, text escaping and normalising.
export const safe = fn => { try { return fn(); } catch { return null; } };

export const $ = s => document.querySelector(s);

export const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const cap = s => s[0].toUpperCase() + s.slice(1);
