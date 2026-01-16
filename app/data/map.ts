import { CountryId } from '../types/game';

/**
 * Region economic values/weights for income generation.
 * Default value is 1, major cities and industrial centers have higher values.
 * 
 * Moscow: 5 (capital, political center)
 * St. Petersburg: 4 (former capital, major industrial city)
 * Kyiv: 3 (major city, strategic importance)
 * Other major cities: 2 (significant economic centers)
 * Standard regions: 1 (default)
 */
export const regionValues: Record<string, number> = {
  // Major capitals and cities (high value)
  'RU-MOW': 5,  // Moscow (city) - Capital
  'RU-SPE': 4,  // Saint Petersburg (city) - Former capital
  'UA-30': 3,   // Kyiv (city) - Major city
  
  // Industrial and strategic centers (value 2)
  'RU-MOS': 2,  // Moscow Oblast - Industrial heartland
  'RU-LEN': 2,  // Leningrad Oblast - Industrial
  'RU-NIZ': 2,  // Nizhny Novgorod Oblast - Industrial
  'RU-SVE': 2,  // Sverdlovsk Oblast - Ural industrial center
  'RU-CHE': 2,  // Chelyabinsk Oblast - Ural industrial
  'RU-SAM': 2,  // Samara Oblast - Volga industrial
  'RU-ROS': 2,  // Rostov Oblast - Southern industrial
  'RU-KDA': 2,  // Krasnodar Krai - Agricultural heartland
  'RU-TA': 2,   // Republic of Tatarstan - Oil and industry
  'RU-BA': 2,   // Republic of Bashkortostan - Industrial
  'UA-12': 2,   // Dnipropetrovsk Oblast - Industrial
  'UA-14': 2,   // Donetsk Oblast - Coal and industry
  'UA-63': 2,   // Kharkiv Oblast - Industrial
  'UA-51': 2,   // Odesa Oblast - Port city
  
  // Belarus
  'BY-HM': 3,   // Minsk (city) - Capital
  
  // Finland
  'FI-18': 3,   // Uusimaa (Helsinki) - Capital region
  
  // Estonia
  'EE-37': 2,   // Harju County (Tallinn) - Capital
  
  // Latvia (ADM0 - single region)
  'LVA': 3,     // Latvia - Capital Riga
  
  // Lithuania
  'LT-VL': 2,   // Vilnius County - Capital
  'LT-KU': 2,   // Kaunas County - Major city
  
  // Kazakhstan
  'KZ-ALA': 3,   // Almaty (city) - Major city
  'KZ-AST': 2,   // Astana (city) - Capital
  
  // Uzbekistan (ADM0 - single region)
  'UZB': 3,     // Uzbekistan - Capital Tashkent
  
  // Tajikistan
  'TJ-DU': 2,   // Dushanbe (city) - Capital
  
  // Germany
  'DE-BE': 5,   // Berlin - Capital
  'DE-NW': 3,   // North Rhine-Westphalia - Industrial heartland
  'DE-BY': 2,   // Bavaria
  'DE-BW': 2,   // Baden-Württemberg
  'DE-SN': 2,   // Saxony
  
  // Poland
  'PL-MZ': 4,   // Warsaw - Capital
  'PL-SL': 2,   // Silesia - Industrial
  
  // Austria-Hungary (successors)
  'AT-9': 5,    // Vienna - Capital
  'HU-PE': 4,   // Budapest - Capital
  'CZ-10': 3,   // Prague - Major city
  
  // Balkans
  'RO-B': 3,    // Bucharest - Capital
  'BG-22': 3,   // Sofia - Capital
  'RS-00': 3,    // Belgrade - Capital
  'GR-AT': 3,    // Athens - Capital
  
  // North Macedonia & Kosovo
  '19869673B29343041094723': 3, // Skopje - Capital
  '2360587B5118871504069': 3,   // Pristina - Capital
  
  // All other regions default to value 1
};

/**
 * Initial region ownership at game start (November 20, 1917 - Ukrainian People's Republic declared)
 * 
 * Soviet: Moscow and surrounding core regions (Bolshevik control)
 * White: Peripheral Russian regions, Ukraine, Belarus, Finland, Baltics, Central Asia (anti-Bolshevik forces)
 */
