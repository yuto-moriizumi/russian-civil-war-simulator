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
    coreRegions: [
      // Central Russia - Industrial heartland
      'RU-MOW', // Moscow (city) - Capital
      'RU-MOS', // Moscow Oblast
      'RU-SPE', // Saint Petersburg (city)
      'RU-LEN', // Leningrad Oblast
      'RU-TVE', // Tver Oblast
      'RU-IVA', // Ivanovo Oblast
      'RU-VLA', // Vladimir Oblast
      'RU-KOS', // Kostroma Oblast
      'RU-YAR', // Yaroslavl Oblast
      'RU-NIZ', // Nizhny Novgorod Oblast
      'RU-VOR', // Voronezh Oblast
      'RU-BEL', // Belgorod Oblast
      // Volga region
      'RU-SAM', // Samara Oblast
      'RU-SAR', // Saratov Oblast
      'RU-ULY', // Ulyanovsk Oblast
      'RU-TA',  // Tatarstan
      // Urals - Industrial base
      'RU-SVE', // Sverdlovsk Oblast
      'RU-CHE', // Chelyabinsk Oblast
      'RU-PER', // Perm Krai
    ],
  },
  {
    id: 'white',
    name: 'White Army',
    flag: '/images/flags/white.svg',
    color: '#0d3b0d',
    coreRegions: [
      // Historical White strongholds - Southern Russia, Siberia, North
      'RU-ROS', // Rostov Oblast - Don region
      'RU-KDA', // Krasnodar Krai
      'RU-STA', // Stavropol Krai
      'RU-VGG', // Volgograd Oblast
      // Siberia
      'RU-OMS', // Omsk Oblast - White capital
      'RU-TYU', // Tyumen Oblast
      'RU-NVS', // Novosibirsk Oblast
      'RU-TOM', // Tomsk Oblast
      'RU-IRK', // Irkutsk Oblast
      // Northern Russia
      'RU-ARK', // Arkhangelsk Oblast
      'RU-VLG', // Vologda Oblast
      // Far East
      'RU-PRI', // Primorsky Krai (Vladivostok)
      'RU-KHA', // Khabarovsk Krai
    ],
  },
  {
    id: 'finland',
    name: 'Finland',
    flag: '/images/flags/finland.svg',
    color: '#FFFFFF',
    coreRegions: [
      // All Finnish regions (ADM-1)
      'FI-01', // Ahvenanmaa
      'FI-02', // Etelä-Karjala
      'FI-03', // Etelä-Pohjanmaa
      'FI-04', // Etelä-Savo
      'FI-05', // Kainuu
      'FI-06', // Kanta-Häme
      'FI-07', // Keski-Pohjanmaa
      'FI-08', // Keski-Suomi
      'FI-09', // Kymenlaakso
      'FI-10', // Lappi
      'FI-11', // Pirkanmaa
      'FI-12', // Pohjanmaa
      'FI-13', // Pohjois-Karjala
      'FI-14', // Pohjois-Pohjanmaa
      'FI-15', // Pohjois-Savo
      'FI-16', // Päijät-Häme
      'FI-17', // Satakunta
      'FI-18', // Uusimaa (Helsinki)
      'FI-19', // Varsinais-Suomi
      // Karelia expansion goals
      'RU-KR',  // Republic of Karelia
    ],
  },
  {
    id: 'ukraine',
    name: 'Ukraine',
    flag: '/images/flags/ukraine.svg',
    color: '#0057B7',
    coreRegions: [
      // Central and Eastern Ukraine
      'UA-30', // Kyiv (city)
      'UA-32', // Kyiv Oblast
      'UA-71', // Cherkasy Oblast
      'UA-74', // Chernihiv Oblast
      'UA-77', // Chernivtsi Oblast
      'UA-12', // Dnipropetrovsk Oblast
      'UA-14', // Donetsk Oblast
      'UA-63', // Kharkiv Oblast
      'UA-65', // Kherson Oblast
      'UA-18', // Ivano-Frankivsk Oblast
      'UA-61', // Kirovohrad Oblast
      'UA-09', // Luhansk Oblast
      'UA-46', // Lviv Oblast
      'UA-48', // Mykolaiv Oblast
      'UA-51', // Odesa Oblast
      'UA-53', // Poltava Oblast
      'UA-56', // Rivne Oblast
      'UA-59', // Sumy Oblast
      'UA-05', // Vinnytsia Oblast
      'UA-07', // Volyn Oblast
      'UA-21', // Zakarpattia Oblast
      'UA-23', // Zaporizhzhia Oblast
      'UA-26', // Zhytomyr Oblast
      // Crimea
      'UA-43', // Crimea
    ],
  },
  {
    id: 'don',
    name: 'Don Republic',
    flag: '/images/flags/don.svg',
    color: '#FFD700',
    coreRegions: [
      // Don Cossack homeland
      'RU-ROS', // Rostov Oblast - Capital (Novocherkassk)
      'RU-VGG', // Volgograd Oblast - Don Cossack lands
      'RU-KDA', // Krasnodar Krai - Kuban Cossack alliance
      'RU-STA', // Stavropol Krai
      'RU-AST', // Astrakhan Oblast
    ],
  },
  {
    id: 'fswr',
    name: "Finnish Socialist Workers' Republic",
    flag: '/images/flags/fswr.svg',
    color: '#CC0000',
    selectable: false,
    coreRegions: [
      // Red Finland - Southern urban centers
      'FI-18', // Uusimaa (Helsinki)
      'FI-09', // Kymenlaakso
      'FI-11', // Pirkanmaa (Tampere)
      'FI-06', // Kanta-Häme
      'FI-16', // Päijät-Häme
    ],
  },
  {
    id: 'iskolat',
    name: 'Iskolat (Latvian Soviet Republic)',
    flag: '/images/flags/iskolat.svg',
    color: '#8B0000',
    selectable: false,
    coreRegions: [
      // Latvia
      'LVA', // Latvia (ADM0)
    ],
  },
  {
    id: 'germany',
    name: 'German Empire',
    flag: '/images/flags/germany.svg',
    color: '#1a1a1a',
  },
  {
    id: 'bulgaria',
    name: 'Tsardom of Bulgaria',
    flag: '/images/flags/bulgaria.svg',
    color: '#D62612',  // Bulgarian red from the flag
    selectable: false,  // NPC country - not selectable by players
    coreRegions: [
      // All Bulgarian provinces (oblasts) - circa 1917
      'BG-01', // Blagoevgrad
      'BG-02', // Burgas
      'BG-03', // Varna
      'BG-04', // Veliko Tarnovo
      'BG-05', // Vidin
      'BG-06', // Vratsa
      'BG-07', // Gabrovo
      'BG-08', // Dobrich
      'BG-09', // Kardzhali
      'BG-10', // Kyustendil
      'BG-11', // Lovech
      'BG-12', // Montana
      'BG-13', // Pazardzhik
      'BG-14', // Pernik
      'BG-15', // Pleven
      'BG-16', // Plovdiv
      'BG-17', // Razgrad
      'BG-18', // Ruse
      'BG-19', // Silistra
      'BG-20', // Sliven
      'BG-21', // Smolyan
      'BG-22', // Sofia (city) - Capital
      'BG-23', // Sofia Province
      'BG-24', // Stara Zagora
      'BG-25', // Targovishte
      'BG-26', // Haskovo
      'BG-27', // Shumen
      'BG-28', // Yambol
    ],
  },
];

