"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { MapBackground } from "../components/MapBackground";
import { MissionList } from "../components/MissionList";
import { useFormatters, useGame } from "../state/GameState";

export default function MainPage() {
  const router = useRouter();
  const { formatDateTime } = useFormatters();
  const {
    country,
    dateTime,
    isRunning,
    speed,
    play,
    pause,
    setSpeed,
    money,
    incomePerHour,
    infantryCount,
    createInfantry,
  } = useGame();

  return (
    <div className="relative min-h-screen text-zinc-50">
      <MapBackground />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/40 text-xl">
            {country?.flag ?? "?"}
          </div>
          <div>
            <div className="text-sm text-zinc-300">Country</div>
            <div className="text-lg font-semibold">
              {country?.name ?? "No country selected"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/country-select"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            Change country
          </Link>
          <button
            type="button"
            onClick={() => router.push("/missions")}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
          >
            Missions
          </button>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 pb-12 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-400">
                Date & Time
              </div>
              <div className="mt-1 text-lg font-semibold">
                {formatDateTime(dateTime)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={isRunning ? pause : play}
                className="h-10 rounded-xl bg-white/10 px-4 text-sm font-medium hover:bg-white/15"
              >
                {isRunning ? "Stop" : "Play"}
              </button>

              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
                {[0.5, 1, 2, 4].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s as 0.5 | 1 | 2 | 4)}
                    className={
                      "h-8 rounded-lg px-3 text-xs font-medium transition " +
                      (speed === s
                        ? "bg-zinc-50 text-zinc-950"
                        : "text-zinc-200 hover:bg-white/10")
                    }
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="text-xs uppercase tracking-widest text-zinc-400">
                Economy
              </div>
              <div className="mt-1 text-lg font-semibold">
                ${money.toFixed(0)}{" "}
                <span className="text-sm font-medium text-zinc-300">
                  + {incomePerHour}$/h
                </span>
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                (Prototype) Money increases while time is running.
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-zinc-400">
                    Army
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    Infantry: {infantryCount}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={createInfantry}
                  className="h-10 rounded-xl bg-zinc-50 px-4 text-sm font-medium text-zinc-950 hover:bg-white"
                >
                  + Infantry
                </button>
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                (Prototype) Adds a unit counter only.
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-widest text-zinc-400">
              Map
            </div>
            <div className="mt-2 text-sm text-zinc-300">
              This is a background-only placeholder. Later we can render provinces,
              frontlines, and interactions.
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <MissionList variant="panel" />
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-zinc-400">
            Tip: You can open the full mission tree and come back anytime.
          </div>
        </aside>
      </main>
    </div>
  );
}
