"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APPS } from "@/lib/apps";

/**
 * The bottom bar. On a phone it is the tab bar for every app. On a computer the apps live in the top tabs,
 * so the bar only appears during a call, holding the call controls (like a video-meeting toolbar).
 */
export function Dock({ controls }: { controls?: React.ReactNode }) {
  const path = usePathname();
  const apps = APPS.filter(a => a.ready);
  return (
    <nav aria-label="Apps and call controls" className={`fixed inset-x-0 bottom-2 z-40 flex justify-center px-2 ${controls ? "" : "lg:hidden"}`}>
      <div className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-[2rem] border-2 border-white/80 bg-paper/90 px-3 py-2 shadow-soft backdrop-blur">
        <div className="flex items-center gap-1.5 lg:hidden">
          {apps.map(a => {
            const active = a.href === "/" ? path === "/" : path.startsWith(a.href);
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href} title={a.label} aria-label={a.label} aria-current={active ? "page" : undefined}
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${active ? "bg-rose text-white" : `${a.bg} hover:-translate-y-1`}`}>
                <Icon size={22} />
              </Link>
            );
          })}
        </div>
        {controls && <>
          <span className="mx-1 h-10 w-0.5 shrink-0 rounded bg-ink/15 lg:hidden" aria-hidden />
          <div className="flex shrink-0 items-center gap-1.5">{controls}</div>
        </>}
      </div>
    </nav>
  );
}
