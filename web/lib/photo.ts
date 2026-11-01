import { toast } from "sonner";

// Save the current frame as a PNG. The capture runs in a rAF queued after the renderer's own, i.e. right after
// this frame is drawn and before the browser clears the buffer, so no preserveDrawingBuffer cost.
export function takePhoto() {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;
  requestAnimationFrame(() => {
    canvas.toBlob((blob) => {
      if (!blob) { toast.error("Couldn't take the photo."); return; }
      const name = `vinyl-room-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.png`;
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement("a"), { href: url, download: name }).click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      toast.success(`Saved ${name}`);
    }, "image/png");
  });
}
