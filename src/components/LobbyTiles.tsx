"use client";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { useSpace } from "./SpaceProvider";
import { VideoFrame } from "./VideoFrame";

/**
 * "Us first": two big rectangular camera tiles, yours and hers. Before a call, yours can show a preview
 * (the camera only turns on when you ask). Once a call starts, the side cameras take over, so this hides.
 */
export function LobbyTiles({ className = "" }: { className?: string }) {
  const { me, partner, peer, call } = useSpace();
  const [preview, setPreview] = useState<MediaStream | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const inCall = call.state !== "idle";

  useEffect(() => { if (inCall) setPreview(p => { p?.getTracks().forEach(t => t.stop()); return null; }); }, [inCall]);
  useEffect(() => () => preview?.getTracks().forEach(t => t.stop()), [preview]);

  const toggle = async () => {
    if (preview) { setPreview(null); return; }
    try { setPreview(await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false })); setErr(null); }
    catch { setErr("Allow camera access in the address bar to preview."); }
  };
  if (inCall) return null;
  const color = "rgb(var(--c-blush))";
  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="aspect-[3/4] sm:aspect-[4/3]">
          <VideoFrame stream={preview} label={me.name} frame="round" color={color} filter="none" mirror camOff={!preview} waitingText="camera is off" />
        </div>
        <div className="aspect-[3/4] sm:aspect-[4/3]">
          <VideoFrame stream={null} label={partner?.name ?? "…"} frame="round" color={color} filter="none"
            waitingText={peer ? "is here, start a call" : "isn't online yet"} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
        <button onClick={toggle} className="flex items-center gap-1.5 rounded-full bg-blush px-4 py-1"><Camera size={15} />{preview ? "Turn preview off" : "Preview my camera"}</button>
        {err && <span className="text-red-700">{err}</span>}
      </div>
    </div>
  );
}
