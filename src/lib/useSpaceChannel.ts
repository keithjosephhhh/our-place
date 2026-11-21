"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface Peer { userId: string; name: string; ready?: boolean }
type Handler = (payload: any) => void;

/**
 * One private channel per space: presence (who is online) + broadcast (signalling,
 * game moves, music sync, date-night events). Channel name contains the space UUID;
 * RLS on tables protects data, and the channel is only joined by authenticated members.
 */
export function useSpaceChannel(spaceId: string | null, me: Peer | null) {
  const chRef = useRef<RealtimeChannel | null>(null);
  const handlers = useRef<Record<string, Set<Handler>>>({});
  const [peers, setPeers] = useState<Peer[]>([]);
  const [status, setStatus] = useState<"connecting" | "online" | "offline">("connecting");

  useEffect(() => {
    if (!spaceId || !me) return;
    const ch = supabase().channel(`space:${spaceId}`, {
      config: { presence: { key: me.userId }, broadcast: { self: false } },
    });
    chRef.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, Peer[]>;
      setPeers(Object.values(state).flat().filter(p => p.userId !== me.userId));
    });
    ch.on("broadcast", { event: "*" }, ({ event, payload }) => {
      handlers.current[event]?.forEach(h => h(payload));
    });
    ch.subscribe(async s => {
      if (s === "SUBSCRIBED") { setStatus("online"); await ch.track(me); }
      else if (s === "CLOSED" || s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("offline");
    });
    return () => { supabase().removeChannel(ch); chRef.current = null; };
  }, [spaceId, me?.userId, me?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback((event: string, payload: unknown) => {
    chRef.current?.send({ type: "broadcast", event, payload });
  }, []);

  const on = useCallback((event: string, h: Handler) => {
    (handlers.current[event] ??= new Set()).add(h);
    return () => { handlers.current[event].delete(h); };
  }, []);

  return { peers, status, send, on };
}
