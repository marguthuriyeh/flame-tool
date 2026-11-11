"use client";

import { useRef, type PointerEvent } from "react";
import { clampCrop, insetCrop, type Crop } from "@/lib/capture";
import { Button } from "@/components/ui/button";

type DragKind = "move" | "nw" | "ne" | "sw" | "se";

export function CropFrame({
  url,
  width,
  height,
  crop,
  onCropChange,
  disabled,
}: {
  url: string;
  width: number;
  height: number;
  crop: Crop | null;
  onCropChange: (crop: Crop | null) => void;
  disabled?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ kind: DragKind; startX: number; startY: number; orig: Crop } | null>(null);

  function pointFrom(event: PointerEvent<HTMLElement>) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height,
    };
  }

  function onPointerDown(event: PointerEvent<HTMLElement>, kind: DragKind) {
    if (!crop || disabled) return;
    event.preventDefault();
    event.stopPropagation();
    frameRef.current?.setPointerCapture(event.pointerId);
    const point = pointFrom(event);
    dragRef.current = { kind, startX: point.x, startY: point.y, orig: crop };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointFrom(event);
    const dx = point.x - drag.startX;
    const dy = point.y - drag.startY;
    const orig = drag.orig;
    let next: Crop = orig;
    if (drag.kind === "move") next = { ...orig, x: orig.x + dx, y: orig.y + dy };
    if (drag.kind === "se") next = { ...orig, w: orig.w + dx, h: orig.h + dy };
    if (drag.kind === "sw") next = { x: orig.x + dx, y: orig.y, w: orig.w - dx, h: orig.h + dy };
    if (drag.kind === "ne") next = { x: orig.x, y: orig.y + dy, w: orig.w + dx, h: orig.h - dy };
    if (drag.kind === "nw") next = { x: orig.x + dx, y: orig.y + dy, w: orig.w - dx, h: orig.h - dy };
    onCropChange(clampCrop(next, width, height));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  const cropping = crop !== null;

  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <p className="text-[11px] text-muted-foreground">
          {cropping ? "Drag to crop (optional)." : "Full frame."}
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-[11px]"
            variant={cropping ? "outline" : "secondary"}
            disabled={disabled}
            onClick={() => onCropChange(null)}
          >
            Full
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 px-2 text-[11px]"
            variant={cropping ? "secondary" : "outline"}
            disabled={disabled}
            onClick={() => onCropChange(crop ?? insetCrop(width, height))}
          >
            Crop
          </Button>
        </div>
      </div>
      <div className="mt-2 flex justify-center">
        <div
          ref={frameRef}
          className="relative inline-block max-w-full overflow-hidden rounded-md bg-[#0a0a0b]"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Blob previews cannot go through next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Frame to analyze"
            draggable={false}
            className="block h-auto max-h-40 w-auto max-w-full select-none"
          />
          {crop && (
            <div
              role="group"
              aria-label="Crop region. Drag to move."
              className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_rgba(36,24,18,0.55)]"
              style={{
                left: `${(crop.x / width) * 100}%`,
                top: `${(crop.y / height) * 100}%`,
                width: `${(crop.w / width) * 100}%`,
                height: `${(crop.h / height) * 100}%`,
              }}
              onPointerDown={(event) => onPointerDown(event, "move")}
            >
              <Handle label="Resize crop from top left" left="0%" top="0%" onPointerDown={(event) => onPointerDown(event, "nw")} />
              <Handle label="Resize crop from top right" left="100%" top="0%" onPointerDown={(event) => onPointerDown(event, "ne")} />
              <Handle label="Resize crop from bottom left" left="0%" top="100%" onPointerDown={(event) => onPointerDown(event, "sw")} />
              <Handle label="Resize crop from bottom right" left="100%" top="100%" onPointerDown={(event) => onPointerDown(event, "se")} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Handle({
  label,
  left,
  top,
  onPointerDown,
}: {
  label: string;
  left: string;
  top: string;
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center"
      style={{ left, top }}
      onPointerDown={onPointerDown}
    >
      <span className="h-3.5 w-3.5 rounded-[4px] border-2 border-white bg-primary" />
    </button>
  );
}
