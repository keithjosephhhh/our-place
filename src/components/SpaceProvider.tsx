"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSpaceChannel, type Peer } from "@/lib/useSpaceChannel";
import { useCall } from "@/lib/useCall";

export interface Track { id: string; title: string; artist: string | null; audio_path: string; playlist: string; url?: string }
interface MusicState { trackId: string | null; playing: boolean; position: number; sentAt: number }

interface Ctx {
  spaceId: string;
  me: Peer;
  partner: { userId: string; name: string; timezone: string } | null;
  peer: Peer | null; // partner if currently online
  channel: ReturnType<typeof useSpaceChannel>;
  call: ReturnType<typeof useCall>;
  tracks: Track[];
  music: MusicState & { track: Track | null; volume: number; duration: number };
  musicApi: {
    play(id?: string): void; pause(): void; seek(t: number): void; next(): void;
    setVolume(v: number): void; reload(): Promise<void>; uploadTrack(f: File, title: string, artist: string): Promise<void>;
  };
}
const SpaceCtx = createContext<Ctx | null>(null);
export const useSpace = () => {
  const c = useContext(SpaceCtx);
  if (!c) throw new Error("useSpace outside provider");
  return c;
};

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [boot, setBoot] = useState<{ spaceId: string; me: Peer; partner: Ctx["partner"] } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    // Preview mode (NEXT_PUBLIC_PREVIEW=1): skips login so the front end can be inspected without a backend.
    // Nothing is synced or saved in this mode; a banner says so.
    if (process.env.NEXT_PUBLIC_PREVIEW === "1") {
      setBoot({
        spaceId: "preview",
        me: { userId: "a-keith", name: "Keith" },
        partner: { userId: "b-molly", name: "Molly", timezone: "Europe/London" },
      });
      return;
    }
    (async () => {
      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data: mem, error } = await sb.from("members").select("space_id,display_name,timezone").eq("user_id", user.id).maybeSingle();
      if (error || !mem) { setLoadErr(error?.message ?? "No space found for this account. Ask for an invite code."); return; }
      const { data: others } = await sb.from("members").select("user_id,display_name,timezone").eq("space_id", mem.space_id).neq("user_id", user.id);
      const o = others?.[0];
      setBoot({
        spaceId: mem.space_id,
        me: { userId: user.id, name: mem.display_name },
        partner: o ? { userId: o.user_id, name: o.display_name, timezone: o.timezone } : null,
      });
    })();
  }, [router]);

  if (loadErr) return <p className="p-10 text-center text-ink">{loadErr}</p>;
  if (!boot) return <p className="p-10 text-center font-hand text-2xl text-ink">Opening our little place…</p>;
  return <Inner boot={boot}>{children}</Inner>;
}

function Inner({ boot, children }: { boot: NonNullable<ReturnType<typeof useState<{ spaceId: string; me: Peer; partner: Ctx["partner"] }>>[0]>; children: React.ReactNode }) {
  const { spaceId, me, partner } = boot;
  const channel = useSpaceChannel(spaceId, me);
  const peer = channel.peers.find(p => p.userId === partner?.userId) ?? null;
  const call = useCall(me.userId, partner?.userId ?? null, channel.send, channel.on);

  // ---- music ----
  const audio = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [ms, setMs] = useState<MusicState>({ trackId: null, playing: false, position: 0, sentAt: Date.now() });
  const [volume, setVol] = useState(0.35); // gentle default

  const reload = useCallback(async () => {
    const sb = supabase();
    const { data } = await sb.from("tracks").select("id,title,artist,audio_path,playlist").eq("space_id", spaceId).order("created_at");
    if (!data) return;
    const paths = data.map(t => t.audio_path);
    const { data: signed } = paths.length ? await sb.storage.from("media").createSignedUrls(paths, 60 * 60 * 6) : { data: [] };
    setTracks(data.map((t, i) => ({ ...t, url: signed?.[i]?.signedUrl })));
  }, [spaceId]);
  useEffect(() => { reload(); }, [reload]);

  const [duration, setDuration] = useState(0);
  const endedRef = useRef<() => void>(() => {});
  useEffect(() => {
    const a = new Audio(); a.preload = "auto"; audio.current = a;
    a.onloadedmetadata = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    a.onended = () => endedRef.current();
    return () => { a.pause(); audio.current = null; };
  }, []);
  useEffect(() => { if (audio.current) audio.current.volume = volume; }, [volume]);

  const applyMusic = useCallback((s: MusicState) => {
    const a = audio.current; if (!a) return;
    const t = tracks.find(x => x.id === s.trackId);
    if (!t?.url) { a.pause(); return; }
    if (!a.src.includes(encodeURI(t.url).split("?")[0])) a.src = t.url;
    const target = s.position + (s.playing ? (Date.now() - s.sentAt) / 1000 : 0);
    if (Math.abs(a.currentTime - target) > 0.8) a.currentTime = target; // tolerate small drift
    if (s.playing) a.play().catch(() => { /* autoplay blocked until user gesture */ }); else a.pause();
  }, [tracks]);

  const publish = useCallback((patch: Partial<MusicState>) => {
    const a = audio.current;
    const next: MusicState = {
      trackId: ms.trackId, playing: ms.playing, position: a?.currentTime ?? 0, sentAt: Date.now(), ...patch,
    };
    setMs(next); applyMusic(next); channel.send("music-state", next);
  }, [ms, applyMusic, channel]);

  useEffect(() => channel.on("music-state", (s: MusicState) => { setMs(s); applyMusic(s); }), [channel, applyMusic]);
  // Late joiner asks the current state; whoever is playing answers.
  useEffect(() => channel.on("music-req", () => publish({})), [channel, publish]);
  useEffect(() => { if (peer) channel.send("music-req", {}); }, [peer?.userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const musicApi: Ctx["musicApi"] = useMemo(() => ({
    play: id => publish({ trackId: id ?? ms.trackId ?? tracks[0]?.id ?? null, playing: true, position: id && id !== ms.trackId ? 0 : audio.current?.currentTime ?? 0 }),
    pause: () => publish({ playing: false }),
    seek: t => publish({ position: t }),
    next: () => {
      if (!tracks.length) return;
      const i = tracks.findIndex(t => t.id === ms.trackId);
      publish({ trackId: tracks[(i + 1) % tracks.length].id, position: 0, playing: true });
    },
    setVolume: v => setVol(v), // volume is per-listener on purpose
    reload,
    uploadTrack: async (file, title, artist) => {
      const sb = supabase();
      const path = `${spaceId}/music/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const up = await sb.storage.from("media").upload(path, file, { contentType: file.type || "audio/mpeg" });
      if (up.error) throw up.error;
      const ins = await sb.from("tracks").insert({ space_id: spaceId, title, artist, audio_path: path, added_by: me.userId });
      if (ins.error) throw ins.error;
      await reload();
    },
  }), [publish, ms.trackId, tracks, reload, spaceId, me.userId]);

  // When a song ends, only one side (lower user id) advances the shared queue, so we don't double-skip.
  const leads = !partner || me.userId < partner.userId;
  endedRef.current = () => { if (leads) musicApi.next(); };

  const value: Ctx = {
    spaceId, me, partner, peer, channel, call, tracks,
    music: { ...ms, track: tracks.find(t => t.id === ms.trackId) ?? null, volume, duration },
    musicApi,
  };
  return <SpaceCtx.Provider value={value}>{children}</SpaceCtx.Provider>;
}
