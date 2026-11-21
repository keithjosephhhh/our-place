"use client";
import { useCallback, useEffect, useRef } from "react";
import { FILTER_CSS, type FilterKind, type FitKind, type FrameKind } from "@/lib/stageStyle";

interface Props {
  stream: MediaStream | null;
  label: string;
  frame: FrameKind;
  color: string;
  filter: FilterKind;
  fit?: FitKind;
  muted?: boolean;
  mirror?: boolean;
  camOff?: boolean;
  waitingText?: string;
  /** Show the whole picture (letterboxed over a soft blurred copy) instead of cropping to fill. */
  contain?: boolean;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
}

/** Defines the heart-shaped clip path once (rendered by the stage). */
export function HeartDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        <clipPath id="heart-clip" clipPathUnits="objectBoundingBox">
          <path d="M0.5,0.95 C0.1,0.65 0,0.42 0,0.28 C0,0.1 0.14,0 0.28,0 C0.38,0 0.46,0.05 0.5,0.13 C0.54,0.05 0.62,0 0.72,0 C0.86,0 1,0.1 1,0.28 C1,0.42 0.9,0.65 0.5,0.95 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function VideoFrame(p: Props) {
  const el = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef(p.stream);
  streamRef.current = p.stream;

  const setRef = useCallback((n: HTMLVideoElement | null) => {
    el.current = n;
    if (p.videoRef) p.videoRef.current = n;
    if (n && n.srcObject !== streamRef.current) n.srcObject = streamRef.current;
  }, [p.videoRef]);
  useEffect(() => { if (el.current && el.current.srcObject !== p.stream) el.current.srcObject = p.stream; }, [p.stream]);

  const bg = useRef<HTMLVideoElement | null>(null);
  useEffect(() => { if (bg.current && bg.current.srcObject !== p.stream) bg.current.srcObject = p.stream; }, [p.stream, p.contain]);
  const showPlaceholder = !p.stream || p.camOff;
  const media = (
    <div className="relative h-full w-full overflow-hidden bg-blush">
      {p.contain && (
        <video ref={bg} autoPlay playsInline muted aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-80 blur-2xl"
          style={{ transform: p.mirror ? "scaleX(-1) scale(1.25)" : undefined }} />
      )}
      <video ref={setRef} autoPlay playsInline muted={p.muted} className={`relative h-full w-full ${p.contain ? "object-contain" : "object-cover"}`}
        style={{ filter: FILTER_CSS[p.filter] || undefined, transform: p.mirror ? "scaleX(-1)" : undefined }} />
      {showPlaceholder && (
        <div className="absolute inset-0 grid place-items-center bg-blush px-2 pb-10 text-center">
          <div>
            <div className="font-hand text-5xl text-rose sm:text-6xl">{p.label.slice(0, 1) || "♡"}</div>
            <p className="font-hand text-lg leading-tight">{p.camOff ? "camera is off" : p.waitingText ?? "waiting…"}</p>
          </div>
        </div>
      )}
    </div>
  );
  const chip = (
    <span className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-paper/90 px-4 py-0.5 font-hand text-xl text-ink shadow-soft">
      {p.label}
    </span>
  );

  if (p.frame === "circle" || p.frame === "heart") {
    const clip = p.frame === "circle" ? "circle(closest-side)" : "url(#heart-clip)";
    return (
      <div className="relative h-full w-full">
        <div className="absolute inset-0" style={{ clipPath: clip, background: p.color }}>
          <div className="absolute inset-[7px]" style={{ clipPath: clip }}>{media}</div>
        </div>
        {chip}
      </div>
    );
  }
  if (p.frame === "polaroid") {
    return (
      <div className="relative h-full w-full rounded-md p-3 pb-14 shadow-soft" style={{ background: p.color }}>
        <div className="h-full w-full">{media}</div>
        <span className="absolute inset-x-0 bottom-3 text-center font-hand text-2xl text-ink">{p.label}</span>
      </div>
    );
  }
  const shape = p.frame === "arch" ? "rounded-t-full rounded-b-[2rem]" : "rounded-[2rem]";
  return (
    <div className={`relative h-full w-full overflow-hidden border-[7px] shadow-soft ${shape}`} style={{ borderColor: p.color }}>
      {media}{chip}
    </div>
  );
}