/**
 * BULGARIA - Initial Setup Documentation
 * 
 * Historical Context (November 1917):
 * - Bulgaria entered WWI in October 1915 on the side of the Central Powers
 * - By November 1917, Bulgaria controlled its pre-war territories and parts of occupied Macedonia/Serbia
 * - Tsar Ferdinand I ruled Bulgaria (abdicated October 1918, succeeded by Boris III)
 * - Bulgaria was fighting on the Macedonian Front against Allied forces (France, Britain, Serbia, Greece)
 * - The country faced severe economic hardship, food shortages, and growing war weariness
 * 
 * Recommended Initial Setup:
 * 
 * 1. INITIAL REGIONS (app/data/map.ts):
 *    - All Bulgarian regions (BG-01 through BG-28) should be owned by 'bulgaria'
 *    - Historical note: Bulgaria also occupied parts of Macedonia and Serbia, but for game balance
 *      it's recommended to start with just Bulgarian core territories
 * 
 * 2. STARTING MILITARY (app/store/game/initialState.ts):
 *    - Recommended: 12-15 divisions total
 *    - Deploy primarily in: BG-22 (Sofia - capital), BG-16 (Plovdiv), BG-03 (Varna)
 *    - Historical strength: Bulgaria mobilized over 1 million men, but by 1917 was exhausted
 *    - Army Groups: Consider 1-2 army groups (Macedonian Front, Home Defense)
 * 
 * 3. DIPLOMATIC RELATIONSHIPS (app/store/game/initialState.ts):
 *    - At WAR with: Serbia (if included), Greece (if included)
 *    - MILITARY_ACCESS with: Germany, Ottoman Empire (if included)
 *    - NEUTRAL towards: Soviet Russia, White Army (not involved in Russian Civil War)
 * 
 * 4. AI BEHAVIOR:
 *    - Bulgaria is an NPC (selectable: false) and will be controlled by default CPU AI
 *    - Recommended behavior: Defensive, focused on holding territories
 *    - Historical outcome: Bulgaria signed armistice in September 1918, first Central Power to exit WWI
 * 
 * Note: Bulgaria's inclusion represents the broader Eastern European/Balkan context of the period.
 * While not directly involved in the Russian Civil War, it existed as a major power in the region.
 */

