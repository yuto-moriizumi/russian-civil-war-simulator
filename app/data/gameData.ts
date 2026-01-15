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
    color: '#0d3b0d',
  },
  {
    id: 'finland',
    name: 'Finland',
    flag: '/images/flags/finland.svg',
    color: '#FFFFFF',
  },
  {
    id: 'ukraine',
    name: 'Ukraine',
    flag: '/images/flags/ukraine.svg',
    color: '#0057B7',
  },
  {
    id: 'don',
    name: 'Don Republic',
    flag: '/images/flags/don.svg',
    color: '#FFD700',
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

// Finnish Mission Tree
const finnishMissions: Mission[] = [
  {
    id: 'finland_independence',
    faction: 'finland',
    name: 'Declare Independence',
    description: 'Secure Finnish independence from Russian control',
    completed: false,
    claimed: false,
    rewards: { money: 100 },
    prerequisites: [],
    available: [
      { type: 'hasUnits', count: 3 }, // Recruit initial defense forces
    ],
  },
  {
    id: 'finland_civil_war',
    faction: 'finland',
    name: 'Finnish Civil War',
    description: 'Defeat the Red Guards and secure the White victory',
    completed: false,
    claimed: false,
    rewards: { money: 200 },
    prerequisites: ['finland_independence'],
    available: [
      { type: 'combatVictories', count: 1 }, // Win at least 1 battle
      { type: 'controlRegionCount', count: 15 }, // Control most of Finland
    ],
  },
  {
    id: 'finland_german_aid',
    faction: 'finland',
    name: 'German Intervention',
    description: 'Secure German military support to end the civil war',
    completed: false,
    claimed: false,
    rewards: { money: 150 },
    prerequisites: ['finland_independence'],
    available: [
      { type: 'hasMoney', amount: 400 }, // Demonstrate stability
      { type: 'dateAfter', date: '1918-04-01' }, // Historical German intervention
    ],
  },
  {
    id: 'finland_karelian',
    faction: 'finland',
    name: 'East Karelian Uprising',
    description: 'Support the East Karelian uprising against Soviet rule',
    completed: false,
    claimed: false,
    rewards: { money: 250 },
    prerequisites: ['finland_civil_war', 'finland_german_aid'],
    available: [
      { type: 'hasUnits', count: 10 }, // Have sufficient forces
      { type: 'controlRegion', regionId: 'FI-13' }, // Control North Karelia
      { type: 'theaterExists', enemyFaction: 'soviet' }, // Border Soviet territory
    ],
  },
  {
    id: 'finland_greater',
    faction: 'finland',
    name: 'Greater Finland',
    description: 'Expand Finnish borders to include Karelia and Kola Peninsula',
    completed: false,
    claimed: false,
    rewards: { money: 350 },
    prerequisites: ['finland_karelian'],
    available: [
      { type: 'controlRegion', regionId: 'RU-KR' }, // Control Karelia
      { type: 'hasUnits', count: 15 }, // Strong military
    ],
  },
  {
    id: 'finland_victory',
    faction: 'finland',
    name: 'Secure the North',
    description: 'Establish Finland as the dominant power in Northern Europe',
    completed: false,
    claimed: false,
    rewards: { money: 500, gameVictory: true },
    prerequisites: ['finland_greater'],
    available: [
      { type: 'controlRegions', regionIds: ['FI-18', 'RU-KR', 'RU-MUR'] }, // Control key regions
      { type: 'hasUnits', count: 20 }, // Strong military presence
    ],
  },
];

// Ukrainian Mission Tree
const ukrainianMissions: Mission[] = [
  {
    id: 'ukraine_independence',
    faction: 'ukraine',
    name: 'Ukrainian People\'s Republic',
    description: 'Establish the Ukrainian People\'s Republic and secure independence',
    completed: false,
    claimed: false,
    rewards: { money: 100 },
    prerequisites: [],
    available: [
      { type: 'hasUnits', count: 5 }, // Recruit initial defense forces
    ],
  },
  {
    id: 'ukraine_consolidate',
    faction: 'ukraine',
    name: 'Consolidate Control',
    description: 'Secure control over Ukrainian territories and establish government authority',
    completed: false,
    claimed: false,
    rewards: { money: 200 },
    prerequisites: ['ukraine_independence'],
    available: [
      { type: 'controlRegion', regionId: 'UA-30' }, // Control Kyiv
      { type: 'controlRegionCount', count: 15 }, // Control significant Ukrainian territory
    ],
  },
  {
    id: 'ukraine_rada',
    faction: 'ukraine',
    name: 'Strengthen the Rada',
    description: 'Build up the Central Rada\'s authority and military capacity',
    completed: false,
    claimed: false,
    rewards: { money: 150 },
    prerequisites: ['ukraine_independence'],
    available: [
      { type: 'hasMoney', amount: 500 }, // Demonstrate financial stability
      { type: 'hasUnits', count: 10 }, // Build military strength
    ],
  },
  {
    id: 'ukraine_resist',
    faction: 'ukraine',
    name: 'Resist Foreign Invasion',
    description: 'Defend Ukrainian independence against Bolshevik and White forces',
    completed: false,
    claimed: false,
    rewards: { money: 300 },
    prerequisites: ['ukraine_consolidate', 'ukraine_rada'],
    available: [
      { type: 'combatVictories', count: 3 }, // Win battles against invaders
      { type: 'controlRegionCount', count: 20 }, // Hold significant territory
    ],
  },
  {
    id: 'ukraine_donbas',
    faction: 'ukraine',
    name: 'Secure the Donbas',
    description: 'Control the industrial heartland of the Donbas region',
    completed: false,
    claimed: false,
    rewards: { money: 250 },
    prerequisites: ['ukraine_resist'],
    available: [
      { type: 'controlRegions', regionIds: ['UA-14', 'UA-12'] }, // Control Donetsk and Dnipropetrovsk
      { type: 'hasUnits', count: 15 }, // Strong military
    ],
  },
  {
    id: 'ukraine_victory',
    faction: 'ukraine',
    name: 'Independent and Free',
    description: 'Secure full Ukrainian independence and control all Ukrainian territories',
    completed: false,
    claimed: false,
    rewards: { money: 500, gameVictory: true },
    prerequisites: ['ukraine_donbas'],
    available: [
      { type: 'allRegionsControlled', countryIso3: 'UKR' }, // Control all Ukrainian regions
      { type: 'hasUnits', count: 20 }, // Strong military presence
    ],
  },
];

// Don Republic Mission Tree
const donMissions: Mission[] = [
  {
    id: 'don_independence',
    faction: 'don',
    name: 'Don Cossack Independence',
    description: 'Establish the independent Don Cossack Republic',
    completed: false,
    claimed: false,
    rewards: { money: 100 },
    prerequisites: [],
    available: [
      { type: 'hasUnits', count: 3 }, // Recruit initial Cossack forces
    ],
  },
  {
    id: 'don_consolidate',
    faction: 'don',
    name: 'Unite the Don',
    description: 'Consolidate control over Don Cossack territories',
    completed: false,
    claimed: false,
    rewards: { money: 150 },
    prerequisites: ['don_independence'],
    available: [
      { type: 'controlRegions', regionIds: ['RU-ROS', 'RU-VGG'] }, // Control both starting regions
      { type: 'hasUnits', count: 8 }, // Build up forces
    ],
  },
  {
    id: 'don_ataman',
    faction: 'don',
    name: 'Ataman\'s Authority',
    description: 'Strengthen the Ataman\'s military and political control',
    completed: false,
    claimed: false,
    rewards: { money: 200 },
    prerequisites: ['don_independence'],
    available: [
      { type: 'hasMoney', amount: 400 }, // Demonstrate economic stability
      { type: 'combatVictories', count: 1 }, // Win a defensive battle
    ],
  },
  {
    id: 'don_expansion',
    faction: 'don',
    name: 'Expand Don Territory',
    description: 'Secure neighboring territories to protect the Don homeland',
    completed: false,
    claimed: false,
    rewards: { money: 250 },
    prerequisites: ['don_consolidate', 'don_ataman'],
    available: [
      { type: 'controlRegionCount', count: 5 }, // Expand beyond starting regions
      { type: 'combatVictories', count: 3 }, // Prove military strength
    ],
  },
  {
    id: 'don_kuban',
    faction: 'don',
    name: 'Alliance with Kuban',
    description: 'Forge alliance with neighboring Kuban Cossacks',
    completed: false,
    claimed: false,
    rewards: { money: 300 },
    prerequisites: ['don_expansion'],
    available: [
      { type: 'controlRegion', regionId: 'RU-KDA' }, // Control Krasnodar Krai (Kuban)
      { type: 'hasUnits', count: 15 }, // Strong military
    ],
  },
  {
    id: 'don_victory',
    faction: 'don',
    name: 'Don Cossack Supremacy',
    description: 'Establish the Don Republic as a major power in the South',
    completed: false,
    claimed: false,
    rewards: { money: 500, gameVictory: true },
    prerequisites: ['don_kuban'],
    available: [
      { type: 'controlRegionCount', count: 12 }, // Control significant southern territory
      { type: 'hasUnits', count: 20 }, // Strong military presence
    ],
  },
];

// Combined missions for both factions
export const initialMissions: Mission[] = [...sovietMissions, ...whiteMissions, ...finnishMissions, ...ukrainianMissions, ...donMissions];
