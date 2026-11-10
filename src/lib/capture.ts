export type CapturedFrame = {
  blob: Blob;
  width: number;
  height: number;
};

export type Crop = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CaptureNotice = {
  title: string;
  body: string;
};

export function captureErrorNotice(error: unknown): CaptureNotice {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "AbortError") {
    return {
      title: "No screen was shared",
      body: "Permission was denied, or the share prompt was closed. Try Analyze again, upload a photo, or type the problem.",
    };
  }
  if (name === "NotSupportedError" || name === "SecurityError") {
    return {
      title: "Screen capture isn't available here",
      body: "This browser can't share a screen from this page. Upload a photo or type the problem instead.",
    };
  }
  if (name === "NotFoundError") {
    return {
      title: "Nothing to share",
      body: "No screen or window was available. Upload a photo or type the problem.",
    };
  }
  if (error instanceof Error && error.message) {
    return { title: "The frame didn't come through", body: error.message };
  }
  return {
    title: "The frame didn't come through",
    body: "Try Analyze again, or upload a photo of the problem.",
  };
}

export function insetCrop(width: number, height: number): Crop {
  const x = Math.round(width * 0.08);
  const y = Math.round(height * 0.1);
  return clampCrop(
    { x, y, w: width - x * 2, h: height - y * 2 },
    width,
    height,
  );
}

export function clampCrop(crop: Crop, width: number, height: number): Crop {
  const min = Math.min(64, width, height);
  const w = Math.min(Math.max(min, crop.w), width);
  const h = Math.min(Math.max(min, crop.h), height);
  const x = Math.min(Math.max(0, crop.x), width - w);
  const y = Math.min(Math.max(0, crop.y), height - h);
  return { x, y, w, h };
}

export async function captureScreenFrame(): Promise<CapturedFrame> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new DOMException(
      "Screen capture is not available in this browser.",
      "NotSupportedError",
    );
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
  });

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  video.style.position = "fixed";
  video.style.left = "-9999px";
  video.style.width = "1px";
  video.style.height = "1px";
  document.body.appendChild(video);

  try {
    await video.play();
    await waitForFrame(video);
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      throw new Error("The shared screen did not produce a frame.");
    }
    const canvas = scaleCanvas(width, height, 1600);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not read the shared screen.");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, 0.86);
    return { blob, width: canvas.width, height: canvas.height };
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    video.remove();
  }
}

export async function fileToFrame(file: File): Promise<CapturedFrame> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a PNG, JPEG, WEBP, or GIF.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("That image is over 10 MB. Try a smaller photo.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const canvas = scaleCanvas(image.naturalWidth, image.naturalHeight, 1600);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not read that photo.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await canvasToBlob(canvas, 0.86);
    return { blob, width: canvas.width, height: canvas.height };
  } catch {
    throw new Error("This photo format isn't supported. Use a PNG or JPEG.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadSampleFrame(): Promise<CapturedFrame> {
  const image = await loadImage("/sample-problem.svg");
  const width = image.naturalWidth || 1200;
  const height = image.naturalHeight || 760;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the sample worksheet.");
  context.drawImage(image, 0, 0, width, height);
  const blob = await canvasToBlob(canvas, 0.92);
  return { blob, width, height };
}

export async function frameToDataUrl(blob: Blob, crop: Crop | null): Promise<string> {
  const bitmap = await createImageBitmap(blob);
  try {
    const region = crop ?? { x: 0, y: 0, w: bitmap.width, h: bitmap.height };
    const sx = Math.max(0, Math.round(region.x));
    const sy = Math.max(0, Math.round(region.y));
    const sw = Math.max(1, Math.min(bitmap.width - sx, Math.round(region.w)));
    const sh = Math.max(1, Math.min(bitmap.height - sy, Math.round(region.h)));
    const canvas = scaleCanvas(sw, sh, 1400);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the image.");
    context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return shrinkJpeg(canvas, 1_400_000);
  } finally {
    bitmap.close();
  }
}

function scaleCanvas(width: number, height: number, maxEdge: number): HTMLCanvasElement {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not save the frame."))),
      "image/jpeg",
      quality,
    );
  });
}

function shrinkJpeg(canvas: HTMLCanvasElement, maxChars: number): string {
  let quality = 0.86;
  let current = canvas;
  let dataUrl = current.toDataURL("image/jpeg", quality);
  for (let attempt = 0; attempt < 5 && dataUrl.length > maxChars; attempt += 1) {
    quality = Math.max(0.5, quality - 0.12);
    if (dataUrl.length > maxChars && attempt >= 2) {
      current = scaleCanvas(
        Math.round(current.width * 0.75),
        Math.round(current.height * 0.75),
        Math.max(current.width, current.height),
      );
      const context = current.getContext("2d");
      if (!context) break;
      context.drawImage(canvas, 0, 0, current.width, current.height);
    }
    dataUrl = current.toDataURL("image/jpeg", quality);
  }
  return dataUrl;
}

async function waitForFrame(video: HTMLVideoElement): Promise<void> {
  if (video.readyState < 2) {
    await new Promise<void>((resolve) => {
      video.addEventListener("loadeddata", () => resolve(), { once: true });
    });
  }
  const withCallback = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (callback: () => void) => number;
  };
  if (typeof withCallback.requestVideoFrameCallback === "function") {
    await new Promise<void>((resolve) => {
      withCallback.requestVideoFrameCallback?.(() => {
        withCallback.requestVideoFrameCallback?.(() => resolve());
      });
    });
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the image."));
    image.src = src;
  });
}