// Soviet Mission Tree (Offense-focused: Attack > HP > Defence)
const sovietMissions: Mission[] = [
  {
    id: 'soviet_mobilize',
    country: 'soviet',
    name: 'Workers Unite!',
    description: 'Recruit your first Red Army units to begin the revolution',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 2 },
    prerequisites: [],
    available: [
      { type: 'hasUnits', count: 5 }, // Recruit at least 5 divisions
    ],
  },
  {
    id: 'soviet_terror',
    country: 'soviet',
    name: 'Red Terror',
    description: 'Establish revolutionary tribunals to secure Bolshevik control',
    completed: false,
    claimed: false,
    rewards: { hpBonus: 10, defenceBonus: 1 },
    prerequisites: ['soviet_mobilize'],
    available: [
      { type: 'combatVictories', count: 2 }, // Win at least 2 battles
      { type: 'controlRegionCount', count: 10 }, // Control at least 10 regions
    ],
  },
  {
    id: 'soviet_economy',
    country: 'soviet',
    name: 'War Communism',
    description: 'Nationalize industry and requisition grain for the war effort',
    completed: false,
    claimed: false,
    rewards: { commandPowerBonus: 3, productionSpeedBonus: 0.15 },
    prerequisites: ['soviet_mobilize'],
    available: [
      { type: 'controlRegionCount', count: 12 }, // Control at least 12 regions
      { type: 'dateAfter', date: '1918-06-01' }, // After June 1918 (historical War Communism start)
    ],
  },
  {
    id: 'soviet_crush',
    country: 'soviet',
    name: 'Crush the Counter-Revolution',
    description: 'Defeat White Army forces in multiple engagements',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 3, defenceBonus: 1 },
    prerequisites: ['soviet_terror', 'soviet_economy'],
    available: [
      { type: 'combatVictories', count: 5 }, // Win at least 5 battles
      { type: 'controlRegionCount', count: 20 }, // Control at least 20 regions
      { type: 'theaterExists', enemyCountry: 'white' }, // Have active theater against Whites
    ],
  },
  {
    id: 'soviet_march',
    country: 'soviet',
    name: 'March to Victory',
    description: 'Push the offensive and liberate key territories',
    completed: false,
    claimed: false,
    rewards: { hpBonus: 20, commandPowerBonus: 3 },
    prerequisites: ['soviet_crush'],
    available: [
      { type: 'controlRegionCount', count: 35 }, // Control at least 35 regions
      { type: 'hasUnits', count: 20 }, // Have at least 20 divisions
      { type: 'enemyRegionCount', country: 'white', maxCount: 15 }, // Whites control at most 15 regions
    ],
  },
  {
    id: 'soviet_victory',
    country: 'soviet',
    name: 'Total Victory',
    description: 'Eliminate all White Army resistance and secure Soviet power',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 5, defenceBonus: 3, gameVictory: true },
    prerequisites: ['soviet_march'],
    available: [
      { type: 'enemyRegionCount', country: 'white', maxCount: 0 }, // Whites control no regions
    ],
  },
];

