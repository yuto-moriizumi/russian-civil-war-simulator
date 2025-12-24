"use client";

import Link from "next/link";

import { MapBackground } from "../components/MapBackground";
import { MissionList } from "../components/MissionList";
import { useGame } from "../state/GameState";

export default function MissionsPage() {
  const { country } = useGame();

  return (
    <div className="relative min-h-screen text-zinc-50">
      <MapBackground />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-400">
            Mission Screen
          </div>
          <div className="mt-1 text-lg font-semibold">
            Mission Tree {country ? `— ${country.name}` : ""}
          </div>
        </div>

        <Link
          href="/main"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          Back to Main
        </Link>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 pb-12">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
          <MissionList variant="full" />

          <section className="rounded-2xl border border-white/10 bg-black/25 p-6">
            <div className="text-sm font-semibold">Tree Layout (Mock)</div>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              This area is reserved for a visual mission tree (nodes + lines).
              Right now, missions are shown as a list you can click.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { title: "Secure the Capital", state: "available" },
                { title: "Raise Volunteers", state: "locked" },
                { title: "Organize Supply Lines", state: "locked" },
                { title: "Future Branch", state: "future" },
              ].map((node) => (
                <div
                  key={node.title}
                  className={
                    "rounded-2xl border p-4 " +
                    (node.state === "available"
                      ? "border-white/20 bg-white/10"
                      : node.state === "locked"
                        ? "border-white/10 bg-white/5 text-white/60"
                        : "border-white/5 bg-white/3 text-white/40")
                  }
                >
                  <div className="text-sm font-medium">{node.title}</div>
                  <div className="mt-1 text-xs text-zinc-400">
                    {node.state === "available"
                      ? "Clickable (prototype)"
                      : node.state === "locked"
                        ? "Locked by prerequisites"
                        : "Placeholder"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
