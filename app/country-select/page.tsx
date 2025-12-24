"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useCountries, useGame } from "../state/GameState";

export default function CountrySelectPage() {
  const router = useRouter();
  const countries = useCountries();
  const { country, setCountry } = useGame();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div className="text-lg font-semibold tracking-tight">
          Country Select
        </div>
        <Link
          href="/"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm hover:bg-white/10"
        >
          Back to Title
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6 pb-12">
        <p className="max-w-2xl text-sm leading-6 text-zinc-300">
          Pick a side. For now, it only changes UI labels/flag.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {countries.map((c) => {
            const selected = country?.id === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCountry(c)}
                className={
                  "rounded-2xl border p-6 text-left transition " +
                  (selected
                    ? "border-white/30 bg-white/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10")
                }
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/40 text-2xl">
                    {c.flag}
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{c.name}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {c.id === "soviet"
                        ? "Centralized revolutionary government"
                        : "Provisional republican authority"}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Selected: {country ? country.name : "None"}
          </div>
          <button
            type="button"
            onClick={() => router.push("/main")}
            disabled={!country}
            className={
              "inline-flex h-11 items-center justify-center rounded-xl px-5 font-medium transition " +
              (country
                ? "bg-zinc-50 text-zinc-950 hover:bg-white"
                : "cursor-not-allowed bg-white/10 text-white/30")
            }
          >
            Continue
          </button>
        </div>
      </main>
    </div>
  );
}