// White Army Mission Tree (Defense-focused: Defence > HP > Attack)
const whiteMissions: Mission[] = [
  {
    id: 'white_rally',
    country: 'white',
    name: 'Rally the Faithful',
    description: 'Gather loyal officers and volunteers to the cause',
    completed: false,
    claimed: false,
    rewards: { defenceBonus: 2 },
    prerequisites: [],
    available: [
      { type: 'hasUnits', count: 5 }, // Recruit at least 5 divisions
    ],
  },
  {
    id: 'white_foreign',
    country: 'white',
    name: 'Secure Foreign Support',
    description: 'Establish supply lines with Allied nations',
    completed: false,
    claimed: false,
    rewards: { hpBonus: 10, commandPowerBonus: 3 },
    prerequisites: ['white_rally'],
    available: [
      { type: 'controlRegionCount', count: 8 }, // Control at least 8 regions
      { type: 'hasUnits', count: 8 }, // Demonstrate military strength
    ],
  },
  {
    id: 'white_order',
    country: 'white',
    name: 'Restore Order',
    description: 'Re-establish lawful authority in liberated regions',
    completed: false,
    claimed: false,
    rewards: { productionSpeedBonus: 0.15, attackBonus: 1 },
    prerequisites: ['white_rally'],
    available: [
      { type: 'combatVictories', count: 2 }, // Win at least 2 battles
      { type: 'armyGroupCount', count: 1 }, // Have at least 1 organized army group
    ],
  },
  {
    id: 'white_break',
    country: 'white',
    name: 'Break the Red Army',
    description: 'Achieve decisive victories against Bolshevik forces',
    completed: false,
    claimed: false,
    rewards: { defenceBonus: 3, attackBonus: 2 },
    prerequisites: ['white_foreign', 'white_order'],
    available: [
      { type: 'combatVictories', count: 6 }, // Win at least 6 battles
      { type: 'controlRegionCount', count: 20 }, // Control at least 20 regions
      { type: 'theaterExists', enemyCountry: 'soviet' }, // Have active theater against Soviets
    ],
  },
  {
    id: 'white_petrograd',
    country: 'white',
    name: 'Advance on Petrograd',
    description: 'Launch the final offensive toward the revolutionary capital',
    completed: false,
    claimed: false,
    rewards: { hpBonus: 20, commandPowerBonus: 3 },
    prerequisites: ['white_break'],
    available: [
      { type: 'controlRegion', regionId: 'RU-LEN' }, // Control Leningrad Oblast (near Petrograd)
      { type: 'hasUnits', count: 25 }, // Have at least 25 divisions
      { type: 'enemyRegionCount', country: 'soviet', maxCount: 15 }, // Soviets control at most 15 regions
    ],
  },
  {
    id: 'white_victory',
    country: 'white',
    name: 'Total Victory',
    description: 'Eliminate Bolshevik resistance and restore Russia',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 3, defenceBonus: 5, gameVictory: true },
    prerequisites: ['white_petrograd'],
    available: [
      { type: 'enemyRegionCount', country: 'soviet', maxCount: 0 }, // Soviets control no regions
    ],
  },
];

