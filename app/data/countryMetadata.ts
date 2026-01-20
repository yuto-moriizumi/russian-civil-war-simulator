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
  /**
   * Siberian Republic (July-November 1918)
   * Historical Context: Short-lived regionalist state formed by the Provisional Siberian Government
   * after the July 4, 1918 Declaration of Independence in Omsk. Intended to secure Siberian autonomy
   * while coordinating anti-Bolshevik forces, it merged into the Provisional All-Russian Government
   * on September 23, 1918 and formally disestablished on November 3, 1918.
   *
   * Key Historical Events:
   * - July 4, 1918: Declaration of Independence of Siberia (Omsk)
   * - July 1918: Provisional Siberian Government consolidates control
   * - September 23, 1918: Joins Provisional All-Russian Government (Ufa Directory)
   * - November 3, 1918: Formal self-liquidation, absorbed into White Russian State
   *
   * Diplomatic & Military Context:
   * - Core anti-Bolshevik state, aligned with White Movement
   * - Conflict with Soviet Russia and Red partisan forces in Siberia
   * - Allied/merged with White Russian State under Kolchak
   * - Relied on Siberian Army (tens of thousands of troops) and regional militias
   *
   * Game Configuration Notes:
   * - Recommended appearance: mid-1918 via event (July 4, 1918)
   * - Suggested war: 'soviet' (primary), neutral/ally with 'white' (merge event)
   * - Suggested units: 6-10 divisions, moderate strength (reflecting Siberian Army)
   * - Core regions: West and Central Siberia (Omsk, Tomsk, Novosibirsk, Krasnoyarsk, etc.)
   */
  siberian: {
    id: "siberian",
    name: "Siberian Republic",
    combatName: "Siberian Army",
    flag: "/images/flags/siberian.svg",
    color: "#14604E",
    adjective: "Siberian",
    firstArmyGroupName: "Siberian Army Group",
    divisionPrefix: "Siberian",
    selectable: false,
    coreRegions: [
      'RU-ALT', 'RU-KEM', 'RU-KGN', 'RU-KK', 'RU-KYA', 'RU-AL', 'RU-NVS', 'RU-OMS',
      'RU-TOM', 'RU-TYU', 'RU-IRK',
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
   /**
    * Kuban People's Republic (January 1918 - March 1920)
    * Historical Context: Anti-Bolshevik Cossack state in the Kuban region, proclaimed on January 28, 1918.
    * Led by the Kuban Rada (parliament), it sought independence from Russia and briefly attempted union with Ukraine.
    * 
    * Key Historical Events:
    * - February 16, 1918: Declared independence from Bolshevik Russia
    * - March 1918: Placed itself under Lavr Kornilov's authority after his successful offensive
    * - June 1918: Growing friction between leadership and Cossacks (Chernomortsy vs Lineitsy factions)
    * - December 1918: Sent delegation to Paris Peace Conference seeking international recognition
    * - April 1919: Announced break from Denikin and refusal to further cooperate with White Movement
    * - November 6, 1919: De facto occupied by Anton Denikin's forces; government members arrested
    * - March 17, 1920: Fully occupied and dissolved by Soviet forces
    * 
    * Diplomatic Recognition:
    * - De jure recognized by: Ukrainian People's Republic, Azerbaijan Democratic Republic, Germany, 
    *   Ottoman Empire, Democratic Republic of Georgia, and the Mountainous Republic of the Northern Caucasus
    * - Not recognized by: French Third Republic, British Empire, or White Russian government
    * 
    * Military Characteristics:
    * - Primarily consisted of Kuban Cossack regiments (cavalry-heavy, mobile units)
    * - Limited artillery and logistics compared to Volunteer Army
    * - Skilled in mounted warfare and irregular tactics
    * - Estimated combat strength: 15,000-25,000 combatants at peak
    * 
    * Game Configuration Recommendations:
    * - Should appear at game start or be manifested as playable/NPC starting in January 1918
    * - Core Regions: RU-KDA (Krasnodar), RU-STA (Stavropol), RU-AD (Adygea) - Kuban heartland
    * - Starting Relationships (January 1918):
    *   * War with 'soviet' (Bolsheviks) and 'fswr' (Finnish Socialist Workers)
    *   * Military access from 'ukraine' and 'don' (temporary Cossack alliance)
    *   * Neutral with 'white', but joins White cause by June 1918 → war change recommended by June
    *   * Neutral/Trade with 'ottoman' and 'germany' (some arms smuggling in early 1918)
    * - Suggested Historical Events (via scheduledEvents):
    *   * November 6, 1919: Submit to 'white' control (Denikin occupation) - AI becomes subordinate to White
    *   * December 1919: Attempt to re-establish independence (AI returns to autonomous status)
    *   * March 17, 1920: Dissolution and Soviet annexation - transfer all territory to 'kuban_soviet'
    * 
    * AI Strategy Notes:
    * - Early Game (Jan-June 1918): Defend homeland, resist Soviet expansion, build alliances with Don Cossacks
    * - Mid Game (June 1918-Nov 1919): Shift to supporting White Army against Reds, maintain territorial control
    * - Late Game (Nov 1919-Mar 1920): Historical defeat is inevitable; preserve forces, consider evacuation
    * - Victory Conditions: Control Kuban core regions + resist Soviet control until Nov 1919 (historical survival)
    * - Alternative Victory: Build alliances to resist Soviet pressure
    * 
    * Military Unit Recommendations:
    * - Style: Professional national army (similar to Polish or Scandinavian armies)
    * - Division types: Infantry, Mountain Infantry (Caucasus terrain), Artillery
    * - Starting deployment: Distributed across major regions for defense
    * - Notable units: Georgian National Guard (elite), Tbilisi garrison, frontier defense forces
    */
   kuban: {
    id: "kuban",
    name: "Kuban People's Republic",
    combatName: "Kuban Cossacks",
    flag: "/images/flags/kuban.svg",
    color: "#ED1C24",
    adjective: "Kuban",
    firstArmyGroupName: "Kuban Cossack Host",
    divisionPrefix: "Kuban Cossack",
    selectable: false,
    coreRegions: [
              'RU-KDA', 'RU-STA', 'RU-AD',
            ],
  },
  kuban_soviet: {
    id: "kuban_soviet",
    name: "Kuban Soviet Republic",
    combatName: "Kuban Red Army",
    flag: "/images/flags/kuban_soviet.svg",
    color: "#D32F2F",
    adjective: "Kuban Soviet",
    firstArmyGroupName: "Kuban Revolutionary Army",
    divisionPrefix: "Kuban Red Guard",
    selectable: false,
    coreRegions: [
              'RU-KDA', 'RU-AD',
            ],
  },
  /**
   * Moldavian Democratic Republic (December 1917 - April 1918)
   * Historical Context: Proclaimed by Sfatul Țării (National Council) on December 2/15, 1917,
   * following the February Revolution and collapse of the Russian Empire. Initially autonomous
   * within Russia, briefly independent (January-April 1918), then united with Romania.
   * 
   * Territories: Controlled Bessarabia (modern-day Moldova) with capital in Chișinău.
   * 
   * Historical Facts:
   * - Founded: December 15, 1917 (OS: December 2, 1917)
   * - Independence declared: February 6, 1918 (OS: January 24, 1918)
   * - Union with Romania: April 9, 1918 (OS: March 27, 1918)
   * - Key leader: Ion Inculeț (President of Sfatul Țării)
   * - Anthem: "Deșteaptă-te, române!" (Awaken thee, Romanian!)
   * 
   * Military Strength: Weak, relied on Romanian military intervention; internal conflicts
   * between nationalist and Bolshevik factions.
   * 
   * Diplomatic Relations:
   * - War with: Soviet Russia (Bolshevik forces), briefly with Odessa Soviet Republic
   * - Allied with: Romania (after invasion in January 1918)
   * - Hostile to: Bolshevik forces under Rumcherod
   * 
   * Game Configuration Notes:
   * - Appears mid-game around January 1918
   * - Weak starting units to reflect historical weak military
   * - Should be AI-controlled (NPC) as a minor state
   * - Can be conquered by Soviet or Romanian forces
   * - Good for narrative missions about small states caught between powers
   */
   moldavia: {
     id: "moldavia",
     name: "Moldavian Democratic Republic",
     combatName: "Moldavian Militia",
     flag: "/images/flags/moldavia.svg",
     color: "#0057B7",
     adjective: "Moldavian",
     firstArmyGroupName: "Moldavian National Guard",
     divisionPrefix: "Moldavian Guard",
     selectable: false,
     coreRegions: [
               'MD-01', 'MD-02',
             ],
   },
   /**
    * Transcaucasian Democratic Federative Republic (April 22 - May 28, 1918)
    * Historical Context: The first and only attempt at a unified Transcaucasian state.
    * A coalition government representing Armenians, Azerbaijanis, and Georgians formed
    * to negotiate with the Ottoman Empire and maintain territorial integrity. Lasted only
    * one month before ethnic tensions and Ottoman military pressure led to its dissolution.
    * 
    * Territories: Encompassed modern-day Georgia, Armenia, and Azerbaijan plus parts
    * of eastern Turkey (Kars, Batum) and southern Russia.
    * 
    * Historical Facts:
    * - Founded: April 22, 1918 (Declaration of independence)
    * - Dissolved: May 28, 1918 (After Georgia's independence declaration on May 26)
    * - Capital: Tiflis (Tbilisi)
    * - Key leaders: Nikolay Chkheidze (Seim Chairman), Akaki Chkhenkeli (PM)
    * - Duration: 36 days - the shortest-lived independent state in the region
    * - Reason for dissolution: Ottoman invasion, internal ethnic conflicts, diverging goals
    * 
    * Military Strength: Weak to moderate. Faced overwhelming Ottoman military superiority.
    * Some Armenian units showed competence (defended Kars, Sardarapat), but overall
    * lacked coordination and suffered from ethnic tensions (Azerbaijanis reluctant to fight Ottomans).
    * 
    * Diplomatic Relations:
    * - War with: Ottoman Empire (from April 14, 1918)
    * - Initially negotiated with: Germans (General von Lossow mediated)
    * - Opposed by: Bolshevik government (refused to recognize TDFR)
    * - Internal conflicts: Between Armenian nationalists, Azerbaijani moderates, and Georgian interests
    * 
    * Game Configuration Notes:
    * - NPC-controlled (non-playable) to represent historical weakness and short existence
    * - Appears: Should emerge around April 1918 (recommend event-driven start)
    * - Starting position: Weak military force, reliant on defensive operations
    * - Core regions: Georgia (GE-01+), Armenia (AM-01, AM-02), Azerbaijan proper (AZ-BA)
    * - Should face war declarations from Ottoman Empire shortly after formation
    * - Good for scenario: Representing fragile coalitions and ethnic tensions
    * - Can be conquered by Soviet forces (historically absorbed into Soviet Union in 1922)
    */
   tdfr: {
     id: "tdfr",
     name: "Transcaucasian Democratic Federative Republic",
     combatName: "Transcaucasian Federative Forces",
     flag: "/images/flags/tdfr.svg",
     color: "#FFD700", // Gold - representing the unified coalition
     adjective: "Transcaucasian",
     firstArmyGroupName: "Transcaucasian Defense Force",
     divisionPrefix: "Transcaucasian Guard",
     selectable: false,
     coreRegions: [
               // Georgia core regions
               'GE-01', 'GE-02', 'GE-03', 'GE-04', 'GE-05', 'GE-06', 'GE-07', 'GE-08',
               'GE-09', 'GE-10', 'GE-11', 'GE-12', 'GE-13', 'GE-14', 'GE-15', 'GE-16',
               'GE-17', 'GE-18', 'GE-19', 'GE-20',
               // Armenia core regions
               'AM-01', 'AM-02', 'AM-03', 'AM-04',
               // Azerbaijan core regions (Caucasia proper, not including historical Persian Azerbaijan)
               'AZ-BA', 'AZ-GA', 'AZ-LA', 'AZ-SH',
             ],
   },
   /**
    * Belarusian People's Republic (1918-1919)
    * Historical Context: Proclaimed March 6, 1918 (Second Charter), independence declared March 25, 1918 (Third Charter).
    * Short-lived state during Russian Civil War that attempted to establish an independent Belarus.
    * 
    * Territories: Claimed Mogilev, Minsk, Grodno, Vilna, Vitebsk Governorates, and parts of Smolensk Governorate.
    * Capital: Minsk (until December 1918 when captured by Red Army), then Vilnius and Hrodna.
    * 
    * Historical Facts:
    * - Proclaimed: March 6, 1918 (Second Charter as autonomous)
    * - Independence: March 25, 1918 (Third Charter, under German occupation)
    * - Fall: December 10, 1918 (Red Army captured Minsk)
    * - Went into exile in spring 1919, continued as government-in-exile for decades
    * - Key figures: Jan Sierada, Jazep Losik, Anton Łuckievič, Stanisław Bułak-Bałachowicz
    * 
    * Military Strength: Modest - approximately 11,000 volunteers attempted to establish armed forces.
    * Notable military action: Slutsk defence action (late 1920) against Bolsheviks.
    * 
    * Diplomatic Relations:
    * - War with: Soviet Russia/RSFSR (primary enemy), briefly aligned against Bolsheviks
    * - Recognition by: Estonia (October 1919), Finland (December 1919), Lithuania (November 1920)
    * - Negotiated with: Soviet Russia (seeking recognition), Germany (under occupation)
    * - Allied with: Ukrainian People's Republic (food supplies), anti-communist forces
    * 
    * Game Configuration Notes:
    * - Should appear at game start (March 1918) or via historical event
    * - Weak starting units reflecting historical weakness (mostly volunteer militia)
    * - Should be AI-controlled (NPC) as a minor state
    * - Likely to be crushed by Soviet forces historically
    * - Core regions based on historically claimed territories during 1918
    * - Flag: White-red-white tricolor (historically accurate for 1918-1919 period)
    */
    bpr: {
      id: "bpr",
      name: "Belarusian People's Republic",
      combatName: "Belarusian National Guard",
      flag: "/images/flags/bpr.svg",
      color: "#E63946",
      adjective: "Belarusian",
      firstArmyGroupName: "Belarusian National Army",
      divisionPrefix: "Belarusian Guard",
      selectable: false,
      coreRegions: [
                'RU-BEL', 'RU-MOW', 'RU-OR',
              ],
    },
    /**
     * Democratic Republic of Georgia (1918-1921)
     * Historical Context: The first independent Georgian state in the modern era, established
     * after the collapse of the Russian Empire. Known for its democratic government led by the
     * Mensheviks, it was recognized by major European powers but fell to Soviet invasion in 1921.
     * 
     * Territories: Encompassed all major Georgian regions including Tbilisi (capital), plus
     * disputed territories with Armenia and Azerbaijan. Briefly controlled more territory (1919-1920).
     * 
     * Historical Facts:
     * - Independence declared: May 26, 1918
     * - Government type: Democratic parliamentary republic (unique in the region)
     * - First woman suffrage in the Caucasus (and among first in Europe)
     * - Capital: Tbilisi (Tiflis in Russian)
     * - Key leaders: Noe Zhordania (PM), Nikolay Chkheidze (early leader), Noe Ramishvili
     * - International recognition: Recognized by all major European powers and USA
     * - Fall: Soviet invasion February 11 - March 17, 1921; became Georgian SSR
     * - Government-in-exile: Continued in France until 1930s
     * 
     * Military Strength: Moderate - approximately 40,000-60,000 troops at peak strength.
     * Well-organized national army with competent officer corps. Defended successfully against
     * Ottoman and White Russian threats but unable to resist Soviet invasion (isolated after
     * British withdrawal in 1920).
     * 
     * Diplomatic Relations & Historical Conflicts:
     * - Initial allies/neutrals: Germany (1918), Britain (1918-1920) provided military support
     * - War with: Ottoman Empire (1918 - Treaty of Batum), internally: Abkhazian and Ossetian rebels
     * - Territorial disputes: Armenia (1918-1920 over Lori region), Azerbaijan (1918-1920 over Zaqatala)
     * - Eventual enemy: Soviet Russia (after German withdrawal, escalated to invasion in 1921)
     * - Neutral policy: Tried to remain neutral during Russian Civil War; signed Moscow Treaty (May 7, 1920)
     * 
     * Government Characteristics:
     * - Progressive democratic constitution (February 21, 1921 - just before fall)
     * - Women's suffrage and representation in parliament (groundbreaking for era)
     * - Multi-ethnic representation (Armenians, Azerbaijanis, Jews, Russians, Germans)
     * - Advanced legal system with jury trials
     * - Attempted land reform and decentralization
     * 
     * Game Configuration Notes:
     * - Should appear at game start (May 26, 1918) or as startup nation
     * - Can be playable by advanced players for interesting diplomatic scenario, or NPC for historical accuracy
     * - Recommended as NPC (selectable: false) for historical narrative preservation
     * - Moderate military starting strength (well-trained but not numerous forces)
     * - Core regions: All Georgian regions (GE-01 through GE-20) representing historical territories
     * - Starting Relationships (May 1918):
     *   * War with 'ottoman' (Treaty of Batum conflict - defensive)
     *   * Neutral with 'soviet' (initially neutral, escalates after German withdrawal)
     *   * Neutral with 'white' (shared anti-Bolshevik interest but competing territorial claims)
     *   * Military access or alliance with 'germany' initially (protection under German occupation)
     * - Starting war with: Ottoman Empire (defensive war over southern territories)
     * 
     * Suggested Historical Events (via scheduledEvents):
     *   * June 4, 1918: Treaty of Batum - forced to cede southern territories to Ottoman Empire
     *   * December 1918: British occupation of Tbilisi begins
     *   * May 7, 1920: Moscow Treaty - Soviet recognition of independence (fragile peace)
     *   * August 1920: Kars Treaty - Ottoman defeat, Georgia gains some territory back
     *   * February 11, 1921: Soviet invasion begins - change to 'war' status with 'soviet'
     *   * March 17, 1921: Full Soviet occupation - dissolution event (transfer territories to Soviet)
     * 
     * AI Strategy Notes:
     * - Early Game (May-Dec 1918): Secure against Ottoman threat, defend from internal rebels
     * - Mid Game (1919-1920): Consolidate democratic institutions, expand influence in Caucasus
     * - Late Game (1920-1921): Prepare for inevitable Soviet invasion, maintain independence as long as possible
     * - Victory Condition (Historical): Survive until March 1921 with territorial integrity (nearly impossible in reality)
     * - Alternative Victory: Build alliances to resist Soviet pressure
     * 
     * Military Unit Recommendations:
     * - Style: Professional national army (similar to Polish or Scandinavian armies)
     * - Division types: Infantry, Mountain Infantry (Caucasus terrain), Artillery
     * - Starting deployment: Distributed across major regions for defense
     * - Notable units: Georgian National Guard (elite), Tbilisi garrison, frontier defense forces
     */
    georgia: {
      id: "georgia",
      name: "Democratic Republic of Georgia",
      combatName: "Georgian Army",
      flag: "/images/flags/georgia.svg",
      color: "#ED1C24", // Historical red color from DRG flag
      adjective: "Georgian",
      firstArmyGroupName: "Georgian National Army",
      divisionPrefix: "Georgian Guard",
      selectable: false,
      coreRegions: [
                'GE-01', 'GE-02', 'GE-03', 'GE-04', 'GE-05', 'GE-06', 'GE-07', 'GE-08',
                'GE-09', 'GE-10', 'GE-11', 'GE-12', 'GE-13', 'GE-14', 'GE-15', 'GE-16',
                'GE-17', 'GE-18', 'GE-19', 'GE-20',
              ],
    },
    /**
     * First Republic of Armenia (1918-1920)
     */
    armenia: {
      id: "armenia",
      name: "First Republic of Armenia",
      combatName: "Armenian Army",
      flag: "/images/flags/armenia.svg",
      color: "#F2A800",
      adjective: "Armenian",
      firstArmyGroupName: "Armenian Army Group",
      divisionPrefix: "Armenian Guard",
      selectable: false,
      coreRegions: [
                'AM-01', 'AM-02', 'AM-03', 'AM-04',
              ],
    },
    /**
     * Mountainous Republic of the Northern Caucasus (1918-1919)
     * Historical Context: Short-lived independent state representing various North Caucasian ethnic groups
     * during the Russian Civil War. Declared independence on May 11, 1918, and existed until 1919.
     * 
     * Territories: Encompassed Terek Oblast and Dagestan Oblast regions, including lands of:
     * - Chechens, Circassians, Ossetians, Dagestanis, Ingush, Abazins, Balkars, Karachays, Kumyks
     * 
     * Historical Facts:
     * - Founded: May 11, 1918
     * - Capital: Initially Vladikavkaz, relocated to Temir-Khan-Shura (Buynaksk)
     * - Recognized by: Ottoman Empire, Germany, Austria-Hungary, Bulgaria, Georgia, Azerbaijan, 
     *   Ukrainian People's Republic, Kuban People's Republic, UK (briefly)
     * - Collapsed: 1919 when Russian Volunteer Army (White Army) captured the territory
     * - Legacy: Succeeded by North Caucasian Emirate (September 1919), then absorbed into Soviet Union
     * 
     * Military Strength: Moderate cavalry-based forces, primarily irregular units and local militia.
     * Featured Caucasian cavalry regiments and Ottoman support (Ottoman pashas arrived with forces).
     * Estimated fighting strength: 10,000-20,000 combatants at peak (1918).
     * 
     * Diplomatic Relations:
     * - War with: Soviet Russia (Red Army), Russian White Army (Volunteer Army), internal conflicts
     * - Allied with: Ottoman Empire (primary supporter until WW1 end), Germany, Austria-Hungary,
     *   Central Powers during early period
     * - Neutral/Trade with: Georgian Democratic Republic, Azerbaijan Democratic Republic
     * - Leadership: Tapa Tchermoeff (Chairman), Rashid Khan Kaplanov (Second Chairman), 
     *   Pshemakho Kotsev (Second PM after late 1918)
     * 
     * Game Configuration Notes:
     * - Should appear mid-game (around May 1918) or via historical event
     * - Moderate starting units reflecting historical strength (cavalry-heavy composition)
     * - Should be AI-controlled (NPC) representing North Caucasian confederation
     * - Historically captured by White Army in May 1919 - should be conquered or transformed
     * - Core regions: Caucasus territories (Chechnya, Dagestan, North Ossetia areas)
     * - Flag: Green and white horizontal stripes with 7 yellow stars (Islamic star symbols)
     * 
     * Strategic Notes for AI:
     * - Early Game (May-Nov 1918): Consolidate control, resist Red expansion from north, Ottoman support
     * - Mid Game (Dec 1918-May 1919): Struggle against White Army invasion, seek alliances
     * - Late Game (May 1919+): Historical defeat inevitable; focus on survival/negotiation
     * - Victory Condition: Maintain independence and control core regions through 1918-1919
     */
    mrnc: {
      id: "mrnc",
      name: "Mountainous Republic of the Northern Caucasus",
      combatName: "Caucasian Mountain Forces",
      flag: "/images/flags/mrnc.svg",
      color: "#228B22",  // Forest green - extracted from flag's dominant color
      adjective: "North Caucasian",
      firstArmyGroupName: "Caucasian Defense Force",
      divisionPrefix: "Mountain Guard",
      selectable: false,
      coreRegions: [
                'RU-CE', 'RU-IN', 'RU-KB', 'RU-SE',  // Core North Caucasus regions (Chechen, Ingushetia, Kabardino-Balkaria, North Ossetia)
              ],
    },
    /**
     * Azerbaijan Democratic Republic (1918-1920)
     * Historical Context: The first secular democratic republic in the Turkic and Muslim worlds.
     * Proclaimed on May 28, 1918, after the collapse of the Transcaucasian Democratic Federative Republic.
     * Lasted until April 28, 1920, when invaded by the Red Army.
     * 
     * Historical Facts:
     * - Founded: May 28, 1918 (Independence declaration)
     * - Capital: Ganja (1918-September), then Baku
     * - Fall: April 28, 1920 (Soviet invasion)
     * - Population: ~3 million
     * - First country to grant women's suffrage (1918)
     * - Area: ~99,909 km²
     * 
     * Key Historical Events:
     * - May 28, 1918: Declaration of independence
     * - June-July 1918: Armed conflict with Armenia over territorial disputes
     * - July 1918: Ottoman intervention and alliance
     * - 1918-1919: Conflict with First Republic of Armenia
     * - April 28, 1920: Red Army invasion and occupation
     * 
     * Diplomatic Recognition:
     * - Recognized by: Ottoman Empire, German Empire, Georgia, Ukraine, Kuban People's Republic
     * - Opposed by: Soviet Russia, First Republic of Armenia
     * - Neutral/Trade relations: Persia, other Caucasian states
     * 
     * Military Characteristics:
     * - Mixed Ottoman and modern European-style forces
     * - Limited military resources initially
     * - Estimated 20,000-30,000 combatants at peak
     * - Relied heavily on Ottoman support against Armenian forces (1918-1919)
     * 
     * Territorial Disputes:
     * - Claimed regions: Baku, Ganja, Shaki, Lenkoran (Southern Azerbaijan proper)
     * - Disputed with Armenia: Karabakh, Zangezur regions
     * - Border with Ottoman Empire: Treaty of Batum (June 4, 1918)
     * 
     * Game Configuration Recommendations:
     * - Appears: At game start (May 28, 1918) or via historical event
     * - Core Regions: AZ-BA (Baku), AZ-GA (Ganja), AZ-SH (Shaki), AZ-LA (Lenkoran)
     * - Starting Relationships (May 1918):
     *   * War with 'armenia' (First Republic of Armenia) over Karabakh
     *   * Military access/alliance with 'ottoman' (Treaty of Batum)
     *   * Opposed by 'soviet' (Bolshevik forces)
     *   * Good relations with 'ukraine', 'kuban', 'don' (anti-Bolshevik allies)
     * - Suggested Historical Events (via scheduledEvents):
     *   * June 4, 1918: Alliance with Ottoman Empire formalized (Treaty of Batum)
     *   * June-September 1918: War escalates with Armenia
     *   * September 1918: Capital moves to Baku (Ganja lost/secured)
     *   * April 28, 1920: Soviet invasion begins - transfer territory to Soviet Azerbaijan
     * 
     * AI Strategy Notes:
     * - Early Game (May-June 1918): Seek Ottoman alliance, defend borders
     * - Mid Game (June 1918-1919): Hold Baku oil fields, contest Armenian territories
     * - Late Game (1919-April 1920): Prepare for inevitable Soviet invasion
     * - Victory Conditions: Control oil-rich Baku region + maintain independence until late 1919
     */
    adr: {
      id: "adr",
      name: "Azerbaijan Democratic Republic",
      combatName: "Azerbaijani Forces",
      flag: "/images/flags/adr.svg",
      color: "#13A538", // Green from the ADR flag
      adjective: "Azerbaijani",
      firstArmyGroupName: "Azerbaijani National Army",
      divisionPrefix: "Azerbaijani Guard",
      selectable: false,
      coreRegions: [
                'AZ-BA', 'AZ-GA', 'AZ-SH', 'AZ-LA',
              ],
    },
    /**
     * Crimean People's Republic (1917-1918)
     * Historical Context: A short-lived independent republic declared by the Crimean Tatars 
     * in the wake of the Russian Revolution. It was one of the first attempts to create a 
     * secular democratic state in the Muslim world.
     * 
     * Historical Facts:
     * - Founded: December 13, 1917 (Proclamation)
     * - Capital: Bakhchysarai (initially), then Simferopol
     * - President: Noman Çelebicihan (executed by Bolsheviks in Feb 1918)
     * - Disestablished: January 1918 (captured by Bolshevik Black Sea Fleet)
     * - Population: ~800,000 (Multi-ethnic: Tatar, Russian, Ukrainian, Jewish, Greek)
     * 
     * Key Historical Events:
     * - Nov-Dec 1917: Formation of the Kurultai (National Assembly)
     * - Dec 13, 1917: Declaration of the Crimean People's Republic
     * - Jan 1918: Bolshevik uprising in Sevastopol and Simferopol
     * - Feb 23, 1918: Execution of Noman Çelebicihan in Sevastopol
     * - April 1918: Crimea liberated by Ukrainian and German forces (Crimean Offensive)
     * 
     * Diplomatic Relationships:
     * - Allied with: Ukrainian People's Republic (mutual recognition)
     * - Opposed by: Soviet Russia (Bolsheviks), Black Sea Fleet sailors
     * - Supported by: Ottoman Empire (ideologically/culturally)
     * 
     * Military Strength:
     * - Small, cavalry-based force: "Escadron" (primarily Crimean Tatar cavalry)
     * - Estimated strength: 2,000-5,000 men
     * - Heavy reliance on local militia and support from Ukrainian units
     * 
     * Game Configuration Recommendations:
     * - Appears: December 1917 (historical start)
     * - Core Regions: UA-43 (Crimea), UA-40 (Sevastopol)
     * - Starting Relationships:
     *   * War with 'soviet' (Bolsheviks)
     *   * Military access/alliance with 'ukraine'
     * - Suggested Historical Events:
     *   * Jan 1918: Bolshevik takeover - transfer regions to 'soviet' or 'taurida'
     *   * April 1918: German-Ukrainian offensive - transfer regions to 'ukraine' or 'germany'
     * 
     * AI Strategy Notes:
     * - Early Game: Defend the peninsula, secure Simferopol, resist Sevastopol-based Bolsheviks
     * - Victory Conditions: Maintain independence throughout 1918 (ahistorical)
     */
    crimea: {
      id: "crimea",
      name: "Crimean People's Republic",
      combatName: "Crimean Tatar Forces",
      flag: "/images/flags/crimea.svg",
      color: "#00AEEF", // Sky blue from the Crimean Tatar flag
      adjective: "Crimean",
      firstArmyGroupName: "Crimean National Army",
      divisionPrefix: "Crimean Guard",
      selectable: false,
      coreRegions: [
                'UA-43', 'UA-40',
              ],
    },
    /**
     * Crimean Regional Government (1918-1919)
     * Historical Context: An anti-Bolshevik government in the Crimean Peninsula. 
     * The first government (June-November 1918) was led by General Maciej Sulkiewicz, 
     * pro-German and seeking independence. The second (November 1918-April 1919) was 
     * led by Solomon Crimea, pro-Entente and aligned with the White movement.
     * 
     * Territories: Crimean Peninsula.
     * 
     * Military Characteristics: Modest forces, initially supported by the German Empire, 
     * later by the Volunteer Army and Entente forces.
     * 
     * Game Configuration Recommendations:
     * - Should appear around June 1918 (Sulkiewicz government).
     * - Core Regions: RU-Cr (Crimea).
     * - Starting Relationships:
     *   * Allied with 'germany' (initially).
     *   * War with 'soviet' (Bolsheviks).
     *   * War with 'taurida' (Soviet Crimea).
     *   * Later neutral/allied with 'white'.
     */
    crimean: {
      id: "crimean",
      name: "Crimean Regional Government",
      combatName: "Crimean Forces",
      flag: "/images/flags/crimean.svg",
      color: "#4169E1",
      adjective: "Crimean",
      firstArmyGroupName: "Crimean Army Group",
      divisionPrefix: "Crimean",
      selectable: false,
      coreRegions: [
                'RU-Cr',
              ],
    },
    /**
     * North Caucasian Soviet Republic (July 1918 - January 1919)
     * Historical Context: Short-lived Soviet republic created by merging the Kuban-Black Sea,
     * Stavropol, and Terek Soviet republics to consolidate Bolshevik rule in the North Caucasus.
     * Its capital moved from Yekaterinodar (Krasnodar) to Pyatigorsk after White advances.
     * 
     * Territories: Northern Caucasus including Kuban, Stavropol, and Terek regions.
     * 
     * Key Historical Events:
     * - July 7, 1918: Established as part of the Russian SFSR
     * - August 1918: Yekaterinodar captured by White forces, capital moved to Pyatigorsk
     * - Late 1918: White Army advances capture most territory
     * - January 11, 1919: Republic abolished by All-Russian Central Executive Committee
     * 
     * Diplomatic & Military Context:
     * - Aligned with Soviet Russia as an RSFSR republic
     * - War with White Volunteer Army (Denikin) and anti-Bolshevik Cossack forces
     * - Hostile to the Mountainous Republic of the Northern Caucasus
     * 
     * Game Configuration Notes:
     * - Should appear around July 1918 via event or mid-game start
     * - War with 'white', 'kuban', 'don', and 'mrnc' recommended
     * - Suggested units: 4-7 divisions of Red Guards with modest strength
     * - Core regions: Kuban, Stavropol, and Terek Soviet territories
     */
    northcaucasian: {
      id: "northcaucasian",
      name: "North Caucasian Soviet Republic",
      combatName: "North Caucasian Reds",
      flag: "/images/flags/northcaucasian.svg",
      color: "#DD0000",
      adjective: "North Caucasian Soviet",
      firstArmyGroupName: "North Caucasian Red Army",
      divisionPrefix: "Caucasian Red Guard",
      selectable: false,
      coreRegions: [
        'RU-KDA', 'RU-AD', 'RU-STA', 'RU-CE', 'RU-IN', 'RU-KB', 'RU-SE',
      ],
    },
    /**
     * Transcaspian Provisional Government (1918-1920)
     * Historical Context: Anti-Bolshevik administration formed in Ashgabat on July 14, 1918, 
     * following a revolt by railway workers on the Trans-Caspian Railway. Initially led by 
     * Mensheviks and Socialist-Revolutionaries, it was supported by the British Malleson Mission.
     * 
     * Key Historical Events:
     * - July 14, 1918: Formation of the Ashkhabad Executive Committee after anti-Bolshevik revolt.
     * - September 20, 1918: Execution of the 26 Baku Commissars under Fyodor Funtikov's leadership.
     * - November 1918: Formally took the name Transcaspian Provisional Government.
     * - January 1919: Merged with Denikin's forces to form the White Turkestan Army.
     * - February 1920: Final collapse after British withdrawal and Red Army offensive.
     * 
     * Territories: Controlled the Transcaspian Oblast (modern Turkmenistan), including 
     * Ashgabat (capital), Krasnovodsk, and Merv.
     * 
     * Diplomatic Relations:
     * - War with: Soviet Russia (Bolsheviks in Tashkent).
     * - Allied with: British Empire (Malleson Mission), White Army (Armed Forces of South Russia).
     * - Recognition: Supported by the British, later integrated into the wider White movement.
     * 
     * Military Strength: Initially weak (around 1000 armed men), bolstered by British Anglo-Indian 
     * troops and later by Denikin's officers.
     * 
     * Game Configuration Recommendations:
     * - Should appear around July 1918.
     * - Core Regions: TM-A (Ahal/Ashgabat), TM-B (Balkan/Krasnovodsk), TM-M (Mary/Merv).
     * - Starting Relationships:
     *   * War with 'soviet'.
     *   * Allied with 'foreign' (British support).
     *   * Later allied/subordinate to 'white'.
     */
    transcaspia: {
      id: "transcaspia",
      name: "Transcaspian Provisional Government",
      combatName: "Transcaspian Army",
      flag: "/images/flags/transcaspia.svg",
      color: "#D2B48C",
      adjective: "Transcaspian",
      firstArmyGroupName: "Transcaspian Army Group",
      divisionPrefix: "Transcaspian",
      selectable: false,
      coreRegions: [
        'TM-A', 'TM-B', 'TM-M',
      ],
    },
};
