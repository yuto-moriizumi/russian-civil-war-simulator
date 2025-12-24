import Link from "next/link";

export default function TitleScreen() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(220,38,38,0.25),transparent_40%),radial-gradient(circle_at_80%_25%,rgba(59,130,246,0.18),transparent_40%),radial-gradient(circle_at_50%_80%,rgba(245,158,11,0.12),transparent_45%)]" />
      <main className="relative z-10 w-full max-w-3xl px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-black/35 p-10 shadow-2xl">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Russian Civil War Simulator
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            UI prototype inspired by HOI4. No real gameplay yet — just screens and
            clickable mock systems.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/country-select"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-50 px-5 font-medium text-zinc-950 transition hover:bg-white"
            >
              Start
            </Link>
            <Link
              href="/missions"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 font-medium text-zinc-50 transition hover:bg-white/10"
            >
              View Mission Tree
            </Link>
          </div>

          <div className="mt-10 text-sm text-zinc-400">
            Screens: Title → Country Select → Main → Missions
          </div>
        </div>
      </main>
    </div>
  );
}