// Finnish Mission Tree (Speed & Efficiency: Production > HP > Attack)
const finnishMissions: Mission[] = [
  {
    id: 'finland_independence',
    country: 'finland',
    name: 'Declare Independence',
    description: 'Secure Finnish independence from Russian control',
    completed: false,
    claimed: false,
    rewards: { productionSpeedBonus: 0.15 },
    prerequisites: [],
    available: [
      { type: 'hasUnits', count: 3 }, // Recruit initial defense forces
    ],
  },
  {
    id: 'finland_civil_war',
    country: 'finland',
    name: 'Finnish Civil War',
    description: 'Defeat the Red Guards and secure the White victory',
    completed: false,
    claimed: false,
    rewards: { hpBonus: 10, attackBonus: 1 },
    prerequisites: ['finland_independence'],
    available: [
      { type: 'combatVictories', count: 1 }, // Win at least 1 battle
      { type: 'controlRegionCount', count: 15 }, // Control most of Finland
    ],
  },
  {
    id: 'finland_german_aid',
    country: 'finland',
    name: 'German Intervention',
    description: 'Secure German military support to end the civil war',
    completed: false,
    claimed: false,
    rewards: { commandPowerBonus: 3, defenceBonus: 2 },
    prerequisites: ['finland_independence'],
    available: [
      { type: 'hasUnits', count: 6 }, // Demonstrate military capacity
      { type: 'dateAfter', date: '1918-04-01' }, // Historical German intervention
    ],
  },
  {
    id: 'finland_karelian',
    country: 'finland',
    name: 'East Karelian Uprising',
    description: 'Support the East Karelian uprising against Soviet rule',
    completed: false,
    claimed: false,
    rewards: { productionSpeedBonus: 0.20, attackBonus: 2 },
    prerequisites: ['finland_civil_war', 'finland_german_aid'],
    available: [
      { type: 'hasUnits', count: 10 }, // Have sufficient forces
      { type: 'controlRegion', regionId: 'FI-13' }, // Control North Karelia
      { type: 'theaterExists', enemyCountry: 'soviet' }, // Border Soviet territory
    ],
  },
  {
    id: 'finland_greater',
    country: 'finland',
    name: 'Greater Finland',
    description: 'Expand Finnish borders to include Karelia and Kola Peninsula',
    completed: false,
    claimed: false,
    rewards: { hpBonus: 20, commandPowerBonus: 3 },
    prerequisites: ['finland_karelian'],
    available: [
      { type: 'controlRegion', regionId: 'RU-KR' }, // Control Karelia
      { type: 'hasUnits', count: 15 }, // Strong military
    ],
  },
  {
    id: 'finland_victory',
    country: 'finland',
    name: 'Secure the North',
    description: 'Establish Finland as the dominant power in Northern Europe',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 3, defenceBonus: 3, gameVictory: true },
    prerequisites: ['finland_greater'],
    available: [
      { type: 'controlRegions', regionIds: ['FI-18', 'RU-KR', 'RU-MUR'] }, // Control key regions
      { type: 'hasUnits', count: 20 }, // Strong military presence
    ],
  },
];

