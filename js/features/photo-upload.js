// Own profile photo, for the admin only (Edit profile → Upload; firestore.rules allows the data URL for
// isAdmin() only): picks an image, crops it to a centred square and shrinks it to a small JPEG data URL
// that fits in the profile document (no Firebase Storage, which needs the paid plan).
const SIZE = 320, MAX = 90000;
export const isUpload = photo => /^data:image\//.test(photo || "");

// Resolves with the data URL, or null when nothing was picked.
export function pickPhoto() {
  return new Promise((resolve, reject) => {
    const input = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return resolve(null);
      shrink(file).then(resolve, reject);
    });
    input.click();
  });
}

async function shrink(file) {
  const img = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(img.width, img.height), canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  img.close();
  for (const q of [.85, .75, .6, .45]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length <= MAX) return url;
  }
  throw new Error("Photo too big");
}
