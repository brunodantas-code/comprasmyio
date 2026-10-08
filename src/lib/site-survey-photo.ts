import { toast } from "sonner";

export const SURVEY_PHOTO_MAX_BYTES = 500 * 1024;
const prepared = new WeakMap<File, Promise<File>>();
let processing: Promise<unknown> = Promise.resolve();

/** Browser-only work, cached for retries and serialized to bound phone memory. */
export function prepareSurveyPhoto(file: File): Promise<File> {
  const cached = prepared.get(file);
  if (cached) return cached;
  if (!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name) && !/^image\/(jpeg|png|webp|hei[cf])$/i.test(file.type)) return Promise.resolve(file);
  const result = processing.catch(() => undefined).then(async () => {
    try {
      let input = file;
      if (/\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type)) {
        const { heicTo } = await import("heic-to/csp");
        const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.85 });
        input = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg", lastModified: file.lastModified });
      }
      const { default: compress } = await import("browser-image-compression");
      const blob = await compress(input, {
        maxSizeMB: SURVEY_PHOTO_MAX_BYTES / 1024 / 1024,
        maxWidthOrHeight: 1600,
        initialQuality: 0.82,
        maxIteration: 12,
        useWebWorker: false,
        fileType: "image/jpeg",
        preserveExif: false,
      });
      if (blob.size > SURVEY_PHOTO_MAX_BYTES) throw new Error("Foto acima do tamanho desejado");
      if (file.type === "image/jpeg" && file.size <= blob.size) return file;
      return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
    } catch {
      // Preserve the photo and inspection flow on devices unable to decode it.
      toast.warning("Não foi possível reduzir esta foto. Ela será enviada no tamanho original.");
      return file;
    }
  });
  prepared.set(file, result);
  processing = result.then(() => undefined, () => undefined);
  return result;
}