// Ukrainian Mission Tree (Balanced: HP > Balanced Stats)
const ukrainianMissions: Mission[] = [
  {
    id: 'ukraine_independence',
    country: 'ukraine',
    name: 'Ukrainian People\'s Republic',
    description: 'Establish the Ukrainian People\'s Republic and secure independence',
    completed: false,
    claimed: false,
    rewards: { hpBonus: 10, attackBonus: 1 },
    prerequisites: [],
    available: [
      { type: 'hasUnits', count: 5 }, // Recruit initial defense forces
    ],
  },
  {
    id: 'ukraine_consolidate',
    country: 'ukraine',
    name: 'Consolidate Control',
    description: 'Secure control over Ukrainian territories and establish government authority',
    completed: false,
    claimed: false,
    rewards: { commandPowerBonus: 3, defenceBonus: 1 },
    prerequisites: ['ukraine_independence'],
    available: [
      { type: 'controlRegion', regionId: 'UA-30' }, // Control Kyiv
      { type: 'controlRegionCount', count: 15 }, // Control significant Ukrainian territory
    ],
  },
  {
    id: 'ukraine_rada',
    country: 'ukraine',
    name: 'Strengthen the Rada',
    description: 'Build up the Central Rada\'s authority and military capacity',
    completed: false,
    claimed: false,
    rewards: { productionSpeedBonus: 0.15, attackBonus: 1 },
    prerequisites: ['ukraine_independence'],
    available: [
      { type: 'hasUnits', count: 10 }, // Build military strength
      { type: 'controlRegionCount', count: 12 }, // Demonstrate territorial control
    ],
  },
  {
    id: 'ukraine_resist',
    country: 'ukraine',
    name: 'Resist Foreign Invasion',
    description: 'Defend Ukrainian independence against Bolshevik and White forces',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 2, defenceBonus: 2 },
    prerequisites: ['ukraine_consolidate', 'ukraine_rada'],
    available: [
      { type: 'combatVictories', count: 3 }, // Win battles against invaders
      { type: 'controlRegionCount', count: 20 }, // Hold significant territory
    ],
  },
  {
    id: 'ukraine_donbas',
    country: 'ukraine',
    name: 'Secure the Donbas',
    description: 'Control the industrial heartland of the Donbas region',
    completed: false,
    claimed: false,
    rewards: { hpBonus: 20, commandPowerBonus: 3 },
    prerequisites: ['ukraine_resist'],
    available: [
      { type: 'controlRegions', regionIds: ['UA-14', 'UA-12'] }, // Control Donetsk and Dnipropetrovsk
      { type: 'hasUnits', count: 15 }, // Strong military
    ],
  },
  {
    id: 'ukraine_victory',
    country: 'ukraine',
    name: 'Independent and Free',
    description: 'Secure full Ukrainian independence and control all Ukrainian territories',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 3, defenceBonus: 3, gameVictory: true },
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
    country: 'don',
    name: 'Don Cossack Independence',
    description: 'Establish the independent Don Cossack Republic',
    completed: false,
    claimed: false,
    rewards: { hpBonus: 10, attackBonus: 1 },
    prerequisites: [],
    available: [
      { type: 'hasUnits', count: 3 }, // Recruit initial Cossack forces
    ],
  },
  {
    id: 'don_consolidate',
    country: 'don',
    name: 'Unite the Don',
    description: 'Consolidate control over Don Cossack territories',
    completed: false,
    claimed: false,
    rewards: { commandPowerBonus: 3, defenceBonus: 1 },
    prerequisites: ['don_independence'],
    available: [
      { type: 'controlRegions', regionIds: ['RU-ROS', 'RU-VGG'] }, // Control both starting regions
      { type: 'hasUnits', count: 8 }, // Build up forces
    ],
  },
  {
    id: 'don_ataman',
    country: 'don',
    name: 'Ataman\'s Authority',
    description: 'Strengthen the Ataman\'s military and political control',
    completed: false,
    claimed: false,
    rewards: { productionSpeedBonus: 0.15, attackBonus: 1 },
    prerequisites: ['don_independence'],
    available: [
      { type: 'controlRegionCount', count: 4 }, // Demonstrate control
      { type: 'combatVictories', count: 1 }, // Win a defensive battle
    ],
  },
  {
    id: 'don_expansion',
    country: 'don',
    name: 'Expand Don Territory',
    description: 'Secure neighboring territories to protect the Don homeland',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 2, defenceBonus: 2 },
    prerequisites: ['don_consolidate', 'don_ataman'],
    available: [
      { type: 'controlRegionCount', count: 5 }, // Expand beyond starting regions
      { type: 'combatVictories', count: 3 }, // Prove military strength
    ],
  },
  {
    id: 'don_kuban',
    country: 'don',
    name: 'Alliance with Kuban',
    description: 'Forge alliance with neighboring Kuban Cossacks',
    completed: false,
    claimed: false,
    rewards: { hpBonus: 20, commandPowerBonus: 3 },
    prerequisites: ['don_expansion'],
    available: [
      { type: 'controlRegion', regionId: 'RU-KDA' }, // Control Krasnodar Krai (Kuban)
      { type: 'hasUnits', count: 15 }, // Strong military
    ],
  },
  {
    id: 'don_victory',
    country: 'don',
    name: 'Don Cossack Supremacy',
    description: 'Establish the Don Republic as a major power in the South',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 3, defenceBonus: 3, gameVictory: true },
    prerequisites: ['don_kuban'],
    available: [
      { type: 'controlRegionCount', count: 12 }, // Control significant southern territory
      { type: 'hasUnits', count: 20 }, // Strong military presence
    ],
  },
];

