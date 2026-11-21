import { SpaceProvider } from "@/components/SpaceProvider";
import { CallDock } from "@/components/CallDock";
import { TopBar } from "@/components/TopBar";
import { FxLayer } from "@/components/FxLayer";
import { Ambient } from "@/components/Ambient";

// The provider lives here so the call and music persist while moving between apps.
// TopBar = the OS menu bar. CallDock = page shell + dock + call layout (our videos on both sides, the app in the middle).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SpaceProvider>
      <Ambient />
      <TopBar />
      {process.env.NEXT_PUBLIC_PREVIEW === "1" && (
        <p className="preview-banner fixed bottom-24 left-2 z-[80] rounded-full bg-blush px-3 py-0.5 text-sm shadow-soft">Preview mode: nothing syncs or saves.</p>
      )}
      <CallDock>{children}</CallDock>
      <FxLayer />
    </SpaceProvider>
  );
}
