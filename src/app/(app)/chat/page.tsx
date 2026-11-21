"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCheck, ImageIcon, Mic, Pin, Reply, Search, Send, Square, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSpace } from "@/components/SpaceProvider";

interface Msg {
  id: string; sender: string; body: string | null; image_path: string | null; voice_path: string | null;
  reply_to: string | null; pinned: boolean; reactions: Record<string, string[]>; read_at: string | null; created_at: string;
}
const EMOJI = ["❤️", "😂", "🥺", "👍", "🙏", "🔥"];

function Attachment({ path, kind }: { path: string; kind: "image" | "voice" }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    supabase().storage.from("media").createSignedUrl(path, 3600).then(r => { if (live) setUrl(r.data?.signedUrl ?? null); });
    return () => { live = false; };
  }, [path]);
  if (!url) return <span className="text-sm opacity-90">loading…</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return kind === "image" ? <img src={url} alt="shared" className="max-h-64 rounded-2xl" /> : <audio controls src={url} className="max-w-full" />;
}

export default function Chat() {
  const { spaceId, me, partner, channel } = useSpace();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const lastTyping = useRef(0);
  const marked = useRef<Set<string>>(new Set());
  const rec = useRef<{ r: MediaRecorder; chunks: Blob[] } | null>(null);

  const upsert = useCallback((m: Msg) => setMsgs(cur => {
    const i = cur.findIndex(x => x.id === m.id);
    if (i >= 0) { const n = [...cur]; n[i] = m; return n; }
    return [...cur, m].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }), []);

  // initial load + realtime
  useEffect(() => {
    const sb = supabase();
    (async () => {
      const { data, error } = await sb.from("messages").select("*").eq("space_id", spaceId).order("created_at", { ascending: false }).limit(200);
      if (error) setErr(error.message); else setMsgs((data as Msg[]).reverse());
      setLoading(false);
    })();
    const ch = sb.channel(`chat:${spaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `space_id=eq.${spaceId}` }, p => {
        if (p.eventType === "DELETE") setMsgs(cur => cur.filter(m => m.id !== (p.old as { id: string }).id));
        else upsert(p.new as Msg);
      })
      .subscribe();
    return () => { sb.removeChannel(ch); };
  }, [spaceId, upsert]);

  // typing indicator (ephemeral broadcast)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const off = channel.on("typing", () => { setTyping(true); clearTimeout(t); t = setTimeout(() => setTyping(false), 3000); });
    return () => { off(); clearTimeout(t); };
  }, [channel]);

  // read receipts
  useEffect(() => {
    const ids = msgs.filter(m => m.sender !== me.userId && !m.read_at && !marked.current.has(m.id)).map(m => m.id);
    if (!ids.length) return;
    ids.forEach(id => marked.current.add(id));
    supabase().from("messages").update({ read_at: new Date().toISOString() }).in("id", ids).then(({ error }) => {
      if (error) ids.forEach(id => marked.current.delete(id));
    });
  }, [msgs, me.userId]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, typing]);

  const insert = async (patch: Partial<Msg>) => {
    setErr(null);
    const { data, error } = await supabase().from("messages")
      .insert({ space_id: spaceId, sender: me.userId, reply_to: replyTo?.id ?? null, ...patch }).select().single();
    if (error) setErr(error.message); else { upsert(data as Msg); setReplyTo(null); }
  };

  const send = async () => {
    const body = text.trim(); if (!body) return;
    setText(""); await insert({ body });
  };

  const upload = async (file: Blob, name: string, kind: "image_path" | "voice_path") => {
    const path = `${spaceId}/chat/${crypto.randomUUID()}-${name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase().storage.from("media").upload(path, file, { contentType: file.type });
    if (error) { setErr(error.message); return; }
    await insert({ [kind]: path } as Partial<Msg>);
  };

  const toggleRecord = async () => {
    if (recording && rec.current) { rec.current.r.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream); const chunks: Blob[] = [];
      r.ondataavailable = e => e.data.size && chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); setRecording(false);
        const type = r.mimeType || "audio/webm";
        await upload(new Blob(chunks, { type }), `voice.${type.includes("mp4") ? "m4a" : "webm"}`, "voice_path");
      };
      rec.current = { r, chunks }; r.start(); setRecording(true);
    } catch { setErr("Microphone permission was denied or isn't available."); }
  };

  const react = async (m: Msg, emoji: string) => {
    const reactions = { ...(m.reactions ?? {}) };
    const set = new Set(reactions[emoji] ?? []);
    set.has(me.userId) ? set.delete(me.userId) : set.add(me.userId);
    if (set.size) reactions[emoji] = [...set]; else delete reactions[emoji];
    upsert({ ...m, reactions }); setSelected(null);
    const { error } = await supabase().from("messages").update({ reactions }).eq("id", m.id);
    if (error) { setErr(error.message); upsert(m); }
  };
  const pin = async (m: Msg) => { setSelected(null); upsert({ ...m, pinned: !m.pinned }); await supabase().from("messages").update({ pinned: !m.pinned }).eq("id", m.id); };
  const remove = async (m: Msg) => {
    setSelected(null); setMsgs(cur => cur.filter(x => x.id !== m.id));
    const sb = supabase();
    const paths = [m.image_path, m.voice_path].filter(Boolean) as string[];
    if (paths.length) await sb.storage.from("media").remove(paths);
    const { error } = await sb.from("messages").delete().eq("id", m.id);
    if (error) { setErr(error.message); upsert(m); }
  };

  const shown = useMemo(() => query ? msgs.filter(m => m.body?.toLowerCase().includes(query.toLowerCase())) : msgs, [msgs, query]);
  const pinned = msgs.filter(m => m.pinned);
  const byId = useMemo(() => new Map(msgs.map(m => [m.id, m])), [msgs]);
  const time = (s: string) => new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <main className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col px-3 py-4">
      <header className="flex items-center justify-between">
        <div><Link href="/" className="text-sm underline">← home</Link><h1 className="font-serif text-3xl">{partner?.name ?? "Our chat"}</h1></div>
        <button onClick={() => { setSearching(s => !s); setQuery(""); }} aria-label="Search" className="rounded-full bg-white/70 p-2"><Search size={18} /></button>
      </header>
      {searching && <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search messages" className="mt-2 rounded-full bg-white/80 px-4 py-2 outline-none" />}
      {pinned.length > 0 && (
        <div className="mt-2 rounded-2xl bg-sage/60 px-3 py-2 text-sm">
          <Pin size={12} className="mr-1 inline" />{pinned[pinned.length - 1].body ?? "📎 attachment"}
        </div>
      )}

      <div className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-[2rem] bg-white/50 p-3">
        {loading && <p className="text-center text-sm">Loading…</p>}
        {!loading && !shown.length && <p className="pt-10 text-center font-hand text-2xl">{query ? "Nothing found." : "Say hello 💌"}</p>}
        {shown.map(m => {
          const mine = m.sender === me.userId;
          const parent = m.reply_to ? byId.get(m.reply_to) : null;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%]">
                <button onClick={() => setSelected(selected === m.id ? null : m.id)}
                  className={`block w-full rounded-3xl px-4 py-2 text-left ${mine ? "bg-blush" : "bg-powder"}`}>
                  {parent && <span className="mb-1 block border-l-2 border-rose pl-2 text-sm opacity-90">{parent.body ?? "📎 attachment"}</span>}
                  {m.image_path && <Attachment path={m.image_path} kind="image" />}
                  {m.voice_path && <Attachment path={m.voice_path} kind="voice" />}
                  {m.body && <span className="whitespace-pre-wrap break-words">{m.body}</span>}
                  <span className="mt-1 flex items-center justify-end gap-1 text-sm opacity-90">
                    {m.pinned && <Pin size={10} />}{time(m.created_at)}
                    {mine && (m.read_at ? <CheckCheck size={12} className="text-ocean" /> : <Check size={12} />)}
                  </span>
                </button>
                {Object.keys(m.reactions ?? {}).length > 0 && (
                  <div className={`-mt-1 flex gap-1 ${mine ? "justify-end" : ""}`}>
                    {Object.entries(m.reactions).map(([e, who]) => (
                      <motion.button key={e} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}
                        onClick={() => react(m, e)} className="rounded-full bg-paper px-2 text-sm shadow-soft">{e}{who.length > 1 ? who.length : ""}</motion.button>
                    ))}
                  </div>
                )}
                <AnimatePresence>
                  {selected === m.id && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`mt-1 flex flex-wrap items-center gap-1 ${mine ? "justify-end" : ""}`}>
                      {EMOJI.map(e => <button key={e} onClick={() => react(m, e)} className="rounded-full bg-paper px-1.5 shadow-soft">{e}</button>)}
                      <button aria-label="Reply" onClick={() => { setReplyTo(m); setSelected(null); }} className="rounded-full bg-paper p-1.5"><Reply size={14} /></button>
                      <button aria-label="Pin" onClick={() => pin(m)} className="rounded-full bg-paper p-1.5"><Pin size={14} /></button>
                      {mine && <button aria-label="Delete" onClick={() => remove(m)} className="rounded-full bg-paper p-1.5"><Trash2 size={14} /></button>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
        {typing && <p className="font-hand text-lg opacity-90">{partner?.name} is typing…</p>}
        <div ref={bottom} />
      </div>

      {err && <p className="mt-1 text-sm text-red-700">{err}</p>}
      {replyTo && (
        <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/70 px-3 py-1 text-sm">
          <span className="truncate">Replying: {replyTo.body ?? "📎 attachment"}</span>
          <button aria-label="Cancel reply" onClick={() => setReplyTo(null)}><X size={14} /></button>
        </div>
      )}
      <form onSubmit={e => { e.preventDefault(); send(); }} className="mt-2 flex items-center gap-2">
        <button type="button" aria-label="Send image" onClick={() => fileIn.current?.click()} className="rounded-full bg-white/70 p-2"><ImageIcon size={18} /></button>
        <input ref={fileIn} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f, f.name, "image_path"); e.target.value = ""; }} />
        <input value={text} onChange={e => { setText(e.target.value); if (Date.now() - lastTyping.current > 2000) { lastTyping.current = Date.now(); channel.send("typing", {}); } }}
          placeholder="Write something sweet…" className="min-w-0 flex-1 rounded-full bg-white/80 px-4 py-2 outline-none" />
        <button type="button" aria-label={recording ? "Stop recording" : "Record voice message"} onClick={toggleRecord}
          className={`rounded-full p-2 ${recording ? "bg-rose text-white" : "bg-white/70"}`}>{recording ? <Square size={18} /> : <Mic size={18} />}</button>
        <button aria-label="Send" className="rounded-full bg-rose p-2 text-white"><Send size={18} /></button>
      </form>
    </main>
  );
}