// German Empire Mission Tree (Expansion-focused: Attack > Production > Defence)
const germanMissions: Mission[] = [
  {
    id: 'germany_mobilize',
    country: 'germany',
    name: 'Mobilize the Imperial Army',
    description: 'Deploy German forces for eastern expansion',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 2, defenceBonus: 1 },
    prerequisites: [],
    available: [
      { type: 'hasUnits', count: 5 }, // Build initial military forces
    ],
  },
  {
    id: 'germany_ober_ost',
    country: 'germany',
    name: 'Establish Ober Ost',
    description: 'Create the Supreme Command of All German Forces in the East',
    completed: false,
    claimed: false,
    rewards: { commandPowerBonus: 3, productionSpeedBonus: 0.15 },
    prerequisites: ['germany_mobilize'],
    available: [
      { type: 'hasUnits', count: 8 },
      { type: 'armyGroupCount', count: 1 }, // Have organized command structure
    ],
  },
  {
    id: 'germany_brest_litovsk',
    country: 'germany',
    name: 'Treaty of Brest-Litovsk',
    description: 'Secure German dominance over Eastern territories through treaty with Soviets',
    completed: false,
    claimed: false,
    rewards: { hpBonus: 10, attackBonus: 1 },
    prerequisites: ['germany_mobilize'],
    available: [
      { type: 'dateAfter', date: '1918-03-01' }, // Historical treaty date: March 3, 1918
      { type: 'controlRegionCount', count: 16 }, // Control German territories
    ],
  },
  {
    id: 'germany_mitteleuropa',
    country: 'germany',
    name: 'Mitteleuropa Strategy',
    description: 'Expand German influence into Eastern Europe and the Baltics',
    completed: false,
    claimed: false,
    rewards: { productionSpeedBonus: 0.20, attackBonus: 2 },
    prerequisites: ['germany_ober_ost', 'germany_brest_litovsk'],
    available: [
      { type: 'controlRegionCount', count: 25 }, // Expand beyond Germany
      { type: 'hasUnits', count: 15 },
    ],
  },
  {
    id: 'germany_support_whites',
    country: 'germany',
    name: 'Support Anti-Bolshevik Forces',
    description: 'Aid White Army forces to maintain German strategic interests',
    completed: false,
    claimed: false,
    rewards: { commandPowerBonus: 3, defenceBonus: 2 },
    prerequisites: ['germany_brest_litovsk'],
    available: [
      { type: 'combatVictories', count: 3 }, // Win battles against Soviets
      { type: 'theaterExists', enemyCountry: 'soviet' }, // Border Soviet territory
    ],
  },
  {
    id: 'germany_baltic',
    country: 'germany',
    name: 'Baltic Dominance',
    description: 'Secure German control over the Baltic states',
    completed: false,
    claimed: false,
    rewards: { hpBonus: 20, attackBonus: 3 },
    prerequisites: ['germany_mitteleuropa', 'germany_support_whites'],
    available: [
      { type: 'controlRegions', regionIds: ['LVA', 'EE-37', 'LT-VL'] }, // Control Latvia, Estonia (Tallinn), Lithuania (Vilnius)
      { type: 'hasUnits', count: 20 },
    ],
  },
  {
    id: 'germany_victory',
    country: 'germany',
    name: 'German Imperial Hegemony',
    description: 'Establish the German Empire as the dominant power in Eastern Europe',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 5, defenceBonus: 3, gameVictory: true },
    prerequisites: ['germany_baltic'],
    available: [
      { type: 'controlRegionCount', count: 40 }, // Control significant territory
      { type: 'hasUnits', count: 30 }, // Strong military presence
      { type: 'enemyRegionCount', country: 'soviet', maxCount: 10 }, // Soviets greatly weakened
    ],
  },
];