export const initialRegionOwnership: Record<string, CountryId> = {
  // ============================================
  // SOVIET CORE REGIONS (Moscow and surroundings)
  // ============================================
  'RU-MOW': 'soviet',  // Moscow (city)
  'RU-MOS': 'soviet',  // Moscow Oblast
  'RU-TVE': 'soviet',  // Tver Oblast
  'RU-YAR': 'white',  // Yaroslavl Oblast
  'RU-KOS': 'soviet',  // Kostroma Oblast
  'RU-IVA': 'soviet',  // Ivanovo Oblast
  'RU-VLA': 'soviet',  // Vladimir Oblast
  'RU-RYA': 'soviet',  // Ryazan Oblast
  'RU-TUL': 'white',  // Tula Oblast
  'RU-KLU': 'white',  // Kaluga Oblast
  'RU-SMO': 'soviet',  // Smolensk Oblast
  'RU-NIZ': 'soviet',  // Nizhny Novgorod Oblast

  // ============================================
  // WHITE-CONTROLLED RUSSIAN REGIONS
  // ============================================
  // Northwest Russia
  'RU-SPE': 'soviet',   // Saint Petersburg (city)
  'RU-LEN': 'soviet',   // Leningrad Oblast
  'RU-NGR': 'white',   // Novgorod Oblast
  'RU-PSK': 'soviet',   // Pskov Oblast (German-controlled)
  'RU-KR': 'white',    // Republic of Karelia
  'RU-MUR': 'white',   // Murmansk Oblast
  'RU-ARK': 'white',   // Arkhangelsk Oblast
  'RU-NEN': 'white',   // Nenets Autonomous Okrug
  'RU-VLG': 'white',   // Vologda Oblast

  // Central Russia (non-Soviet)
  'RU-BRY': 'ukraine',   // Bryansk Oblast
  'RU-ORL': 'white',   // Oryol Oblast
  'RU-LIP': 'white',   // Lipetsk Oblast
  'RU-TAM': 'white',   // Tambov Oblast
  'RU-VOR': 'soviet',   // Voronezh Oblast
  'RU-BEL': 'soviet',   // Belgorod Oblast
  'RU-KRS': 'white',   // Kursk Oblast
  'RU-PNZ': 'white',   // Penza Oblast
  'RU-SAR': 'white',   // Saratov Oblast
  'RU-MO': 'white',    // Republic of Mordovia
  'RU-CU': 'white',    // Chuvash Republic
  'RU-ME': 'white',    // Mari El Republic
  'RU-TA': 'white',    // Republic of Tatarstan
  'RU-ULY': 'white',   // Ulyanovsk Oblast

  // Volga Region
  'RU-SAM': 'white',   // Samara Oblast
  'RU-ORE': 'white',   // Orenburg Oblast
  'RU-KIR': 'white',   // Kirov Oblast
  'RU-UD': 'white',    // Udmurt Republic
  'RU-PER': 'white',   // Perm Krai
  'RU-BA': 'white',    // Republic of Bashkortostan
  'RU-CHE': 'white',   // Chelyabinsk Oblast
  'RU-SVE': 'white',   // Sverdlovsk Oblast
  'RU-KGN': 'white',   // Kurgan Oblast
  'RU-TYU': 'white',   // Tyumen Oblast
  'RU-KO': 'white',    // Komi Republic

  // Southern Russia / Caucasus
  'RU-ROS': 'don',   // Rostov Oblast - Don Republic
  'RU-VGG': 'don',   // Volgograd Oblast - Don Republic
  'RU-AST': 'white',   // Astrakhan Oblast
  'RU-KL': 'white',    // Republic of Kalmykia
  'RU-KDA': 'white',   // Krasnodar Krai
  'RU-AD': 'white',    // Republic of Adygea
  'RU-STA': 'white',   // Stavropol Krai
  'RU-KC': 'white',    // Karachay-Cherkess Republic
  'RU-KB': 'white',    // Kabardino-Balkar Republic
  'RU-SE': 'white',    // Republic of North Ossetia
  'RU-IN': 'white',    // Republic of Ingushetia
  'RU-CE': 'soviet',   // Chechen Republic
  'RU-DA': 'white',    // Republic of Dagestan

  // Siberia
  'RU-KHM': 'white',   // Khanty-Mansi Autonomous Okrug
  'RU-YAN': 'white',   // Yamalo-Nenets Autonomous Okrug
  'RU-OMS': 'white',   // Omsk Oblast
  'RU-NVS': 'white',   // Novosibirsk Oblast
  'RU-TOM': 'white',   // Tomsk Oblast
  'RU-KEM': 'white',   // Kemerovo Oblast
  'RU-ALT': 'white',   // Altai Krai
  'RU-AL': 'white',    // Altai Republic
  'RU-KK': 'white',    // Republic of Khakassia
  'RU-TY': 'white',    // Tyva Republic
  'RU-KYA': 'white',   // Krasnoyarsk Krai
  'RU-IRK': 'white',   // Irkutsk Oblast
  'RU-BU': 'white',    // Republic of Buryatia
  'RU-ZAB': 'white',   // Zabaykalsky Krai

  // Far East
  'RU-SA': 'white',    // Sakha Republic (Yakutia)
  'RU-AMU': 'white',   // Amur Oblast
  'RU-YEV': 'white',   // Jewish Autonomous Oblast
  'RU-KHA': 'white',   // Khabarovsk Krai
  'RU-PRI': 'white',   // Primorsky Krai
  'RU-MAG': 'white',   // Magadan Oblast
  'RU-CHU': 'white',   // Chukotka Autonomous Okrug
  'RU-KAM': 'white',   // Kamchatka Krai
  'RU-SAK': 'white',   // Sakhalin Oblast

  // Exclave (Soviet/German-controlled)
  'RU-KGD': 'soviet',   // Kaliningrad Oblast

  // ============================================
  // UKRAINE (Ukrainian People's Republic)
  // ============================================
  'UA-05': 'ukraine',  // Vinnytsia Oblast
  'UA-07': 'ukraine',  // Volyn Oblast
  'UA-09': 'ukraine',  // Luhansk Oblast
  'UA-12': 'ukraine',  // Dnipropetrovsk Oblast
  'UA-14': 'ukraine',  // Donetsk Oblast
  'UA-18': 'ukraine',  // Zhytomyr Oblast
  'UA-21': 'austriahungary',  // Zakarpattia Oblast
  'UA-23': 'ukraine',  // Zaporizhzhia Oblast
  'UA-26': 'austriahungary',  // Ivano-Frankivsk Oblast
  'UA-30': 'ukraine',  // Kyiv (city)
  'UA-32': 'ukraine',  // Kyiv Oblast
  'UA-35': 'ukraine',  // Kirovohrad Oblast
  'UA-40': 'ukraine',  // Sevastopol (city)
  'UA-43': 'ukraine',  // Crimea
  'UA-46': 'austriahungary',  // Lviv Oblast
  'UA-48': 'ukraine',  // Mykolaiv Oblast
  'UA-51': 'ukraine',  // Odesa Oblast
  'UA-53': 'ukraine',  // Poltava Oblast
  'UA-56': 'ukraine',  // Rivne Oblast
  'UA-59': 'ukraine',  // Sumy Oblast
  'UA-61': 'austriahungary',  // Ternopil Oblast
  'UA-63': 'ukraine',  // Kharkiv Oblast
  'UA-65': 'ukraine',  // Kherson Oblast
  'UA-68': 'ukraine',  // Khmelnytskyi Oblast
  'UA-71': 'ukraine',  // Cherkasy Oblast
  'UA-74': 'ukraine',  // Chernihiv Oblast
  'UA-77': 'austriahungary',  // Chernivtsi Oblast

  // ============================================
  // BELARUS (Soviet/German-controlled)
  // ============================================
  'BY-BR': 'white',   // Brest Region
  'BY-HO': 'soviet',   // Gomel Region
  'BY-HM': 'soviet',   // Minsk (city)
  'BY-HR': 'soviet',   // Grodno Region
  'BY-MA': 'white',   // Mogilev Region
  'BY-MI': 'soviet',   // Minsk Region
  'BY-VI': 'soviet',   // Vitebsk Region

  // ============================================
  // FINLAND (Independent)
  // ============================================
  'FI-01': 'finland',   // Åland
  'FI-02': 'finland',   // South Karelia
  'FI-03': 'finland',   // Southern Ostrobothnia
  'FI-04': 'finland',   // Southern Savonia
  'FI-05': 'finland',   // Kainuu
  'FI-06': 'finland',   // Tavastia Proper
  'FI-07': 'finland',   // Central Ostrobothnia
  'FI-08': 'finland',   // Central Finland
  'FI-09': 'finland',   // Kymenlaakso
  'FI-10': 'finland',   // Lapland
  'FI-11': 'finland',   // Pirkanmaa
  'FI-12': 'finland',   // Ostrobothnia
  'FI-13': 'finland',   // North Karelia
  'FI-14': 'finland',   // Northern Ostrobothnia
  'FI-15': 'finland',   // Northern Savonia
  'FI-16': 'finland',   // Päijänne Tavastia
  'FI-17': 'finland',   // Satakunta
  'FI-18': 'finland',   // Uusimaa (Helsinki)
  'FI-19': 'finland',   // Southwest Finland

  // ============================================
  // ESTONIA (Soviet/German-controlled)
  // ============================================
  'EE-37': 'soviet',   // Harju County (Tallinn)
  'EE-39': 'soviet',   // Hiiu County
  'EE-44': 'soviet',   // Ida-Viru County
  'EE-49': 'soviet',   // Jõgeva County
  'EE-51': 'soviet',   // Järva County
  'EE-57': 'soviet',   // Lääne County
  'EE-59': 'soviet',   // Lääne-Viru County
  'EE-65': 'soviet',   // Põlva County
  'EE-67': 'soviet',   // Pärnu County
  'EE-70': 'soviet',   // Rapla County
  'EE-74': 'soviet',   // Saare County
  'EE-78': 'soviet',   // Tartu County
  'EE-82': 'soviet',   // Valga County
  'EE-84': 'soviet',   // Viljandi County
  'EE-86': 'soviet',   // Võru County

  // ============================================
  // LATVIA (Iskolat - Latvian Soviet Government) - ADM0
  // ============================================
  'LVA': 'iskolat',     // Latvia (Iskolat Soviet Republic)

  // ============================================
  // LITHUANIA (Soviet/German-controlled)
  // ============================================
  'LT-AL': 'soviet',   // Alytus County
  'LT-KU': 'soviet',   // Kaunas County
  'LT-KL': 'soviet',   // Klaipėda County
  'LT-MR': 'soviet',   // Marijampolė County
  'LT-PN': 'soviet',   // Panevėžys County
  'LT-SA': 'soviet',   // Šiauliai County
  'LT-TA': 'soviet',   // Tauragė County
  'LT-TE': 'soviet',   // Telšiai County
  'LT-UT': 'soviet',   // Utena County
  'LT-VL': 'soviet',   // Vilnius County

  // ============================================
  // KAZAKHSTAN (White-controlled)
  // ============================================
  'KZ-AKM': 'white',  // Akmola Region
  'KZ-AKT': 'white',  // Aktobe Region
  'KZ-ALA': 'white',  // Almaty (city)
  'KZ-ALM': 'white',  // Almaty Region
  'KZ-AST': 'white',  // Astana (city)
  'KZ-ATY': 'white',  // Atyrau Region
  'KZ-KAR': 'white',  // Karaganda Region
  'KZ-KUS': 'white',  // Kostanay Region
  'KZ-KZY': 'white',  // Kyzylorda Region
  'KZ-MAN': 'white',  // Mangystau Region
  'KZ-PAV': 'white',  // Pavlodar Region
  'KZ-SEV': 'white',  // North Kazakhstan Region
  'KZ-VOS': 'white',  // East Kazakhstan Region
  'KZ-YUZ': 'white',  // South Kazakhstan Region
  'KZ-ZAP': 'white',  // West Kazakhstan Region
  'KZ-ZHA': 'white',  // Jambyl Region

  // ============================================
  // UZBEKISTAN (White-controlled) - ADM0
  // ============================================
  'UZB': 'white',     // Uzbekistan (country)

  // ============================================
  // TURKMENISTAN (White-controlled)
  // ============================================
  'TM-A': 'white',    // Ahal Region
  'TM-B': 'white',    // Balkan Region
  'TM-D': 'white',    // Dashoguz Region
  'TM-L': 'white',    // Lebap Region
  'TM-M': 'white',    // Mary Region

  // ============================================
  // KYRGYZSTAN (White-controlled)
  // ============================================
  'KG-B': 'white',    // Batken Region
  'KG-C': 'white',    // Chüy Region
  'KG-J': 'white',    // Jalal-Abad Region
  'KG-N': 'white',    // Naryn Region
  'KG-O': 'white',    // Osh Region
  'KG-T': 'white',    // Talas Region
  'KG-Y': 'white',    // Issyk-Kul Region

  // ============================================
  // TAJIKISTAN (White-controlled)
  // ============================================
  'TJ-DU': 'white',   // Dushanbe (city)
  'TJ-GB': 'white',   // Gorno-Badakhshan
  'TJ-KT': 'white',   // Khatlon Region
  'TJ-RA': 'white',   // Districts of Republican Subordination
  'TJ-SU': 'white',   // Sughd Region

  // ============================================
  // CAUCASUS / TRANSCAUCASIA (White-controlled)
  // ============================================
  'GEO': 'white',    // Georgia (country)
  'ARM': 'white',    // Armenia (country)
  'AZE': 'white',    // Azerbaijan (country)

  // ============================================
  // GERMANY (German Empire)
  // ============================================
  'DE-BB': 'germany', 'DE-BE': 'germany', 'DE-BW': 'germany', 'DE-BY': 'germany',
  'DE-HB': 'germany', 'DE-HE': 'germany', 'DE-HH': 'germany', 'DE-MV': 'germany',
  'DE-NI': 'germany', 'DE-NW': 'germany', 'DE-RP': 'germany', 'DE-SH': 'germany',
  'DE-SL': 'germany', 'DE-SN': 'germany', 'DE-ST': 'germany', 'DE-TH': 'germany',

  // ============================================
  // POLAND (Kingdom of Poland - German puppet state)
  // ============================================
  'PL-DS': 'poland', 'PL-KP': 'poland', 'PL-LB': 'poland', 'PL-LD': 'poland',
  'PL-LU': 'poland', 'PL-MA': 'poland', 'PL-MZ': 'poland', 'PL-OP': 'poland',
  'PL-PD': 'poland', 'PL-PK': 'poland', 'PL-PM': 'poland', 'PL-SK': 'poland',
  'PL-SL': 'poland', 'PL-WN': 'poland', 'PL-WP': 'poland', 'PL-ZP': 'poland',

  // ============================================
  // AUSTRIA-HUNGARY (Empire)
  // ============================================
  'AT-1': 'austriahungary', 'AT-2': 'austriahungary', 'AT-3': 'austriahungary', 'AT-4': 'austriahungary',
  'AT-5': 'austriahungary', 'AT-6': 'austriahungary', 'AT-7': 'austriahungary', 'AT-8': 'austriahungary', 'AT-9': 'austriahungary',
  'HU-BA': 'austriahungary', 'HU-BE': 'austriahungary', 'HU-BK': 'austriahungary', 'HU-BZ': 'austriahungary',
  'HU-CS': 'austriahungary', 'HU-FE': 'austriahungary', 'HU-GS': 'austriahungary', 'HU-HB': 'austriahungary',
  'HU-HE': 'austriahungary', 'HU-JN': 'austriahungary', 'HU-KE': 'austriahungary', 'HU-NO': 'austriahungary',
  'HU-PE': 'austriahungary', 'HU-SO': 'austriahungary', 'HU-SZ': 'austriahungary', 'HU-TO': 'austriahungary',
  'HU-VA': 'austriahungary', 'HU-VE': 'austriahungary', 'HU-ZA': 'austriahungary',
  'CZ-10': 'austriahungary', 'CZ-20': 'austriahungary', 'CZ-31': 'austriahungary', 'CZ-32': 'austriahungary',
  'CZ-41': 'austriahungary', 'CZ-42': 'austriahungary', 'CZ-51': 'austriahungary', 'CZ-52': 'austriahungary',
  'CZ-53': 'austriahungary', 'CZ-63': 'austriahungary', 'CZ-64': 'austriahungary', 'CZ-71': 'austriahungary',
  'CZ-72': 'austriahungary', 'CZ-80': 'austriahungary',
  'SK-BC': 'austriahungary', 'SK-BL': 'austriahungary', 'SK-KI': 'austriahungary', 'SK-NI': 'austriahungary',
  'SK-PV': 'austriahungary', 'SK-TA': 'austriahungary', 'SK-TC': 'austriahungary', 'SK-ZI': 'austriahungary',

  // ============================================
  // BALKANS (Foreign Powers)
  // ============================================
  'RO-AB': 'romania', 'RO-AG': 'romania', 'RO-AR': 'romania', 'RO-B': 'romania',
  'RO-BC': 'romania', 'RO-BH': 'romania', 'RO-BN': 'romania', 'RO-BR': 'romania',
  'RO-BT': 'romania', 'RO-BV': 'romania', 'RO-BZ': 'romania', 'RO-CJ': 'romania',
  'RO-CL': 'romania', 'RO-CS': 'romania', 'RO-CT': 'romania', 'RO-CV': 'romania',
  'RO-DB': 'romania', 'RO-DJ': 'romania', 'RO-GJ': 'romania', 'RO-GL': 'romania',
  'RO-GR': 'romania', 'RO-HD': 'romania', 'RO-HR': 'romania', 'RO-IF': 'romania',
  'RO-IL': 'romania', 'RO-IS': 'romania', 'RO-MH': 'romania', 'RO-MM': 'romania',
  'RO-MS': 'romania', 'RO-NT': 'romania', 'RO-OT': 'romania', 'RO-PH': 'romania',
  'RO-SB': 'romania', 'RO-SJ': 'romania', 'RO-SM': 'romania', 'RO-SV': 'romania',
  'RO-TL': 'romania', 'RO-TM': 'romania', 'RO-TR': 'romania', 'RO-VL': 'romania',
  'RO-VN': 'romania', 'RO-VS': 'romania',
  'BG-01': 'bulgaria', 'BG-02': 'bulgaria', 'BG-03': 'bulgaria', 'BG-04': 'bulgaria',
  'BG-05': 'bulgaria', 'BG-06': 'bulgaria', 'BG-07': 'bulgaria', 'BG-08': 'bulgaria',
  'BG-09': 'bulgaria', 'BG-10': 'bulgaria', 'BG-11': 'bulgaria', 'BG-12': 'bulgaria',
  'BG-13': 'bulgaria', 'BG-14': 'bulgaria', 'BG-15': 'bulgaria', 'BG-16': 'bulgaria',
  'BG-17': 'bulgaria', 'BG-18': 'bulgaria', 'BG-19': 'bulgaria', 'BG-20': 'bulgaria',
  'BG-21': 'bulgaria', 'BG-22': 'bulgaria', 'BG-23': 'bulgaria', 'BG-24': 'bulgaria',
  'BG-25': 'bulgaria', 'BG-26': 'bulgaria', 'BG-27': 'bulgaria', 'BG-28': 'bulgaria',
  'RS-00': 'austriahungary', 'RS-01': 'austriahungary', 'RS-02': 'austriahungary', 'RS-03': 'austriahungary',
  'RS-04': 'austriahungary', 'RS-05': 'austriahungary', 'RS-06': 'austriahungary', 'RS-07': 'austriahungary',
  'RS-08': 'austriahungary', 'RS-09': 'austriahungary', 'RS-10': 'austriahungary', 'RS-11': 'austriahungary',
  'RS-12': 'austriahungary', 'RS-13': 'austriahungary', 'RS-14': 'austriahungary', 'RS-15': 'austriahungary',
  'RS-16': 'austriahungary', 'RS-17': 'austriahungary', 'RS-18': 'austriahungary', 'RS-19': 'austriahungary',
  'RS-20': 'austriahungary', 'RS-21': 'austriahungary', 'RS-22': 'austriahungary', 'RS-23': 'austriahungary',
  'RS-24': 'austriahungary',
  'AL-01': 'foreign', 'AL-02': 'foreign', 'AL-03': 'foreign', 'AL-04': 'foreign',
  'AL-05': 'foreign', 'AL-06': 'foreign', 'AL-07': 'foreign', 'AL-08': 'foreign',
  'AL-09': 'foreign', 'AL-10': 'foreign', 'AL-11': 'foreign', 'AL-12': 'foreign',
  'GR-AI': 'foreign', 'GR-AT': 'foreign', 'GR-CR': 'foreign', 'GR-EM': 'foreign',
  'GR-MA': 'foreign', 'GR-MH': 'foreign', 'GR-PW': 'foreign', 'GR-TC': 'foreign',
  'MNE': 'austriahungary', 'BA-BIH*': 'austriahungary', 'BA-BRC*': 'austriahungary', 'BA-SRP*': 'austriahungary',
  'HR-01': 'austriahungary', 'HR-02': 'austriahungary', 'HR-03': 'austriahungary', 'HR-04': 'austriahungary',
  'HR-05': 'austriahungary', 'HR-06': 'austriahungary', 'HR-07': 'austriahungary', 'HR-08': 'austriahungary',
  'HR-09': 'austriahungary', 'HR-10': 'austriahungary', 'HR-11': 'austriahungary', 'HR-12': 'austriahungary',
  'HR-13': 'austriahungary', 'HR-14': 'austriahungary', 'HR-15': 'austriahungary', 'HR-16': 'austriahungary',
  'HR-17': 'austriahungary', 'HR-18': 'austriahungary', 'HR-19': 'austriahungary', 'HR-20': 'austriahungary',
  'HR-21': 'austriahungary',
  'SI03': 'austriahungary', 'SI04': 'austriahungary',

  // ============================================
  // NORTH MACEDONIA & KOSOVO (Foreign Power)
  // ============================================
  '19869673B18118429348634': 'foreign', '19869673B18425588006505': 'foreign',
  '19869673B2276524487216': 'foreign', '19869673B24262378327284': 'foreign',
  '19869673B25367051519859': 'foreign', '19869673B29343041094723': 'foreign',
  '19869673B59759079390778': 'foreign', '19869673B93268339583324': 'foreign',
  '2360587B11570115914955': 'foreign', '2360587B15813948402025': 'foreign',
  '2360587B5118871504069': 'foreign', '2360587B74553771763221': 'foreign',
  '2360587B89959345704230': 'foreign', '2360587B9056373484571': 'foreign',
  '2360587B95703323116719': 'foreign',

  // ============================================
  // MOLDOVA (White/Neutral)
  // ============================================
  'MD-AN': 'white', 'MD-BA': 'white', 'MD-BD': 'white', 'MD-BR': 'white',
  'MD-BS': 'white', 'MD-CA': 'white', 'MD-CL': 'white', 'MD-CM': 'white',
  'MD-CR': 'white', 'MD-CS': 'white', 'MD-CT': 'white', 'MD-CU': 'white',
  'MD-DO': 'white', 'MD-DR': 'white', 'MD-DU': 'white', 'MD-ED': 'white',
  'MD-FA': 'white', 'MD-FL': 'white', 'MD-GA': 'white', 'MD-GL': 'white',
  'MD-HI': 'white', 'MD-IA': 'white', 'MD-LE': 'white', 'MD-NI': 'white',
  'MD-OC': 'white', 'MD-OR': 'white', 'MD-RE': 'white', 'MD-RI': 'white',
  'MD-SD': 'white', 'MD-SI': 'white', 'MD-SN': 'white', 'MD-SO': 'white',
  'MD-ST': 'white', 'MD-SV': 'white', 'MD-TA': 'white', 'MD-TE': 'white',
  'MD-UN': 'white',
};
