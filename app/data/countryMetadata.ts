/* eslint-disable max-lines */
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
       'RU-MOW', 'RU-MOS', 'RU-SPE', 'RU-LEN', 'RU-TVE', 'RU-IVA', 'RU-VLA', 'RU-KOS',
       'RU-YAR', 'RU-NIZ', 'RU-VOR', 'RU-BEL', 'RU-SAM', 'RU-SAR', 'RU-ULY', 'RU-TA',
       'RU-SVE', 'RU-CHE', 'RU-PER',
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
       'RU-ROS', 'RU-KDA', 'RU-STA', 'RU-VGG', 'RU-OMS', 'RU-TYU', 'RU-NVS', 'RU-TOM',
       'RU-IRK', 'RU-ARK', 'RU-VLG', 'RU-PRI', 'RU-KHA',
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
       'FI-01', 'FI-02', 'FI-03', 'FI-04', 'FI-05', 'FI-06', 'FI-07', 'FI-08', 'FI-09',
       'FI-10', 'FI-11', 'FI-12', 'FI-13', 'FI-14', 'FI-15', 'FI-16', 'FI-17', 'FI-18',
       'FI-19', 'RU-KR',
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
       'UA-30', 'UA-32', 'UA-71', 'UA-74', 'UA-77', 'UA-12', 'UA-14', 'UA-63', 'UA-65',
       'UA-18', 'UA-61', 'UA-09', 'UA-46', 'UA-48', 'UA-51', 'UA-53', 'UA-56', 'UA-59',
       'UA-05', 'UA-07', 'UA-21', 'UA-23', 'UA-26', 'UA-43',
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
     coreRegions: ['RU-ROS', 'RU-VGG', 'RU-KDA', 'RU-STA', 'RU-AST'],
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
  dkr: {
    id: 'dkr',
    name: 'Donetsk–Krivoy Rog Soviet Republic',
    combatName: 'Donetsk-Krivoy Rog Red Guards',
    flag: '/images/flags/dkr.svg',
    color: '#A52A2A',
    adjective: 'DKR',
    firstArmyGroupName: 'Southern Red Guard',
    divisionPrefix: 'Industrial Guard',
    selectable: false,
    coreRegions: [
      // Industrial heartland of eastern Ukraine - Donbas and Krivoy Rog
      'UA-63', // Kharkiv Oblast (capital: Kharkiv)
      'UA-12', // Dnipropetrovsk Oblast (includes Krivoy Rog)
      'UA-14', // Donetsk Oblast (Donbas coal basin)
      'UA-09', // Luhansk Oblast (Donbas)
      'UA-65', // Kherson Oblast (southern parts)
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
    lithuania: {
      id: 'lithuania',
      name: 'Kingdom of Lithuania',
      combatName: 'Lithuanian Army',
      flag: '/images/flags/lithuania.svg',
      color: '#FFCC00',
      adjective: 'Lithuanian',
      firstArmyGroupName: 'Lithuanian Defense Forces',
      divisionPrefix: 'Lithuanian Guard',
      selectable: false,
      coreRegions: [
        // Historical Lithuanian territories (SSR regions)
        // These represent core Lithuanian ethnic territories during the Civil War period
        // Vilnius region, Kaunas region, and surrounding areas where Lithuanians held control
        // Note: Specific GeoJSON IDs would need to be mapped to Lithuanian regions on the game map
        // For now, using placeholder pattern - update with actual map region IDs during initial state setup
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
    },
    albania: {
      id: 'albania',
      name: 'Principality of Albania',
      combatName: 'Albanian Forces',
      flag: '/images/flags/albania.svg',
      color: '#E41E20',
      adjective: 'Albanian',
      firstArmyGroupName: 'Albanian Army Group',
      divisionPrefix: 'Albanian Guard',
      selectable: false,
    },
    persia: {
      id: 'persia',
      name: 'Qajar Iran (Persia)',
      combatName: 'Persian Gendarmerie',
      flag: '/images/flags/persia.svg',
      color: '#239f40',
      adjective: 'Persian',
      firstArmyGroupName: 'Persian Cossack Brigade',
      divisionPrefix: 'Persian',
      selectable: false,
      coreRegions: [
        // All 32 Iranian provinces (Qajar Persia)
        '17685810B10287014873220', '17685810B13889842409055', '17685810B1629292304739',
        '17685810B16876171097638', '17685810B1706611058442', '17685810B18940918043543',
        '17685810B20487167396081', '17685810B23440170667410', '17685810B3064942505232',
        '17685810B30738859401369', '17685810B38369866596405', '17685810B43663780619119',
        '17685810B5034457967489', '17685810B50760377364469', '17685810B57153227405324',
        '17685810B58703616021829', '17685810B60472007491578', '17685810B6126582797818',
        '17685810B64585898126645', '17685810B64963005891064', '17685810B65996934059620',
        '17685810B67379877863322', '17685810B68217123081047', '17685810B7382218659393',
        '17685810B76974127550435', '17685810B81741200709170', '17685810B83340129779815',
        '17685810B84447356108506', '17685810B90334917415902', '17685810B90918579754309',
        '17685810B98247647047819', '17685810B99097995033086',
      ],
    },
     ukrainesoviet: {
       id: 'ukrainesoviet',
       name: "Ukrainian People's Republic of Soviets",
       combatName: 'Red Ukrainian Forces',
       flag: '/images/flags/ukrainesoviet.svg',
       color: '#8B0000',
       adjective: 'Soviet Ukrainian',
       firstArmyGroupName: 'Soviet Ukrainian Army',
       divisionPrefix: 'Red Ukrainian Guard',
       selectable: false,
       coreRegions: [
         // Eastern Ukraine - industrial regions where Bolsheviks had support
         // Historically controlled Kharkiv (capital) and surrounding eastern regions
         'UA-63', // Kharkiv - Capital of Soviet Ukrainian Republic
         'UA-65', // Luhansk
         'UA-14', // Donetsk
         'UA-53', // Poltava
         'UA-59', // Sumy
         'UA-12', // Dnipropetrovsk
         'UA-32', // Kyiv - contested, historically taken by force
       ],
     },
      balticdutchy: {
        id: 'balticdutchy',
        name: 'United Baltic Duchy',
        combatName: 'Baltische Landeswehr',
        flag: '/images/flags/balticdutchy.svg',
        color: '#4B7BA7',
        adjective: 'Baltic',
        firstArmyGroupName: 'Baltische Landeswehr',
        divisionPrefix: 'Baltic Guard',
        selectable: false,
        coreRegions: [
          // Estonia, Latvia (including Riga), and Courland
          // Based on historical territories controlled in late 1917/early 1918
          'EE-01', // Estonia
          'EE-02', // Estonia
          'EE-03', // Estonia
          'LVA', // Latvia (entire country as administrative unit)
        ],
      },
      stavropol: {
        id: 'stavropol',
        name: 'Stavropol Soviet Republic',
        combatName: 'Stavropol Red Guards',
        flag: '/images/flags/stavropol.svg',
        color: '#CE1126',
        adjective: 'Stavropol Soviet',
        firstArmyGroupName: 'Stavropol Red Guard',
        divisionPrefix: 'Stavropol Guard',
        selectable: false,
        coreRegions: [
          // Stavropol Governorate territory - core Soviet territory in the North Caucasus
          // Established January 1, 1918 - dissolved July 7, 1918 (merged into North Caucasian SR)
          'RU-STA', // Stavropol Krai - historical heart of the republic
        ],
      },
      odessa: {
        id: 'odessa',
        name: 'Odessa Soviet Republic',
        combatName: 'Odessa Red Guards',
        flag: '/images/flags/odessa.svg',
        color: '#DC143C',
        adjective: 'Odessa Soviet',
        firstArmyGroupName: 'Odessa Red Guard',
        divisionPrefix: 'Odessa Guard',
        selectable: false,
        coreRegions: [
          // Odessa Soviet Republic territory - formed from Kherson and Bessarabia Governorates
          // Proclaimed January 30, 1918 (January 17, O.S.) - dissolved March 13, 1918
          // Controlled southern Ukrainian territories around Odessa
          'UA-65', // Kherson Oblast (includes Odessa)
          'MD-01', // Moldova (Bessarabia regions)
        ],
      },
       terek: {
         id: 'terek',
         name: 'Terek Soviet Republic',
         combatName: 'Terek Red Guards',
         flag: '/images/flags/terek.svg',
         color: '#B22222',
         adjective: 'Terek Soviet',
         firstArmyGroupName: 'Terek Red Army',
         divisionPrefix: 'Terek Guard',
         selectable: false,
         coreRegions: [
           'RU-CE', // Chechnya
           'RU-IN', // Ingushetia
           'RU-SE', // North Ossetia
           'RU-KB', // Kabardino-Balkaria
         ],
       },
       taurida: {
         id: 'taurida',
         name: 'Taurida Soviet Socialist Republic',
         combatName: 'Taurida Red Guards',
         flag: '/images/flags/taurida.svg',
         color: '#8B0000',
         adjective: 'Taurida Soviet',
         firstArmyGroupName: 'Taurida Red Army',
         divisionPrefix: 'Taurida Guard',
         selectable: false,
         coreRegions: [
           // Crimea and surrounding Taurida regions - established March 19-21, 1918
           // Historical territories of Taurida Soviet Socialist Republic
           'RU-Cr', // Crimea (primary territory of Taurida)
         ],
       },
};
