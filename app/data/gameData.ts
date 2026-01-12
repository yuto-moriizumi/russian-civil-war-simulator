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
    flag: '/images/flags/soviet.svg',
    color: '#CC0000',
  },
  {
    id: 'white',
    name: 'White Army',
    flag: '/images/flags/white.svg',
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
    available: [
      { type: 'hasUnits', count: 5 }, // Recruit at least 5 divisions
    ],
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
    available: [
      { type: 'combatVictories', count: 2 }, // Win at least 2 battles
      { type: 'controlRegionCount', count: 10 }, // Control at least 10 regions
    ],
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
    available: [
      { type: 'hasMoney', amount: 500 }, // Accumulate 500 money
      { type: 'dateAfter', date: '1918-06-01' }, // After June 1918 (historical War Communism start)
    ],
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
    available: [
      { type: 'combatVictories', count: 5 }, // Win at least 5 battles
      { type: 'controlRegionCount', count: 20 }, // Control at least 20 regions
      { type: 'theaterExists', enemyFaction: 'white' }, // Have active theater against Whites
    ],
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
    available: [
      { type: 'controlRegionCount', count: 35 }, // Control at least 35 regions
      { type: 'hasUnits', count: 20 }, // Have at least 20 divisions
      { type: 'enemyRegionCount', faction: 'white', maxCount: 15 }, // Whites control at most 15 regions
    ],
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
    available: [
      { type: 'enemyRegionCount', faction: 'white', maxCount: 0 }, // Whites control no regions
    ],
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
    available: [
      { type: 'hasUnits', count: 5 }, // Recruit at least 5 divisions
    ],
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
    available: [
      { type: 'hasMoney', amount: 600 }, // Demonstrate financial stability
      { type: 'controlRegionCount', count: 8 }, // Control at least 8 regions
    ],
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
    available: [
      { type: 'combatVictories', count: 2 }, // Win at least 2 battles
      { type: 'armyGroupCount', count: 1 }, // Have at least 1 organized army group
    ],
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
    available: [
      { type: 'combatVictories', count: 6 }, // Win at least 6 battles
      { type: 'controlRegionCount', count: 20 }, // Control at least 20 regions
      { type: 'theaterExists', enemyFaction: 'soviet' }, // Have active theater against Soviets
    ],
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
    available: [
      { type: 'controlRegion', regionId: 'RU-LEN' }, // Control Leningrad Oblast (near Petrograd)
      { type: 'hasUnits', count: 25 }, // Have at least 25 divisions
      { type: 'enemyRegionCount', faction: 'soviet', maxCount: 15 }, // Soviets control at most 15 regions
    ],
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
    available: [
      { type: 'enemyRegionCount', faction: 'soviet', maxCount: 0 }, // Soviets control no regions
    ],
  },
];

// Combined missions for both factions
export const initialMissions: Mission[] = [...sovietMissions, ...whiteMissions];
