"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Heart, Shuffle, Music2, Star } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSpace } from "@/components/SpaceProvider";
import { GameRoom } from "@/components/GameRoom";
import { Scenery } from "@/components/Scenery";
import { getGame } from "@/lib/games/registry";
import { ACTIVITIES, THEMES, pickActivity, type Activity, type Theme } from "@/lib/dateNight";

interface Session { id: string; theme: Theme | null; activity: Activity | null; history: string[]; startedAt: number }
interface Past { id: string; theme: string | null; started_at: string; favourite_activity: string | null; activities: string[] }

export default function DateNight() {
  const { spaceId, me, partner, peer, channel, call, tracks, music, musicApi } = useSpace();
  const [session, setSession] = useState<Session | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [readyMe, setReadyMe] = useState(false);
  const [peerReady, setPeerReady] = useState(false);
  const [ending, setEnding] = useState(false);
  const [best, setBest] = useState("");
  const [past, setPast] = useState<Past[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [invited, setInvited] = useState<{ theme: Theme | null; id?: string; activities?: string[] } | null>(null);
  const musicStarted = useRef(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNowMs(Date.now()), 1000); return () => clearInterval(i); }, []);
  const iLead = !!partner && me.userId < partner.userId; // deterministic: lower id leads shared choices

  // history + recent activities (so we don't repeat)
  const loadHistory = useCallback(async () => {
    const sb = supabase();
    const { data } = await sb.from("date_nights").select("id,theme,started_at,favourite_activity,activities").eq("space_id", spaceId).not("ended_at", "is", null).order("started_at", { ascending: false }).limit(8);
    setPast((data as Past[]) ?? []);
    setRecent(((data as Past[]) ?? []).slice(0, 3).flatMap(d => d.activities ?? []));
  }, [spaceId]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Persistent invitation: if my partner started a date night in the last 3 hours and it isn't over,
  // show it even though I wasn't online when they pressed the button.
  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 3 * 3600_000).toISOString();
      const { data } = await supabase().from("date_nights").select("id,theme,activities,started_by")
        .eq("space_id", spaceId).is("ended_at", null).neq("started_by", me.userId)
        .gte("started_at", since).order("started_at", { ascending: false }).limit(1);
      const row = data?.[0];
      if (row) setInvited(cur => cur ?? { theme: row.theme, id: row.id, activities: row.activities });
    })();
  }, [spaceId, me.userId]);

  // channel events
  useEffect(() => {
    const offs = [
      channel.on("date-invite", p => setInvited({ theme: p.theme })),
      channel.on("date-state", (s: Session) => { setSession(s); setInvited(null); }),
      channel.on("date-end", () => setEnding(true)),
      channel.on("date-ready", p => {
        setPeerReady(true);
        if (readyMe && p.reply) channel.send("date-ready", { reply: false });
      }),
      channel.on("date-sync-req", () => session && channel.send("date-state", session)),
    ];
    channel.send("date-sync-req", {});
    return () => offs.forEach(o => o());
  }, [channel, readyMe, session]);
  useEffect(() => { if (!peer) setPeerReady(false); }, [peer]);

  // Music starts only once BOTH sides have pressed ready (which also unlocks audio autoplay).
  useEffect(() => {
    if (!session || !readyMe || !peerReady || musicStarted.current || !iLead) return;
    if (!tracks.length || music.playing) return;
    musicStarted.current = true;
    musicApi.setVolume(0.3);
    musicApi.play(tracks[Math.floor(Math.random() * tracks.length)].id);
  }, [session, readyMe, peerReady, iLead, tracks, music.playing, musicApi]);

  const broadcast = (s: Session) => { setSession(s); channel.send("date-state", s); };

  const begin = async () => {
    setErr(null);
    await call.start(false); // permission asked only now; failure is shown, not forced
    const first = pickActivity(theme, recent);
    const s: Session = { id: crypto.randomUUID(), theme, activity: first, history: [first.id], startedAt: Date.now() };
    broadcast(s);
    setReadyMe(true);
    channel.send("date-ready", { reply: true });
    if (!peer) channel.send("date-invite", { theme }); // reaches them if they open the site later while this channel is live
    const { error } = await supabase().from("date_nights").insert({ id: s.id, space_id: spaceId, theme, activities: s.history });
    if (error) setErr(error.message);
  };

  const join = async () => {
    // Joining from a stored invitation while the starter is offline: rebuild the session from the saved row.
    if (!session && invited?.id) {
      const acts = invited.activities ?? [];
      setSession({ id: invited.id, theme: invited.theme, activity: ACTIVITIES.find(a => a.id === acts[acts.length - 1]) ?? null, history: acts, startedAt: Date.now() });
    }
    setInvited(null);
    await call.start(false);
    setReadyMe(true);
    channel.send("date-ready", { reply: true });
  };

  const change = () => {
    if (!session) return;
    const a = pickActivity(session.theme, [...recent, ...session.history]);
    broadcast({ ...session, activity: a, history: [...session.history, a.id] });
  };

  const anotherSong = () => {
    if (!tracks.length) return;
    const others = tracks.filter(t => t.id !== music.trackId);
    musicApi.play((others.length ? others : tracks)[Math.floor(Math.random() * others.length || 0)].id);
  };

  const finish = async () => {
    if (!session) return;
    const sb = supabase();
    const { data } = await sb.from("date_nights").select("best_part").eq("id", session.id).maybeSingle();
    const bp = { ...(data?.best_part ?? {}), [me.userId]: best };
    await sb.from("date_nights").update({ best_part: bp, ended_at: new Date().toISOString() }).eq("id", session.id);
    setSession(null); setEnding(false); setBest(""); setReadyMe(false); setPeerReady(false); musicStarted.current = false;
    musicApi.pause(); call.hangUp(); loadHistory();
  };

  const favourite = async (id: string, activityId: string) => {
    await supabase().from("date_nights").update({ favourite_activity: activityId }).eq("id", id);
    loadHistory();
  };

  const title = (id: string) => ACTIVITIES.find(a => a.id === id)?.title ?? id;
  const game = session?.activity?.gameId ? getGame(session.activity.gameId) : null;

  // ---------- landing ----------
  if (!session) {
    return (
      <main className="relative min-h-[80vh] px-6 py-12 text-center">
        <Scenery className="absolute inset-0 -z-10 h-full w-full opacity-80" />
        <Link href="/" className="text-sm underline">← home</Link>
        <h1 className="mt-6 font-serif text-4xl">Our time together</h1>
        <p className="mt-2 font-hand text-2xl">Nothing to plan. Just press the button.</p>

        {invited && (
          <div className="mx-auto mt-6 max-w-sm rounded-3xl bg-blush p-4">
            <p className="font-hand text-2xl">{partner?.name} is waiting for you{invited.theme ? ` · ${invited.theme}` : ""}</p>
            <button onClick={join} className="mt-2 rounded-full bg-rose px-6 py-2 text-white">Join date night</button>
          </div>
        )}

        <div className="mx-auto mt-8 flex max-w-md flex-wrap justify-center gap-2">
          {THEMES.map(t => (
            <button key={t} onClick={() => setTheme(theme === t ? null : t)}
              className={`rounded-full px-4 py-1 text-sm ${theme === t ? "bg-rose text-white" : "bg-white/70"}`}>{t}</button>
          ))}
        </div>

        <button onClick={begin} className="mt-8 rounded-full bg-rose px-10 py-4 font-serif text-2xl text-white shadow-soft transition hover:scale-105">
          Start our date night
        </button>
        {!peer && partner && <p className="mt-3 text-sm">{partner.name} isn&apos;t online yet — we&apos;ll let them know the moment they arrive.</p>}
        {!tracks.length && <p className="mt-2 text-sm">No songs uploaded yet, so it&apos;ll be a quiet one. Upload MP3s with the button in the bottom bar.</p>}
        {(err || call.error) && <p className="mx-auto mt-3 max-w-sm text-sm text-red-700">{err ?? call.error}</p>}
        {call.error && <button onClick={() => call.start(true)} className="mt-2 text-sm underline">Join audio-only instead</button>}

        {past.length > 0 && (
          <section className="mx-auto mt-12 max-w-4xl text-left">
            <h2 className="font-serif text-2xl">Past date nights</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {past.map(d => (
                <li key={d.id} className="flex items-center justify-between rounded-2xl bg-white/60 px-4 py-2 text-sm">
                  <span>{new Date(d.started_at).toLocaleDateString()} · {d.theme ?? "Any mood"} · {(d.activities ?? []).map(title).join(", ")}</span>
                  <button aria-label="Favourite" onClick={() => favourite(d.id, d.activities?.[d.activities.length - 1])}>
                    <Star size={16} className={d.favourite_activity ? "fill-rose text-rose" : ""} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    );
  }

  // ---------- session ----------
  return (
    <main className="relative min-h-[85vh] px-4 py-6">
      <Scenery className="absolute inset-0 -z-10 h-full w-full opacity-70" />
      <header className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-3 font-hand text-2xl">
          {me.name} <Heart className="animate-beat fill-rose text-rose" size={20} /> {partner?.name}
        </div>
        <button onClick={() => { channel.send("date-end", {}); setEnding(true); }} className="rounded-full bg-white/80 px-4 py-1 text-sm">End date night</button>
      </header>
      <p className="mt-1 text-center text-sm">
        {session.theme ?? "Tonight"} · {peer ? (readyMe && peerReady ? "Together" : "Getting ready…") : `Waiting for ${partner?.name ?? "your partner"}…`}
      </p>
      {!readyMe && <div className="mt-3 text-center"><button onClick={join} className="rounded-full bg-rose px-6 py-2 text-white">I&apos;m ready</button></div>}

      <div className="mx-auto mt-6 max-w-5xl">
        {game ? (
          <GameRoom key={`${session.id}:${game.id}:${session.history.length}`} game={game} onLeave={change} />
        ) : session.activity && (
          <section className="mx-auto max-w-3xl rounded-[2rem] bg-white/80 p-10 text-center shadow-soft">
            <h2 className="font-serif text-4xl">{session.activity.title}</h2>
            <p className="mt-4 font-hand text-3xl leading-snug">{session.activity.body}</p>
            <ActivityTimer />
          </section>
        )}
      </div>

      <div className="mx-auto mt-6 flex max-w-5xl flex-wrap justify-center gap-3">
        <button onClick={change} className="flex items-center gap-2 rounded-full bg-powder px-6 py-2.5 text-lg"><Shuffle size={18} /> Surprise me</button>
        <button onClick={anotherSong} disabled={!tracks.length} className="flex items-center gap-2 rounded-full bg-sage px-6 py-2.5 text-lg disabled:opacity-40"><Music2 size={18} /> Another song</button>
      </div>
      {music.track && <p className="mt-3 text-center text-base">🎵 Now playing: {music.track.title}</p>}
      <section className="mx-auto mt-8 grid max-w-5xl gap-4 @3xl:grid-cols-3">
        <div className="rounded-[2rem] bg-blush/80 p-6 text-center shadow-soft">
          <p className="text-sm uppercase tracking-widest">Tonight&apos;s mood</p>
          <p className="mt-2 font-serif text-3xl">{session.theme ?? "Whatever we feel like"}</p>
          <p className="mt-1 text-base">{peer ? `${partner?.name} is here with you 💗` : `Waiting for ${partner?.name ?? "your partner"}…`}</p>
        </div>
        <div className="rounded-[2rem] bg-powder/80 p-6 text-center shadow-soft">
          <p className="text-sm uppercase tracking-widest">Now playing</p>
          <p className="mt-2 font-serif text-2xl">{music.track?.title ?? (tracks.length ? "Nothing yet" : "No songs uploaded")}</p>
          <div className="mt-3 flex justify-center gap-2">
            <button onClick={() => (music.playing ? musicApi.pause() : musicApi.play())} disabled={!tracks.length} className="rounded-full bg-white/80 px-4 py-1.5 text-base disabled:opacity-50">{music.playing ? "Pause" : "Play"}</button>
            <button onClick={musicApi.next} disabled={!tracks.length} className="rounded-full bg-white/80 px-4 py-1.5 text-base disabled:opacity-50">Next</button>
          </div>
        </div>
        <div className="rounded-[2rem] bg-sage/80 p-6 text-center shadow-soft">
          <p className="text-sm uppercase tracking-widest">Together for</p>
          <p className="mt-2 font-serif text-5xl">{Math.floor((nowMs - session.startedAt) / 60000)}<span className="text-2xl"> min</span></p>
          <p className="mt-1 text-base">{session.history.length} {session.history.length === 1 ? "activity" : "activities"} tonight</p>
        </div>
      </section>
      <p className="mx-auto mt-2 max-w-3xl text-center text-base">Tonight so far: {session.history.map(title).join("  →  ")}</p>

      {ending && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/30 p-4">
          <div className="w-full max-w-sm rounded-[2rem] bg-paper p-6 text-center shadow-soft">
            <h3 className="font-serif text-2xl">What was your favourite part of tonight?</h3>
            <textarea value={best} onChange={e => setBest(e.target.value)} rows={3} className="mt-3 w-full rounded-2xl bg-white p-3 outline-none" />
            <button onClick={finish} className="mt-3 rounded-full bg-rose px-6 py-2 text-white">Save and say goodnight</button>
          </div>
        </div>
      )}
    </main>
  );
}

/** Local countdown for prompt activities (e.g. "draw each other in 60 seconds"). Each person starts their own. */
function ActivityTimer() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = setTimeout(() => setLeft(l => (l === null ? null : l - 1)), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const fmt = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
      {left !== null && <span className="font-serif text-5xl">{left > 0 ? fmt(left) : "Time's up 💗"}</span>}
      {[60, 180, 300].map(n => (
        <button key={n} onClick={() => setLeft(n)} className="rounded-full bg-blush px-5 py-2 text-base">{n / 60} min timer</button>
      ))}
    </div>
  );
}
