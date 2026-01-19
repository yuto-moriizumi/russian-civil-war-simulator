/* eslint-disable max-lines */
import { CountryId } from "../types/game";

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
    id: "soviet",
    name: "Soviet Russia",
    combatName: "Red Army",
    flag: "/images/flags/soviet.svg",
    color: "#CC0000",
    adjective: "Soviet",
    firstArmyGroupName: "Red Army Group",
    divisionPrefix: "Red Guard",
    coreRegions: [
              'RU-BEL', 'RU-CHE', 'RU-IVA', 'RU-KOS', 'RU-LEN', 'RU-MOS', 'RU-MOW', 'RU-NIZ',
              'RU-PER', 'RU-SAM', 'RU-SAR', 'RU-SPE', 'RU-SVE', 'RU-TA', 'RU-TVE', 'RU-ULY',
              'RU-VLA', 'RU-VOR', 'RU-YAR',
            ],
  },
  white: {
    id: "white",
    name: "White Army",
    combatName: "White Army",
    flag: "/images/flags/white.svg",
    color: "#0d3b0d",
    adjective: "White",
    firstArmyGroupName: "Volunteer Army",
    divisionPrefix: "White Guard",
    coreRegions: [
              'RU-ARK', 'RU-IRK', 'RU-KDA', 'RU-KHA', 'RU-NVS', 'RU-OMS', 'RU-PRI', 'RU-ROS',
              'RU-STA', 'RU-TOM', 'RU-TYU', 'RU-VGG', 'RU-VLG',
            ],
  },
  finland: {
    id: "finland",
    name: "Finland",
    combatName: "Finnish Army",
    flag: "/images/flags/finland.svg",
    color: "#FFFFFF",
    adjective: "Finnish",
    firstArmyGroupName: "Finnish Defense Forces",
    divisionPrefix: "Finnish Guard",
    coreRegions: [
              'FI-01', 'FI-02', 'FI-03', 'FI-04', 'FI-05', 'FI-06', 'FI-07', 'FI-08',
              'FI-09', 'FI-10', 'FI-11', 'FI-12', 'FI-13', 'FI-14', 'FI-15', 'FI-16',
              'FI-17', 'FI-18', 'FI-19', 'RU-KR',
            ],
  },
  ukraine: {
    id: "ukraine",
    name: "Ukraine",
    combatName: "Ukrainian Army",
    flag: "/images/flags/ukraine.svg",
    color: "#0057B7",
    adjective: "Ukrainian",
    firstArmyGroupName: "Ukrainian Army",
    divisionPrefix: "Ukrainian Guard",
    coreRegions: [
              'UA-05', 'UA-07', 'UA-09', 'UA-12', 'UA-14', 'UA-18', 'UA-21', 'UA-23',
              'UA-26', 'UA-30', 'UA-32', 'UA-43', 'UA-46', 'UA-48', 'UA-51', 'UA-53',
              'UA-56', 'UA-59', 'UA-61', 'UA-63', 'UA-65', 'UA-71', 'UA-74', 'UA-77',
            ],
  },
  don: {
    id: "don",
    name: "Don Republic",
    combatName: "Don Cossacks",
    flag: "/images/flags/don.svg",
    color: "#FFD700",
    adjective: "Don",
    firstArmyGroupName: "Don Cossack Host",
    divisionPrefix: "Don Cossack",
    selectable: false,
    coreRegions: [
              'RU-AST', 'RU-KDA', 'RU-ROS', 'RU-STA', 'RU-VGG',
            ],
  },
  fswr: {
    id: "fswr",
    name: "Finnish Socialist Workers' Republic",
    combatName: "Red Guards",
    flag: "/images/flags/fswr.svg",
    color: "#CC0000",
    adjective: "Red Guard",
    firstArmyGroupName: "Red Guard Army Group",
    divisionPrefix: "Red Guard",
    selectable: false,
    coreRegions: [
              'FI-06', 'FI-09', 'FI-11', 'FI-16', 'FI-18',
            ],
  },
  iskolat: {
    id: "iskolat",
    name: "Iskolat (Latvian Soviet Republic)",
    combatName: "Red Latvian Riflemen",
    flag: "/images/flags/iskolat.svg",
    color: "#8B0000",
    adjective: "Iskolat",
    firstArmyGroupName: "Red Latvian Riflemen",
    divisionPrefix: "Latvian Guard",
    selectable: false,
    coreRegions: [
              'LVA',
            ],
  },
  dkr: {
    id: "dkr",
    name: "Donetsk–Krivoy Rog Soviet Republic",
    combatName: "Donetsk-Krivoy Rog Red Guards",
    flag: "/images/flags/dkr.svg",
    color: "#A52A2A",
    adjective: "DKR",
    firstArmyGroupName: "Southern Red Guard",
    divisionPrefix: "Industrial Guard",
    selectable: false,
    coreRegions: [
              'UA-09', 'UA-12', 'UA-14', 'UA-63', 'UA-65',
            ],
  },
  neutral: {
    id: "neutral",
    name: "Neutral",
    combatName: "Neutral Forces",
    flag: "",
    color: "#808080",
    adjective: "Independent",
    firstArmyGroupName: "1st Army",
    divisionPrefix: "Militia",
    selectable: false,
    coreRegions: [],
  },
  foreign: {
    id: "foreign",
    name: "Foreign",
    combatName: "Foreign Forces",
    flag: "",
    color: "#4A90D9",
    adjective: "Foreign",
    firstArmyGroupName: "Expeditionary Force",
    divisionPrefix: "Foreign Legion",
    selectable: false,
    coreRegions: [],
  },
  germany: {
    id: "germany",
    name: "German Empire",
    combatName: "Imperial German Army",
    flag: "/images/flags/germany.svg",
    color: "#1a1a1a",
    adjective: "German",
    firstArmyGroupName: "Imperial German Army",
    divisionPrefix: "German Guard",
    selectable: false,
    coreRegions: [],
  },
  bulgaria: {
    id: "bulgaria",
    name: "Tsardom of Bulgaria",
    combatName: "Bulgarian Army",
    flag: "/images/flags/bulgaria.svg",
    color: "#00966E",
    adjective: "Bulgarian",
    firstArmyGroupName: "Bulgarian Army",
    divisionPrefix: "Bulgarian Guard",
    selectable: false,
    coreRegions: [
              'BG-01', 'BG-02', 'BG-03', 'BG-04', 'BG-05', 'BG-06', 'BG-07', 'BG-08',
              'BG-09', 'BG-10', 'BG-11', 'BG-12', 'BG-13', 'BG-14', 'BG-15', 'BG-16',
              'BG-17', 'BG-18', 'BG-19', 'BG-20', 'BG-21', 'BG-22', 'BG-23', 'BG-24',
              'BG-25', 'BG-26', 'BG-27', 'BG-28',
            ],
  },
  poland: {
    id: "poland",
    name: "Kingdom of Poland",
    combatName: "Polnische Wehrmacht",
    flag: "/images/flags/poland.svg",
    color: "#DC143C",
    adjective: "Polish",
    firstArmyGroupName: "Polnische Wehrmacht",
    divisionPrefix: "Polish Guard",
    selectable: false,
    coreRegions: [
              'PL-DS', 'PL-KP', 'PL-LB', 'PL-LD', 'PL-LU', 'PL-MA', 'PL-MZ', 'PL-OP',
              'PL-PD', 'PL-PK', 'PL-PM', 'PL-SK', 'PL-SL', 'PL-WN', 'PL-WP', 'PL-ZP',
            ],
  },
  austriahungary: {
    id: "austriahungary",
    name: "Austria-Hungary",
    combatName: "Austro-Hungarian Army",
    flag: "/images/flags/austriahungary.svg",
    color: "#B8860B",
    adjective: "Austro-Hungarian",
    firstArmyGroupName: "k.u.k. Armee",
    divisionPrefix: "Imperial Division",
    selectable: false,
    coreRegions: [
              'AT-9', 'CZ-10', 'HU-PE', 'UA-21', 'UA-26', 'UA-46', 'UA-61', 'UA-77',
            ],
  },
  romania: {
    id: "romania",
    name: "Kingdom of Romania",
    combatName: "Romanian Army",
    flag: "/images/flags/romania.svg",
    color: "#003399",
    adjective: "Romanian",
    firstArmyGroupName: "1st Romanian Army",
    divisionPrefix: "Romanian",
    selectable: false,
    coreRegions: [
              'MD-BA', 'MD-CU', 'RO-B', 'RO-CJ', 'RO-CT', 'RO-IS', 'RO-TM',
            ],
  },
  greece: {
    id: "greece",
    name: "Kingdom of Greece",
    combatName: "Greek Army",
    flag: "/images/flags/greece.svg",
    color: "#0D5EAF",
    adjective: "Greek",
    firstArmyGroupName: "Hellenic Army",
    divisionPrefix: "Greek",
    selectable: false,
    coreRegions: [],
  },
  lithuania: {
    id: "lithuania",
    name: "Kingdom of Lithuania",
    combatName: "Lithuanian Army",
    flag: "/images/flags/lithuania.svg",
    color: "#FFCC00",
    adjective: "Lithuanian",
    firstArmyGroupName: "Lithuanian Defense Forces",
    divisionPrefix: "Lithuanian Guard",
    selectable: false,
    coreRegions: [],
  },
  ottoman: {
    id: "ottoman",
    name: "Ottoman Empire",
    combatName: "Ottoman Army",
    flag: "/images/flags/ottoman.svg",
    color: "#C7002B",
    adjective: "Ottoman",
    firstArmyGroupName: "Ottoman Army",
    divisionPrefix: "Ottoman",
    selectable: false,
    coreRegions: [],
  },
  serbia: {
    id: "serbia",
    name: "Kingdom of Serbia",
    combatName: "Serbian Army",
    flag: "/images/flags/serbia.svg",
    color: "#ED4135",
    adjective: "Serbian",
    firstArmyGroupName: "Serbian Army Group",
    divisionPrefix: "Serbian Guard",
    selectable: false,
    coreRegions: [],
  },
  albania: {
    id: "albania",
    name: "Principality of Albania",
    combatName: "Albanian Forces",
    flag: "/images/flags/albania.svg",
    color: "#E41E20",
    adjective: "Albanian",
    firstArmyGroupName: "Albanian Army Group",
    divisionPrefix: "Albanian Guard",
    selectable: false,
    coreRegions: [],
  },
  persia: {
    id: "persia",
    name: "Qajar Iran (Persia)",
    combatName: "Persian Gendarmerie",
    flag: "/images/flags/persia.svg",
    color: "#239f40",
    adjective: "Persian",
    firstArmyGroupName: "Persian Cossack Brigade",
    divisionPrefix: "Persian",
    selectable: false,
    coreRegions: [
              '17685810B10287014873220', '17685810B13889842409055', '17685810B1629292304739', '17685810B16876171097638', '17685810B1706611058442', '17685810B18940918043543', '17685810B20487167396081', '17685810B23440170667410',
              '17685810B3064942505232', '17685810B30738859401369', '17685810B38369866596405', '17685810B43663780619119', '17685810B5034457967489', '17685810B50760377364469', '17685810B57153227405324', '17685810B58703616021829',
              '17685810B60472007491578', '17685810B6126582797818', '17685810B64585898126645', '17685810B64963005891064', '17685810B65996934059620', '17685810B67379877863322', '17685810B68217123081047', '17685810B7382218659393',
              '17685810B76974127550435', '17685810B81741200709170', '17685810B83340129779815', '17685810B84447356108506', '17685810B90334917415902', '17685810B90918579754309', '17685810B98247647047819', '17685810B99097995033086',
            ],
  },
  ukrainesoviet: {
    id: "ukrainesoviet",
    name: "Ukrainian People's Republic of Soviets",
    combatName: "Red Ukrainian Forces",
    flag: "/images/flags/ukrainesoviet.svg",
    color: "#8B0000",
    adjective: "Soviet Ukrainian",
    firstArmyGroupName: "Soviet Ukrainian Army",
    divisionPrefix: "Red Ukrainian Guard",
    selectable: false,
    coreRegions: [
              'UA-12', 'UA-14', 'UA-32', 'UA-53', 'UA-59', 'UA-63', 'UA-65',
            ],
  },
  balticdutchy: {
    id: "balticdutchy",
    name: "United Baltic Duchy",
    combatName: "Baltische Landeswehr",
    flag: "/images/flags/balticdutchy.svg",
    color: "#4B7BA7",
    adjective: "Baltic",
    firstArmyGroupName: "Baltische Landeswehr",
    divisionPrefix: "Baltic Guard",
    selectable: false,
    coreRegions: [
              'EE-01', 'EE-02', 'EE-03', 'LVA',
            ],
  },
  stavropol: {
    id: "stavropol",
    name: "Stavropol Soviet Republic",
    combatName: "Stavropol Red Guards",
    flag: "/images/flags/stavropol.svg",
    color: "#CE1126",
    adjective: "Stavropol Soviet",
    firstArmyGroupName: "Stavropol Red Guard",
    divisionPrefix: "Stavropol Guard",
    selectable: false,
    coreRegions: [
              'RU-STA',
            ],
  },
  odessa: {
    id: "odessa",
    name: "Odessa Soviet Republic",
    combatName: "Odessa Red Guards",
    flag: "/images/flags/odessa.svg",
    color: "#DC143C",
    adjective: "Odessa Soviet",
    firstArmyGroupName: "Odessa Red Guard",
    divisionPrefix: "Odessa Guard",
    selectable: false,
    coreRegions: [
              'MD-01', 'UA-65',
            ],
  },
  terek: {
    id: "terek",
    name: "Terek Soviet Republic",
    combatName: "Terek Red Guards",
    flag: "/images/flags/terek.svg",
    color: "#B22222",
    adjective: "Terek Soviet",
    firstArmyGroupName: "Terek Red Army",
    divisionPrefix: "Terek Guard",
    selectable: false,
    coreRegions: [
              'RU-CE', 'RU-IN', 'RU-KB', 'RU-SE',
            ],
  },
   taurida: {
     id: "taurida",
     name: "Taurida Soviet Socialist Republic",
     combatName: "Taurida Red Guards",
     flag: "/images/flags/taurida.svg",
     color: "#8B0000",
     adjective: "Taurida Soviet",
     firstArmyGroupName: "Taurida Red Army",
     divisionPrefix: "Taurida Guard",
     selectable: false,
     coreRegions: [
               'RU-Cr',
             ],
   },
   /**
    * Don Soviet Republic (March-May 1918)
    * Historical Context: Proclaimed after the retreat of the Volunteer Army from Rostov.
    * Controlled the Don region until overthrown by the Don Cossack revolt and German advance.
    * Relationships: 
    * - War with 'white' (Volunteer Army) and 'don' (Don Republic/Don Cossacks).
    * - Opposed by 'germany' (historical German intervention in May 1918).
    * Initial State Suggestion:
    * - Appears around March 1918.
    * - Core regions: RU-ROS, RU-VGG, RU-AST.
    * - Starting units: Moderate Red Guard strength in Rostov and surrounding areas.
    */
   donsoviets: {
     id: "donsoviets",
     name: "Don Soviet Republic",
     combatName: "Don Red Army",
     flag: "/images/flags/donsoviets.svg",
     color: "#DC143C",
     adjective: "Don Soviet",
     firstArmyGroupName: "Don Soviet Army",
     divisionPrefix: "Don Soviet Guard",
     selectable: false,
     coreRegions: [
               'RU-ROS', 'RU-VGG', 'RU-AST',
             ],
   },
};