// Bulgarian Mission Tree (Defense & Survival: Defence > HP > Attack)
const bulgarianMissions: Mission[] = [
  {
    id: 'bulgaria_mobilize',
    country: 'bulgaria',
    name: 'Maintain the Army',
    description: 'Keep Bulgarian forces mobilized on the Macedonian Front',
    completed: false,
    claimed: false,
    rewards: { defenceBonus: 2, hpBonus: 5 },
    prerequisites: [],
    available: [
      { type: 'hasUnits', count: 5 }, // Maintain standing army
    ],
  },
  {
    id: 'bulgaria_macedonian_front',
    country: 'bulgaria',
    name: 'Hold the Macedonian Front',
    description: 'Defend Bulgaria\'s positions against Allied forces in Macedonia',
    completed: false,
    claimed: false,
    rewards: { defenceBonus: 3, commandPowerBonus: 2 },
    prerequisites: ['bulgaria_mobilize'],
    available: [
      { type: 'controlRegionCount', count: 25 }, // Hold Bulgarian territories
      { type: 'combatVictories', count: 1 }, // Win defensive battle
    ],
  },
  {
    id: 'bulgaria_war_weariness',
    country: 'bulgaria',
    name: 'Manage War Weariness',
    description: 'Address growing unrest and food shortages among the population',
    completed: false,
    claimed: false,
    rewards: { productionSpeedBonus: 0.10, hpBonus: 10 },
    prerequisites: ['bulgaria_mobilize'],
    available: [
      { type: 'hasUnits', count: 8 }, // Maintain military
      { type: 'dateAfter', date: '1918-01-01' }, // Winter 1918 hardships
    ],
  },
  {
    id: 'bulgaria_alliance',
    country: 'bulgaria',
    name: 'Central Powers Alliance',
    description: 'Coordinate with Germany and Austria-Hungary on the Balkan front',
    completed: false,
    claimed: false,
    rewards: { attackBonus: 2, commandPowerBonus: 2 },
    prerequisites: ['bulgaria_macedonian_front', 'bulgaria_war_weariness'],
    available: [
      { type: 'combatVictories', count: 3 }, // Prove military value
      { type: 'hasUnits', count: 12 }, // Strong military
    ],
  },
  {
    id: 'bulgaria_survival',
    country: 'bulgaria',
    name: 'National Survival',
    description: 'Navigate the collapsing Central Powers and seek an honorable peace',
    completed: false,
    claimed: false,
    rewards: { defenceBonus: 4, hpBonus: 20 },
    prerequisites: ['bulgaria_alliance'],
    available: [
      { type: 'dateAfter', date: '1918-09-01' }, // September 1918 - historical context
      { type: 'controlRegionCount', count: 28 }, // Hold all Bulgarian territories
      { type: 'hasUnits', count: 15 }, // Strong defense
    ],
  },
  {
    id: 'bulgaria_victory',
    country: 'bulgaria',
    name: 'Survive the Great War',
    description: 'Preserve Bulgarian independence and sovereignty through the crisis',
    completed: false,
    claimed: false,
    rewards: { defenceBonus: 5, attackBonus: 2, gameVictory: true },
    prerequisites: ['bulgaria_survival'],
    available: [
      { type: 'controlRegionCount', count: 28 }, // Hold all territories
      { type: 'hasUnits', count: 20 }, // Strong military presence
    ],
  },
];

// Combined missions for all countries
export const initialMissions: Mission[] = [...sovietMissions, ...whiteMissions, ...finnishMissions, ...ukrainianMissions, ...donMissions, ...germanMissions, ...bulgarianMissions];
