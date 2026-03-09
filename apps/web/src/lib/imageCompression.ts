import {
  QUIZ_LIMITS,
  type ImageAsset
} from "@quiz/shared";

type ImageKind = "cover" | "question";

const IMAGE_LIMITS: Record<
  ImageKind,
  { maxBytes: number; maxDimension: number }
> = {
  cover: {
    maxBytes: QUIZ_LIMITS.maxCoverBytes,
    maxDimension: 1400
  },
  question: {
    maxBytes: QUIZ_LIMITS.maxQuestionImageBytes,
    maxDimension: 1200
  }
};

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Das ausgewählte Bild konnte nicht gelesen werden."));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Das ausgewählte Bild konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });

  if (!blob) {
    throw new Error("Dieses Bild konnte nicht verarbeitet werden.");
  }

  return blob;
}

export async function compressImageFile(
  file: File,
  kind: ImageKind
): Promise<ImageAsset> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Es werden nur PNG-, JPEG- und WebP-Bilder unterstützt.");
  }
  if (file.size > QUIZ_LIMITS.maxRawImageBytes) {
    throw new Error("Dieses Bild ist bereits vor der Komprimierung zu groß.");
  }

  const limit = IMAGE_LIMITS[kind];
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, limit.maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Dieses Bild konnte nicht vorbereitet werden.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await canvasToBlob(canvas, "image/webp", 0.82);
  let mimeType: ImageAsset["mimeType"] = "image/webp";

  if (blob.size > limit.maxBytes) {
    blob = await canvasToBlob(canvas, "image/jpeg", 0.76);
    mimeType = "image/jpeg";
  }

  if (blob.size > limit.maxBytes) {
    throw new Error("Das Bild ist immer noch zu groß. Bitte verwende ein kleineres Bild.");
  }

  return {
    dataUrl: await fileToDataUrl(blob),
    mimeType,
    width,
    height,
    bytes: blob.size,
    alt: file.name.replace(/\.[^.]+$/, "")
  };
}
