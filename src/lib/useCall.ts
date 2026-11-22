"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Send = (event: string, payload: unknown) => void;
type On = (event: string, h: (p: any) => void) => () => void;

// STUN finds a direct path; TURN relays the video when the two of you are on strict networks (mobile data, offices, some home routers).
// Set NEXT_PUBLIC_TURN_* to use your own TURN account. Without it, a shared free relay is used as a fallback.
const ownTurn = process.env.NEXT_PUBLIC_TURN_URL;
const iceServers: RTCIceServer[] = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ownTurn
    ? { urls: ownTurn.split(","), username: process.env.NEXT_PUBLIC_TURN_USERNAME, credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL }
    : { urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:443?transport=tcp"], username: "openrelayproject", credential: "openrelayproject" },
];

export type CallState = "idle" | "requesting-media" | "waiting" | "connecting" | "connected" | "failed";

/**
 * 1:1 WebRTC call. Signalling rides on the space channel. Perfect-negotiation pattern:
 * the member with the lexicographically smaller id is the "polite" peer.
 * Screen sharing adds a second MediaStream (video + optional tab/system audio) to the same
 * connection; "screen-start"/"screen-stop" messages tell the other side which stream is the screen.
 * Lives in a provider-level component so it survives route changes.
 */
export function useCall(myId: string | null, peerId: string | null, send: Send, on: On) {
  const pc = useRef<RTCPeerConnection | null>(null);
  const makingOffer = useRef(false);
  const pendingIce = useRef<RTCIceCandidateInit[]>([]);
  const [localStream, setLocal] = useState<MediaStream | null>(null);
  const [remoteStream, setRemote] = useState<MediaStream | null>(null);
  const [localScreen, setLocalScreen] = useState<MediaStream | null>(null);
  const [remoteScreen, setRemoteScreen] = useState<MediaStream | null>(null);
  const [state, setState] = useState<CallState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMic] = useState(true);
  const [camOn, setCam] = useState(true);
  const localRef = useRef<MediaStream | null>(null);
  const localScreenRef = useRef<MediaStream | null>(null);
  const screenSenders = useRef<RTCRtpSender[]>([]);
  const remoteStreams = useRef(new Map<string, MediaStream>());
  const remoteScreenId = useRef<string | null>(null);

  const polite = !!myId && !!peerId && myId < peerId;
  const canShare = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia;

  // Remote streams arrive in order: camera first, screen second. The screen is identified by id.
  const syncRemote = useCallback(() => {
    const cam = [...remoteStreams.current.values()].find(s => s.id !== remoteScreenId.current) ?? null;
    setRemote(cam);
    setRemoteScreen(remoteScreenId.current ? remoteStreams.current.get(remoteScreenId.current) ?? null : null);
  }, []);

  const stopShare = useCallback(() => {
    const st = localScreenRef.current; if (!st) return;
    st.getTracks().forEach(t => t.stop());
    screenSenders.current.forEach(s => { try { pc.current?.removeTrack(s); } catch { /* connection closed */ } });
    screenSenders.current = []; localScreenRef.current = null; setLocalScreen(null);
    send("screen-stop", {});
  }, [send]);

  const teardown = useCallback(() => {
    localScreenRef.current?.getTracks().forEach(t => t.stop());
    localScreenRef.current = null; screenSenders.current = [];
    pc.current?.close(); pc.current = null; pendingIce.current = [];
    localRef.current?.getTracks().forEach(t => t.stop()); localRef.current = null;
    remoteStreams.current.clear(); remoteScreenId.current = null;
    setLocal(null); setRemote(null); setLocalScreen(null); setRemoteScreen(null); setState("idle");
  }, []);

  const build = useCallback((stream: MediaStream) => {
    const conn = new RTCPeerConnection({ iceServers });
    stream.getTracks().forEach(t => conn.addTrack(t, stream));
    conn.ontrack = e => {
      const st = e.streams[0]; if (!st) return;
      remoteStreams.current.set(st.id, st); syncRemote();
    };
    conn.onicecandidate = e => e.candidate && send("rtc-ice", { to: peerId, c: e.candidate.toJSON() });
    conn.onnegotiationneeded = async () => {
      try {
        makingOffer.current = true;
        await conn.setLocalDescription();
        send("rtc-desc", { to: peerId, d: conn.localDescription });
      } finally { makingOffer.current = false; }
    };
    conn.onconnectionstatechange = () => {
      const s = conn.connectionState;
      if (s === "connected") setState("connected");
      else if (s === "connecting") setState("connecting");
      else if (s === "failed") { conn.restartIce(); setState("failed"); setError("Couldn't connect directly. Retrying through a relay… if this stays, hang up and join again."); }
    };
    conn.oniceconnectionstatechange = () => { if (conn.iceConnectionState === "failed") conn.restartIce(); };
    pc.current = conn;
    return conn;
  }, [peerId, send, syncRemote]);

  /** audioOnly skips the camera entirely. Permission is only requested on an explicit click. */
  const start = useCallback(async (audioOnly = false) => {
    setError(null); setState("requesting-media");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: !audioOnly });
      localRef.current = stream; setLocal(stream); setCam(!audioOnly); setMic(true);
      build(stream);
      setState("waiting");
      send("rtc-join", { from: myId });
    } catch (e: any) {
      setState("idle");
      setError(e?.name === "NotAllowedError"
        ? "Camera or microphone permission was denied. You can allow it in your browser settings, or join audio-only."
        : "Couldn't open your camera or microphone.");
    }
  }, [build, myId, send]);

  /** Share a screen or browser tab (for movies, YouTube...). Tab audio is included when the user ticks "share audio". */
  const shareScreen = useCallback(async () => {
    if (!pc.current) { setError("Start the call first."); return; }
    if (!canShare) { setError("Screen sharing isn't available on this device. Try a computer browser (Chrome or Edge work best)."); return; }
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: true });
      localScreenRef.current = stream; setLocalScreen(stream);
      const v = stream.getVideoTracks()[0];
      if (v && "contentHint" in v) (v as MediaStreamTrack & { contentHint: string }).contentHint = "motion"; // favour smooth video
      screenSenders.current = stream.getTracks().map(t => pc.current!.addTrack(t, stream));
      send("screen-start", { id: stream.id });
      v?.addEventListener("ended", () => stopShare()); // browser's own "Stop sharing" button
      setTimeout(() => { // allow a higher bitrate for movies once negotiated
        const s = screenSenders.current.find(x => x.track?.kind === "video"); if (!s) return;
        const p = s.getParameters(); if (!p.encodings?.length) p.encodings = [{}];
        p.encodings[0].maxBitrate = 3_000_000;
        s.setParameters(p).catch(() => { /* not critical */ });
      }, 1500);
    } catch (e: any) {
      if (e?.name !== "NotAllowedError") setError("Couldn't start screen sharing.");
    }
  }, [canShare, send, stopShare]);

  useEffect(() => {
    const offs = [
      on("rtc-join", async () => {
        // Peer joined after us: renegotiate so they get our offer.
        if (pc.current && localRef.current) pc.current.dispatchEvent(new Event("negotiationneeded"));
      }),
      on("rtc-desc", async ({ to, d }) => {
        if (to !== myId || !pc.current) return;
        const conn = pc.current;
        const collision = d.type === "offer" && (makingOffer.current || conn.signalingState !== "stable");
        if (collision && !polite) return; // impolite peer ignores colliding offer
        await conn.setRemoteDescription(d);
        for (const c of pendingIce.current.splice(0)) { try { await conn.addIceCandidate(c); } catch { /* stale */ } }
        if (d.type === "offer") {
          await conn.setLocalDescription();
          send("rtc-desc", { to: peerId, d: conn.localDescription });
        }
      }),
      on("rtc-ice", async ({ to, c }) => {
        if (to !== myId) return;
        const conn = pc.current;
        // Candidates can arrive before the description they belong to: keep them until it is set.
        if (!conn || !conn.remoteDescription) { pendingIce.current.push(c); return; }
        try { await conn.addIceCandidate(c); } catch { /* ignore stale candidates */ }
      }),
      on("rtc-leave", () => {
        remoteStreams.current.clear(); remoteScreenId.current = null;
        setRemote(null); setRemoteScreen(null); setState(localRef.current ? "waiting" : "idle");
      }),
      on("screen-start", ({ id }) => { remoteScreenId.current = String(id); syncRemote(); }),
      on("screen-stop", () => {
        if (remoteScreenId.current) remoteStreams.current.delete(remoteScreenId.current);
        remoteScreenId.current = null; syncRemote();
      }),
    ];
    return () => offs.forEach(o => o());
  }, [on, myId, peerId, polite, send, syncRemote]);

  const hangUp = useCallback(() => { send("rtc-leave", {}); teardown(); }, [send, teardown]);
  useEffect(() => teardown, [teardown]);

  const toggleMic = () => {
    const t = localRef.current?.getAudioTracks()[0]; if (!t) return;
    t.enabled = !t.enabled; setMic(t.enabled);
  };
  const toggleCam = () => {
    const t = localRef.current?.getVideoTracks()[0]; if (!t) return;
    t.enabled = !t.enabled; setCam(t.enabled);
  };

  return {
    localStream, remoteStream, localScreen, remoteScreen, canShare,
    state, error, micOn, camOn, start, hangUp, toggleMic, toggleCam, shareScreen, stopShare,
  };
}
