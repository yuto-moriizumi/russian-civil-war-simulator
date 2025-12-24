export type Screen = 'title' | 'countrySelect' | 'main' | 'mission';

export type CountryId = 'soviet' | 'russian_republic';

export interface Country {
  id: CountryId;
  name: string;
  flag: string;
  color: string;
}

export type GameSpeed = 1 | 2 | 3 | 4 | 5;

export interface Mission {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  claimed: boolean;
  rewards: {
    money: number;
  };
  prerequisites: string[];
  position: { x: number; y: number };
}

export interface GameState {
  currentScreen: Screen;
  selectedCountry: Country | null;
  dateTime: Date;
  isPlaying: boolean;
  gameSpeed: GameSpeed;
  money: number;
  income: number;
  infantryUnits: number;
  missions: Mission[];
}
