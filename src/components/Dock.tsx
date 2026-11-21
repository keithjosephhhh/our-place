"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APPS } from "@/lib/apps";

/** The OS dock: every app as a bouncy icon. While in a call, the call controls sit in the same bar, like a video-meeting toolbar. */
export function Dock({ controls, compact }: { controls?: React.ReactNode; compact?: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Apps" className="fixed inset-x-0 bottom-2 z-40 flex justify-center px-2">
      <div className="flex max-w-full items-end gap-1.5 overflow-x-auto rounded-[2rem] border-2 border-white/80 bg-paper/90 px-3 py-2 shadow-soft backdrop-blur">
        {!(compact && controls) && APPS.map(a => {
          const active = a.href === "/" ? path === "/" : path.startsWith(a.href);
          const icon = (
            <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl transition-transform ${a.bg} ${a.ready ? "group-hover:-translate-y-1.5 group-hover:scale-110" : "opacity-45 grayscale"} ${active ? "ring-2 ring-rose" : ""}`}>{a.emoji}</span>
          );
          return a.ready ? (
            <Link key={a.href} href={a.href} title={a.label} aria-label={a.label} aria-current={active ? "page" : undefined} className="group flex flex-col items-center">
              {icon}<span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${active ? "bg-rose" : "bg-transparent"}`} />
            </Link>
          ) : (
            <span key={a.href} title={`${a.label} – coming soon`} className="group flex flex-col items-center">{icon}<span className="mt-0.5 h-1.5 w-1.5" /></span>
          );
        })}
        {controls && <>
          {!compact && <span className="mx-1 mb-2 h-10 w-0.5 shrink-0 rounded bg-ink/15" aria-hidden />}
          <div className="flex shrink-0 items-end gap-1.5">{controls}</div>
        </>}
      </div>
    </nav>
  );
}
