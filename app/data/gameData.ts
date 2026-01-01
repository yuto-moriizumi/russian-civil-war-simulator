import { Country, Mission } from '../types/game';

export const countries: Country[] = [
  {
    id: 'soviet',
    name: 'Soviet Russia',
    flag: '☭',
    color: '#CC0000',
  },
  {
    id: 'white',
    name: 'White Army',
    flag: '🦅',
    color: '#FFFFFF',
  },
];

export const initialMissions: Mission[] = [
  {
    id: 'mobilize_forces',
    name: 'Mobilize Forces',
    description: 'Recruit your first infantry units to begin the campaign',
    completed: false,
    claimed: false,
    rewards: { money: 100 },
    prerequisites: [],
    position: { x: 50, y: 20 },
  },
  {
    id: 'secure_capital',
    name: 'Secure the Capital',
    description: 'Establish control over your capital region',
    completed: false,
    claimed: false,
    rewards: { money: 200 },
    prerequisites: ['mobilize_forces'],
    position: { x: 30, y: 40 },
  },
  {
    id: 'establish_supply',
    name: 'Establish Supply Lines',
    description: 'Create reliable supply routes for your armies',
    completed: false,
    claimed: false,
    rewards: { money: 150 },
    prerequisites: ['mobilize_forces'],
    position: { x: 70, y: 40 },
  },
  {
    id: 'first_victory',
    name: 'First Victory',
    description: 'Win your first battle against enemy forces',
    completed: false,
    claimed: false,
    rewards: { money: 300 },
    prerequisites: ['secure_capital', 'establish_supply'],
    position: { x: 50, y: 60 },
  },
  {
    id: 'expand_territory',
    name: 'Expand Territory',
    description: 'Capture additional regions to strengthen your position',
    completed: false,
    claimed: false,
    rewards: { money: 500 },
    prerequisites: ['first_victory'],
    position: { x: 50, y: 80 },
  },
];
