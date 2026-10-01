// Own profile photo, for the admin only (Edit profile → Upload; firestore.rules allows the data URL for
// isAdmin() only): picks an image, lets you place it in the circle (features/photo-crop.js) and shrinks
// it to a small JPEG data URL that fits in the profile document (no Firebase Storage, which needs the paid plan).
import { cropPhoto } from "./photo-crop.js";

const SIZE = 320, MAX = 90000;
export const isUpload = photo => /^data:image\//.test(photo || "");

// Resolves with the data URL, or null when nothing was picked or the crop was cancelled.
export function pickPhoto() {
  return new Promise((resolve, reject) => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return resolve(null);
      cropPhoto(file, SIZE).then(canvas => resolve(canvas && encode(canvas)), reject);
    });
    input.click();
  });
}

function encode(canvas) {
  for (const q of [.85, .75, .6, .45]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length <= MAX) return url;
  }
  throw new Error("Photo too big");
}
