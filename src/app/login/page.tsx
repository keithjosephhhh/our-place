"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Scenery } from "@/components/Scenery";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "invite">("in");
  const [uid, setUid] = useState(""); const [password, setPassword] = useState("");
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null);
    const sb = supabase();
    // Your own ID is turned into a private internal address, so there's no real email to remember or leak.
    const id = uid.trim().toLowerCase();
    const email = `${id}@ourplace.app`;
    try {
      if (!/^[a-z0-9_.-]{3,24}$/.test(id)) throw new Error("Your ID is 3–24 letters, numbers, dots, dashes or underscores.");
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await sb.auth.signUp({ email, password });
        if (error) throw error;
        const { error: e2 } = await sb.rpc("redeem_invite", {
          invite_code: code, name, tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        if (e2) throw e2;
      }
      router.replace("/");
    } catch (e: any) { setErr(e.message ?? "Something went wrong"); }
    finally { setBusy(false); }
  };

  const field = "w-full rounded-2xl bg-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-rose";
  return (
    <main className="relative grid min-h-screen place-items-center px-4">
      <Scenery className="absolute inset-x-0 bottom-0 -z-10 h-2/3 w-full" />
      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-[2rem] bg-paper/90 p-8 shadow-soft">
        <h1 className="text-center font-serif text-3xl">A little place for us. 🧸</h1>
        <p className="text-center font-hand text-xl">{mode === "in" ? "Welcome home, sign in with your ID" : "Pick your own ID and password"}</p>
        {mode === "invite" && <>
          <input className={field} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
          <input className={field} placeholder="Invite code" value={code} onChange={e => setCode(e.target.value)} required />
        </>}
        <input className={field} placeholder="Your ID (e.g. keith)" autoComplete="username" autoCapitalize="none" value={uid} onChange={e => setUid(e.target.value)} required />
        <input className={field} type="password" placeholder="Password (8+ characters)" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={8} value={password} onChange={e => setPassword(e.target.value)} required />
        {err && <p className="text-base text-red-800">{err}</p>}
        <button disabled={busy} className="w-full rounded-full bg-rose py-3 text-white shadow-soft disabled:opacity-60">
          {busy ? "…" : mode === "in" ? "Come in" : "Join"}
        </button>
        <button type="button" onClick={() => setMode(mode === "in" ? "invite" : "in")} className="block w-full text-center text-sm underline">
          {mode === "in" ? "I have an invite code" : "Back to sign in"}
        </button>
      </form>
    </main>
  );
}
