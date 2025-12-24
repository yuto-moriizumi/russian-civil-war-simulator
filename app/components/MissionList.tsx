"use client";

import Link from "next/link";

import { Mission, useGame } from "../state/GameState";

function isAvailable(mission: Mission, missions: Mission[]) {
  if (mission.completed) return false;
  return (mission.prerequisites ?? []).every((pr) => {
    const prereqMission = missions.find((m) => m.id === pr);
    return prereqMission?.completed;
  });
}

export function MissionList({ variant }: Readonly<{ variant: "panel" | "full" }>) {
  const { missions, claimMissionReward } = useGame();

  return (
    <div
      className={
        variant === "panel"
          ? "rounded-2xl border border-white/10 bg-black/35 p-4"
          : "rounded-2xl border border-white/10 bg-black/30 p-6"
      }
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold tracking-wide text-zinc-200">
          Missions
        </div>
        {variant === "panel" ? (
          <Link
            href="/missions"
            className="text-xs text-zinc-300 underline underline-offset-2 hover:text-white"
          >
            Open tree
          </Link>
        ) : null}
      </div>

      <div className="mt-3 space-y-2">
        {missions.map((m) => {
          const available = isAvailable(m, missions);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => claimMissionReward(m.id)}
              disabled={!available}
              className={
                "w-full rounded-xl border px-3 py-2 text-left text-sm transition " +
                (m.completed
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-50"
                  : available
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "cursor-not-allowed border-white/5 bg-white/3 text-white/40")
              }
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-zinc-300">+${m.reward.money}</div>
              </div>
              <div className="mt-1 text-xs text-zinc-400">{m.description}</div>
              {m.completed ? (
                <div className="mt-1 text-xs text-emerald-200">Completed</div>
              ) : null}
            </button>
          );
        })}
      </div>

      {variant === "panel" ? (
        <div className="mt-3 text-xs text-zinc-400">
          Click an available mission to claim rewards.
        </div>
      ) : (
        <div className="mt-4 text-xs text-zinc-400">
          This is a static mission tree mock. Later we can add prerequisites,
          branching layout, and real effects.
        </div>
      )}
    </div>
  );
}
