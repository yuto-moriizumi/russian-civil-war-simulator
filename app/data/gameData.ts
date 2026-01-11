import { Country, Mission } from '../types/game';

/**
 * Game start date: November 20, 1917
 * This date marks the declaration of the Ukrainian People's Republic
 */
export const GAME_START_DATE = new Date(1917, 10, 20);

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

// Soviet Mission Tree
const sovietMissions: Mission[] = [
  {
    id: 'soviet_mobilize',
    faction: 'soviet',
    name: 'Workers Unite!',
    description: 'Recruit your first Red Army units to begin the revolution',
    completed: false,
    claimed: false,
    rewards: { money: 100 },
    prerequisites: [],
  },
  {
    id: 'soviet_terror',
    faction: 'soviet',
    name: 'Red Terror',
    description: 'Establish revolutionary tribunals to secure Bolshevik control',
    completed: false,
    claimed: false,
    rewards: { money: 200 },
    prerequisites: ['soviet_mobilize'],
  },
  {
    id: 'soviet_economy',
    faction: 'soviet',
    name: 'War Communism',
    description: 'Nationalize industry and requisition grain for the war effort',
    completed: false,
    claimed: false,
    rewards: { money: 150 },
    prerequisites: ['soviet_mobilize'],
  },
  {
    id: 'soviet_crush',
    faction: 'soviet',
    name: 'Crush the Counter-Revolution',
    description: 'Defeat White Army forces in multiple engagements',
    completed: false,
    claimed: false,
    rewards: { money: 300 },
    prerequisites: ['soviet_terror', 'soviet_economy'],
  },
  {
    id: 'soviet_march',
    faction: 'soviet',
    name: 'March to Victory',
    description: 'Push the offensive and liberate key territories',
    completed: false,
    claimed: false,
    rewards: { money: 400 },
    prerequisites: ['soviet_crush'],
  },
  {
    id: 'soviet_victory',
    faction: 'soviet',
    name: 'Total Victory',
    description: 'Eliminate all White Army resistance and secure Soviet power',
    completed: false,
    claimed: false,
    rewards: { money: 500, gameVictory: true },
    prerequisites: ['soviet_march'],
  },
];

// White Army Mission Tree
const whiteMissions: Mission[] = [
  {
    id: 'white_rally',
    faction: 'white',
    name: 'Rally the Faithful',
    description: 'Gather loyal officers and volunteers to the cause',
    completed: false,
    claimed: false,
    rewards: { money: 100 },
    prerequisites: [],
  },
  {
    id: 'white_foreign',
    faction: 'white',
    name: 'Secure Foreign Support',
    description: 'Establish supply lines with Allied nations',
    completed: false,
    claimed: false,
    rewards: { money: 200 },
    prerequisites: ['white_rally'],
  },
  {
    id: 'white_order',
    faction: 'white',
    name: 'Restore Order',
    description: 'Re-establish lawful authority in liberated regions',
    completed: false,
    claimed: false,
    rewards: { money: 150 },
    prerequisites: ['white_rally'],
  },
  {
    id: 'white_break',
    faction: 'white',
    name: 'Break the Red Army',
    description: 'Achieve decisive victories against Bolshevik forces',
    completed: false,
    claimed: false,
    rewards: { money: 300 },
    prerequisites: ['white_foreign', 'white_order'],
  },
  {
    id: 'white_petrograd',
    faction: 'white',
    name: 'Advance on Petrograd',
    description: 'Launch the final offensive toward the revolutionary capital',
    completed: false,
    claimed: false,
    rewards: { money: 400 },
    prerequisites: ['white_break'],
  },
  {
    id: 'white_victory',
    faction: 'white',
    name: 'Total Victory',
    description: 'Eliminate Bolshevik resistance and restore Russia',
    completed: false,
    claimed: false,
    rewards: { money: 500, gameVictory: true },
    prerequisites: ['white_petrograd'],
  },
];

// Combined missions for both factions
export const initialMissions: Mission[] = [...sovietMissions, ...whiteMissions];
