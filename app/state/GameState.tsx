"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type CountryId = "soviet" | "russian-republic";

export type CountryDefinition = {
  id: CountryId;
  name: string;
  flag: string;
};

export type Mission = {
  id: string;
  title: string;
  description: string;
  reward: { money: number };
  completed: boolean;
  prerequisites?: string[];
};

export type GameSpeed = 0.5 | 1 | 2 | 4;

type GameState = {
  country: CountryDefinition | null;
  setCountry: (country: CountryDefinition) => void;

  // Time
  dateTime: Date;
  isRunning: boolean;
  speed: GameSpeed;
  play: () => void;
  pause: () => void;
  setSpeed: (speed: GameSpeed) => void;

  // Economy
  money: number;
  incomePerHour: number;
  addMoney: (amount: number) => void;

  // Army (mock)
  infantryCount: number;
  createInfantry: () => void;

  // Missions
  missions: Mission[];
  claimMissionReward: (missionId: string) => void;
};

const COUNTRIES: CountryDefinition[] = [
  { id: "soviet", name: "Soviet Russia", flag: "☭" },
  { id: "russian-republic", name: "Russian Republic", flag: "⚑" },
];

const INITIAL_MISSIONS: Mission[] = [
  {
    id: "secure-capital",
    title: "Secure the Capital",
    description: "Establish control over the seat of power.",
    reward: { money: 25 },
    completed: false,
  },
  {
    id: "raise-volunteers",
    title: "Raise Volunteers",
    description: "Increase manpower through local recruitment.",
    reward: { money: 15 },
    completed: false,
    prerequisites: ["secure-capital"],
  },
  {
    id: "organize-supply",
    title: "Organize Supply Lines",
    description: "Secure railways and depots to sustain the front.",
    reward: { money: 20 },
    completed: false,
    prerequisites: ["secure-capital"],
  },
];

const GameContext = createContext<GameState | null>(null);

function getDefaultDateTime() {
  return new Date("1918-01-01T08:00:00Z");
}

function formatDateTime(dateTime: Date) {
  // Basic readable output; treat as UTC.
  const yyyy = dateTime.getUTCFullYear();
  const mm = String(dateTime.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dateTime.getUTCDate()).padStart(2, "0");
  const hh = String(dateTime.getUTCHours()).padStart(2, "0");
  const min = String(dateTime.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

export function GameProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [country, setCountryState] = useState<CountryDefinition | null>(null);

  const [dateTime, setDateTime] = useState<Date>(getDefaultDateTime);
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeedState] = useState<GameSpeed>(1);

  const [money, setMoney] = useState<number>(34);
  const incomePerHour = 1;

  const [infantryCount, setInfantryCount] = useState(0);

  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);

  const tickMsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      if (tickMsRef.current) window.clearInterval(tickMsRef.current);
      tickMsRef.current = null;
      return;
    }

    // 1 real second = 1 game hour * speed
    const handle = window.setInterval(() => {
      setDateTime((prev) => new Date(prev.getTime() + 60 * 60 * 1000 * speed));
      setMoney((prev) => prev + incomePerHour * speed);
    }, 1000);

    tickMsRef.current = handle;
    return () => window.clearInterval(handle);
  }, [incomePerHour, isRunning, speed]);

  const setCountry = useCallback((next: CountryDefinition) => {
    setCountryState(next);
  }, []);

  const play = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);

  const setSpeed = useCallback((next: GameSpeed) => {
    setSpeedState(next);
  }, []);

  const addMoney = useCallback((amount: number) => {
    setMoney((prev) => prev + amount);
  }, []);

  const createInfantry = useCallback(() => {
    setInfantryCount((prev) => prev + 1);
  }, []);

  const claimMissionReward = useCallback((missionId: string) => {
    setMissions((prev) => {
      const target = prev.find((m) => m.id === missionId);
      if (!target || target.completed) return prev;

      const unmetPrereq = (target.prerequisites ?? []).some((pr) => {
        const prereqMission = prev.find((m) => m.id === pr);
        return !prereqMission || !prereqMission.completed;
      });
      if (unmetPrereq) return prev;

      setMoney((current) => current + target.reward.money);
      return prev.map((m) =>
        m.id === missionId ? { ...m, completed: true } : m,
      );
    });
  }, []);

  const value = useMemo<GameState>(
    () => ({
      country,
      setCountry,
      dateTime,
      isRunning,
      speed,
      play,
      pause,
      setSpeed,
      money,
      incomePerHour,
      addMoney,
      infantryCount,
      createInfantry,
      missions,
      claimMissionReward,
    }),
    [
      addMoney,
      claimMissionReward,
      country,
      createInfantry,
      dateTime,
      incomePerHour,
      infantryCount,
      isRunning,
      missions,
      money,
      pause,
      play,
      setCountry,
      setSpeed,
      speed,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

export function useCountries() {
  return COUNTRIES;
}

export function useFormatters() {
  return useMemo(() => ({ formatDateTime }), []);
}
