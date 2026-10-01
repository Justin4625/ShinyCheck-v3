// Crop your photo (admin's own profile photo, features/photo-upload.js): the photo behind a round frame,
// dragged to move it and zoomed with the slider, the −/+ buttons, the mouse wheel or a pinch.
// The image always covers the circle. Resolves with a square canvas of what's inside it, or null.
import { closeDlg, openDlg } from "../components/dialog.js";
import { $ } from "../core/util.js";

const dlg = $("#cropDlg"), stage = $("#cropStage"), img = $("#cropImg"), slider = $("#cropZoom");
const MAX_ZOOM = 5, RING = .86; // the circle's diameter as a share of the stage
let done = null, zoom = 1, x = 0, y = 0;
const pointers = new Map();
let pinch = null, drag = null;

const ring = () => stage.clientWidth * RING;
const base = () => ring() / Math.min(img.naturalWidth, img.naturalHeight); // scale at which the photo just covers the circle
const scale = () => base() * zoom;

// Keeps the photo over the whole circle, then draws it.
function paint() {
  const s = scale(), d = ring();
  const mx = Math.max(0, (img.naturalWidth * s - d) / 2), my = Math.max(0, (img.naturalHeight * s - d) / 2);
  x = Math.min(mx, Math.max(-mx, x));
  y = Math.min(my, Math.max(-my, y));
  img.style.width = `${img.naturalWidth * s}px`;
  img.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
  slider.value = zoom;
}

// Zooms around the stage's centre, so what's in the middle stays there.
function setZoom(z) {
  const next = Math.min(MAX_ZOOM, Math.max(1, z)), k = next / zoom;
  x *= k; y *= k; zoom = next;
  paint();
}

// What's inside the circle, as a size × size canvas.
function crop(size) {
  const s = scale(), side = ring() / s;
  const cx = img.naturalWidth / 2 - x / s, cy = img.naturalHeight / 2 - y / s;
  const canvas = Object.assign(document.createElement("canvas"), { width: size, height: size });
  canvas.getContext("2d").drawImage(img, cx - side / 2, cy - side / 2, side, side, 0, 0, size, size);
  return canvas;
}

function finish(result) {
  closeDlg(dlg);
  URL.revokeObjectURL(img.src);
  const d = done;
  done = null;
  if (d) d(result);
}

// Shows `file` in the crop dialog; resolves with a size × size canvas, or null when cancelled.
export function cropPhoto(file, size) {
  return new Promise((resolve, reject) => {
    img.onload = () => {
      done = canvas => resolve(canvas);
      openDlg(dlg);
      zoom = 1; x = 0; y = 0;
      requestAnimationFrame(paint);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error("Not an image")); };
    dlg.dataset.size = size;
    img.src = URL.createObjectURL(file);
  });
}

// Wiring: runs once at startup, from main.js (before Edit profile, so Escape closes this dialog first).
export function init() {
  dlg.addEventListener("click", e => {
    if (e.target === dlg || e.target.closest("[data-crop-cancel]")) return finish(null);
    const step = e.target.closest("[data-crop-step]");
    if (step) setZoom(zoom * (step.dataset.cropStep > 0 ? 1.25 : 0.8));
  });
  addEventListener("keydown", e => {
    if (e.key === "Escape" && !dlg.hidden) { e.stopImmediatePropagation(); finish(null); }
  }, true);
  $("#cropDone").addEventListener("click", () => finish(crop(+dlg.dataset.size)));
  slider.addEventListener("input", () => setZoom(+slider.value));
  stage.addEventListener("wheel", e => { e.preventDefault(); setZoom(zoom * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });

  // One finger or the mouse moves the photo; two fingers pinch to zoom.
  const dist = () => { const [a, b] = [...pointers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  stage.addEventListener("pointerdown", e => {
    stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { pinch = { d: dist(), zoom }; drag = null; }
    else if (pointers.size === 1) drag = { x: e.clientX - x, y: e.clientY - y };
  });
  stage.addEventListener("pointermove", e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) setZoom(pinch.zoom * dist() / pinch.d);
    else if (drag) { x = e.clientX - drag.x; y = e.clientY - drag.y; paint(); }
  });
  const up = e => {
    pointers.delete(e.pointerId);
    pinch = null;
    const [rest] = [...pointers.values()];
    drag = rest ? { x: rest.x - x, y: rest.y - y } : null;
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
}
