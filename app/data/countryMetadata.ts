import { CountryId } from '../types/game';

/**
 * Centralized country configuration
 * This is the single source of truth for all country-related metadata
 */

export interface CountryMetadata {
  id: CountryId;
  /** Official/full country name */
  name: string;
  /** Display name for combat contexts (short, action-oriented) */
  combatName: string;
  /** Flag image path */
  flag: string;
  /** Primary color (hex) */
  color: string;
  /** Short adjective form (e.g., "Finnish", "Soviet") */
  adjective: string;
  /** First army group name */
  firstArmyGroupName: string;
  /** Division name prefix */
  divisionPrefix: string;
  /** Whether this country can be selected by players (defaults to true) */
  selectable?: boolean;
  /** Core regions that belong to this country */
  coreRegions?: string[];
}

/**
 * Complete country metadata registry
 */
export const COUNTRY_METADATA: Record<CountryId, CountryMetadata> = {
  soviet: {
    id: 'soviet',
    name: 'Soviet Russia',
    combatName: 'Red Army',
    flag: '/images/flags/soviet.svg',
    color: '#CC0000',
    adjective: 'Soviet',
    firstArmyGroupName: 'Red Army Group',
    divisionPrefix: 'Red Guard',
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
  white: {
    id: 'white',
    name: 'White Army',
    combatName: 'White Army',
    flag: '/images/flags/white.svg',
    color: '#0d3b0d',
    adjective: 'White',
    firstArmyGroupName: 'Volunteer Army',
    divisionPrefix: 'White Guard',
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
  finland: {
    id: 'finland',
    name: 'Finland',
    combatName: 'Finnish Army',
    flag: '/images/flags/finland.svg',
    color: '#FFFFFF',
    adjective: 'Finnish',
    firstArmyGroupName: 'Finnish Defense Forces',
    divisionPrefix: 'Finnish Guard',
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
  ukraine: {
    id: 'ukraine',
    name: 'Ukraine',
    combatName: 'Ukrainian Army',
    flag: '/images/flags/ukraine.svg',
    color: '#0057B7',
    adjective: 'Ukrainian',
    firstArmyGroupName: 'Ukrainian Army',
    divisionPrefix: 'Ukrainian Guard',
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
  don: {
    id: 'don',
    name: 'Don Republic',
    combatName: 'Don Cossacks',
    flag: '/images/flags/don.svg',
    color: '#FFD700',
    adjective: 'Don',
    firstArmyGroupName: 'Don Cossack Host',
    divisionPrefix: 'Don Cossack',
    selectable: false,
    coreRegions: [
      // Don Cossack homeland
      'RU-ROS', // Rostov Oblast - Capital (Novocherkassk)
      'RU-VGG', // Volgograd Oblast - Don Cossack lands
      'RU-KDA', // Krasnodar Krai - Kuban Cossack alliance
      'RU-STA', // Stavropol Krai
      'RU-AST', // Astrakhan Oblast
    ],
  },
  fswr: {
    id: 'fswr',
    name: "Finnish Socialist Workers' Republic",
    combatName: 'Red Guards',
    flag: '/images/flags/fswr.svg',
    color: '#CC0000',
    adjective: 'Red Guard',
    firstArmyGroupName: 'Red Guard Army Group',
    divisionPrefix: 'Red Guard',
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
  iskolat: {
    id: 'iskolat',
    name: 'Iskolat (Latvian Soviet Republic)',
    combatName: 'Red Latvian Riflemen',
    flag: '/images/flags/iskolat.svg',
    color: '#8B0000',
    adjective: 'Iskolat',
    firstArmyGroupName: 'Red Latvian Riflemen',
    divisionPrefix: 'Latvian Guard',
    selectable: false,
    coreRegions: [
      // Latvia
      'LVA', // Latvia (ADM0)
    ],
  },
  neutral: {
    id: 'neutral',
    name: 'Neutral',
    combatName: 'Neutral Forces',
    flag: '',
    color: '#808080',
    adjective: 'Independent',
    firstArmyGroupName: '1st Army',
    divisionPrefix: 'Militia',
    selectable: false,
  },
  foreign: {
    id: 'foreign',
    name: 'Foreign',
    combatName: 'Foreign Forces',
    flag: '',
    color: '#4A90D9',
    adjective: 'Foreign',
    firstArmyGroupName: 'Expeditionary Force',
    divisionPrefix: 'Foreign Legion',
    selectable: false,
  },
  germany: {
    id: 'germany',
    name: 'German Empire',
    combatName: 'Imperial German Army',
    flag: '/images/flags/germany.svg',
    color: '#1a1a1a',
    adjective: 'German',
    firstArmyGroupName: 'Imperial German Army',
    divisionPrefix: 'German Guard',
    selectable: false,
  },
  bulgaria: {
    id: 'bulgaria',
    name: 'Tsardom of Bulgaria',
    combatName: 'Bulgarian Army',
    flag: '/images/flags/bulgaria.svg',
    color: '#00966E',
    adjective: 'Bulgarian',
    firstArmyGroupName: 'Bulgarian Army',
    divisionPrefix: 'Bulgarian Guard',
    selectable: false,
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
  poland: {
    id: 'poland',
    name: 'Kingdom of Poland',
    combatName: 'Polnische Wehrmacht',
    flag: '/images/flags/poland.svg',
    color: '#DC143C',
    adjective: 'Polish',
    firstArmyGroupName: 'Polnische Wehrmacht',
    divisionPrefix: 'Polish Guard',
    selectable: false,
    coreRegions: [
      // Polish voivodeships
      'PL-DS', // Lower Silesian
      'PL-KP', // Kuyavian-Pomeranian
      'PL-LB', // Lubusz
      'PL-LD', // Łódź
      'PL-LU', // Lublin
      'PL-MA', // Lesser Poland (Małopolskie)
      'PL-MZ', // Masovian (Warsaw) - Capital
      'PL-OP', // Opole
      'PL-PD', // Pomeranian
      'PL-PK', // Podkarpackie
      'PL-PM', // Pomeranian
      'PL-SK', // Świętokrzyskie
      'PL-SL', // Silesian
      'PL-WN', // Warmian-Masurian
      'PL-WP', // Greater Poland (Wielkopolskie)
      'PL-ZP', // West Pomeranian
    ],
  },
  austriahungary: {
    id: 'austriahungary',
    name: 'Austria-Hungary',
    combatName: 'Austro-Hungarian Army',
    flag: '/images/flags/austriahungary.svg',
    color: '#B8860B',
    adjective: 'Austro-Hungarian',
    firstArmyGroupName: 'k.u.k. Armee',
    divisionPrefix: 'Imperial Division',
    selectable: false,
    coreRegions: [
      // Galicia, Bukovina and Transcarpathia
      'UA-46', // Lviv
      'UA-61', // Ternopil
      'UA-26', // Ivano-Frankivsk
      'UA-77', // Chernivtsi
      'UA-21', // Zakarpattia
      // Central territories
      'AT-9', // Vienna
      'HU-PE', // Budapest
      'CZ-10', // Prague
    ],
  },
  romania: {
    id: 'romania',
    name: 'Kingdom of Romania',
    combatName: 'Romanian Army',
    flag: '/images/flags/romania.svg',
    color: '#003399',
    adjective: 'Romanian',
    firstArmyGroupName: '1st Romanian Army',
    divisionPrefix: 'Romanian',
    selectable: false,
    coreRegions: [
      // Historical regions of Romania and Bessarabia
      'RO-B',  // Bucharest - Capital
      'RO-IS', // Iași - Wartime capital
      'RO-CT', // Constanța
      'RO-CJ', // Cluj
      'RO-TM', // Timișoara
      'MD-BA', // Bălți
      'MD-CU', // Chișinău
    ],
  },
  greece: {
    id: 'greece',
    name: 'Kingdom of Greece',
    combatName: 'Greek Army',
    flag: '/images/flags/greece.svg',
    color: '#0D5EAF',
    adjective: 'Greek',
    firstArmyGroupName: 'Hellenic Army',
    divisionPrefix: 'Greek',
    selectable: false,
    coreRegions: [
      // Greece did not control territory in Russia, but participated in Allied intervention
      // in southern Russia (primarily around Crimea and Black Sea coast)
    ],
  },
  ottoman: {
    id: 'ottoman',
    name: 'Ottoman Empire',
    combatName: 'Ottoman Army',
    flag: '/images/flags/ottoman.svg',
    color: '#C7002B',
    adjective: 'Ottoman',
    firstArmyGroupName: 'Ottoman Army',
    divisionPrefix: 'Ottoman',
    selectable: false,
    coreRegions: [
      // Historical Ottoman territories as of November 1917
      // The Ottoman Empire was in severe decline but still controlled:
      // Anatolia (core Turkish heartland)
      // Palestine and Syria (under attack by British)
      // Mesopotamia (Iraq - under attack by British)
      // Note: Exact implementation depends on map regions available
      // The Ottoman Empire existed as a non-playable historical faction
      // that could interact diplomatically and militarily with players
    ],
  },
  serbia: {
    id: 'serbia',
    name: 'Kingdom of Serbia',
    combatName: 'Serbian Army',
    flag: '/images/flags/serbia.svg',
    color: '#ED4135',
    adjective: 'Serbian',
    firstArmyGroupName: 'Serbian Army Group',
    divisionPrefix: 'Serbian Guard',
    selectable: false,
    coreRegions: [
      // Historical Serbian territories in the Balkans
      // Serbia itself is not in the game map (Russian Civil War focus), but metadata
      // is provided for potential Balkan theater integration or historical context
    ],
  },
};
