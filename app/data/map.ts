import { FactionId } from '../types/game';

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
  // All other regions default to value 1
};

/**
 * Initial region ownership at game start (November 1917 - October Revolution)
 * 
 * Soviet: Moscow and surrounding core regions (Bolshevik control)
 * White: Peripheral Russian regions, Ukraine, Belarus, Finland, Baltics, Central Asia (anti-Bolshevik forces)
 */
export const initialRegionOwnership: Record<string, FactionId> = {
  // ============================================
  // SOVIET CORE REGIONS (Moscow and surroundings)
  // ============================================
  'RU-MOW': 'soviet',  // Moscow (city)
  'RU-MOS': 'soviet',  // Moscow Oblast
  'RU-TVE': 'soviet',  // Tver Oblast
  'RU-YAR': 'soviet',  // Yaroslavl Oblast
  'RU-KOS': 'soviet',  // Kostroma Oblast
  'RU-IVA': 'soviet',  // Ivanovo Oblast
  'RU-VLA': 'soviet',  // Vladimir Oblast
  'RU-RYA': 'soviet',  // Ryazan Oblast
  'RU-TUL': 'soviet',  // Tula Oblast
  'RU-KLU': 'soviet',  // Kaluga Oblast
  'RU-SMO': 'soviet',  // Smolensk Oblast
  'RU-NIZ': 'soviet',  // Nizhny Novgorod Oblast

  // ============================================
  // WHITE-CONTROLLED RUSSIAN REGIONS
  // ============================================
  // Northwest Russia
  'RU-SPE': 'white',   // Saint Petersburg (city)
  'RU-LEN': 'white',   // Leningrad Oblast
  'RU-NGR': 'white',   // Novgorod Oblast
  'RU-PSK': 'white',   // Pskov Oblast
  'RU-KR': 'white',    // Republic of Karelia
  'RU-MUR': 'white',   // Murmansk Oblast
  'RU-ARK': 'white',   // Arkhangelsk Oblast
  'RU-NEN': 'white',   // Nenets Autonomous Okrug
  'RU-VLG': 'white',   // Vologda Oblast

  // Central Russia (non-Soviet)
  'RU-BRY': 'white',   // Bryansk Oblast
  'RU-ORL': 'white',   // Oryol Oblast
  'RU-LIP': 'white',   // Lipetsk Oblast
  'RU-TAM': 'white',   // Tambov Oblast
  'RU-VOR': 'white',   // Voronezh Oblast
  'RU-BEL': 'white',   // Belgorod Oblast
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
  'RU-ROS': 'white',   // Rostov Oblast
  'RU-VGG': 'white',   // Volgograd Oblast
  'RU-AST': 'white',   // Astrakhan Oblast
  'RU-KL': 'white',    // Republic of Kalmykia
  'RU-KDA': 'white',   // Krasnodar Krai
  'RU-AD': 'white',    // Republic of Adygea
  'RU-STA': 'white',   // Stavropol Krai
  'RU-KC': 'white',    // Karachay-Cherkess Republic
  'RU-KB': 'white',    // Kabardino-Balkar Republic
  'RU-SE': 'white',    // Republic of North Ossetia
  'RU-IN': 'white',    // Republic of Ingushetia
  'RU-CE': 'white',    // Chechen Republic
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

  // Exclave
  'RU-KGD': 'white',   // Kaliningrad Oblast

  // ============================================
  // UKRAINE (White-controlled)
  // ============================================
  'UA-05': 'white',  // Vinnytsia Oblast
  'UA-07': 'white',  // Volyn Oblast
  'UA-09': 'white',  // Luhansk Oblast
  'UA-12': 'white',  // Dnipropetrovsk Oblast
  'UA-14': 'white',  // Donetsk Oblast
  'UA-18': 'white',  // Zhytomyr Oblast
  'UA-21': 'white',  // Zakarpattia Oblast
  'UA-23': 'white',  // Zaporizhzhia Oblast
  'UA-26': 'white',  // Ivano-Frankivsk Oblast
  'UA-30': 'white',  // Kyiv (city)
  'UA-32': 'white',  // Kyiv Oblast
  'UA-35': 'white',  // Kirovohrad Oblast
  'UA-40': 'white',  // Sevastopol (city)
  'UA-43': 'white',  // Crimea
  'UA-46': 'white',  // Lviv Oblast
  'UA-48': 'white',  // Mykolaiv Oblast
  'UA-51': 'white',  // Odesa Oblast
  'UA-53': 'white',  // Poltava Oblast
  'UA-56': 'white',  // Rivne Oblast
  'UA-59': 'white',  // Sumy Oblast
  'UA-61': 'white',  // Ternopil Oblast
  'UA-63': 'white',  // Kharkiv Oblast
  'UA-65': 'white',  // Kherson Oblast
  'UA-68': 'white',  // Khmelnytskyi Oblast
  'UA-71': 'white',  // Cherkasy Oblast
  'UA-74': 'white',  // Chernihiv Oblast
  'UA-77': 'white',  // Chernivtsi Oblast

  // ============================================
  // BELARUS (White-controlled)
  // ============================================
  'BY-BR': 'white',   // Brest Region
  'BY-HO': 'white',   // Gomel Region
  'BY-HM': 'white',   // Minsk (city)
  'BY-HR': 'white',   // Grodno Region
  'BY-MA': 'white',   // Mogilev Region
  'BY-MI': 'white',   // Minsk Region
  'BY-VI': 'white',   // Vitebsk Region

  // ============================================
  // FINLAND (White-controlled)
  // ============================================
  'FI-01': 'white',   // Åland
  'FI-02': 'white',   // South Karelia
  'FI-03': 'white',   // Southern Ostrobothnia
  'FI-04': 'white',   // Southern Savonia
  'FI-05': 'white',   // Kainuu
  'FI-06': 'white',   // Tavastia Proper
  'FI-07': 'white',   // Central Ostrobothnia
  'FI-08': 'white',   // Central Finland
  'FI-09': 'white',   // Kymenlaakso
  'FI-10': 'white',   // Lapland
  'FI-11': 'white',   // Pirkanmaa
  'FI-12': 'white',   // Ostrobothnia
  'FI-13': 'white',   // North Karelia
  'FI-14': 'white',   // Northern Ostrobothnia
  'FI-15': 'white',   // Northern Savonia
  'FI-16': 'white',   // Päijänne Tavastia
  'FI-17': 'white',   // Satakunta
  'FI-18': 'white',   // Uusimaa (Helsinki)
  'FI-19': 'white',   // Southwest Finland

  // ============================================
  // ESTONIA (White-controlled)
  // ============================================
  'EE-37': 'white',   // Harju County (Tallinn)
  'EE-39': 'white',   // Hiiu County
  'EE-44': 'white',   // Ida-Viru County
  'EE-49': 'white',   // Jõgeva County
  'EE-51': 'white',   // Järva County
  'EE-57': 'white',   // Lääne County
  'EE-59': 'white',   // Lääne-Viru County
  'EE-65': 'white',   // Põlva County
  'EE-67': 'white',   // Pärnu County
  'EE-70': 'white',   // Rapla County
  'EE-74': 'white',   // Saare County
  'EE-78': 'white',   // Tartu County
  'EE-82': 'white',   // Valga County
  'EE-84': 'white',   // Viljandi County
  'EE-86': 'white',   // Võru County

  // ============================================
  // LATVIA (White-controlled) - ADM0
  // ============================================
  'LVA': 'white',     // Latvia (country)

  // ============================================
  // LITHUANIA (White-controlled)
  // ============================================
  'LT-AL': 'white',   // Alytus County
  'LT-KU': 'white',   // Kaunas County
  'LT-KL': 'white',   // Klaipėda County
  'LT-MR': 'white',   // Marijampolė County
  'LT-PN': 'white',   // Panevėžys County
  'LT-SA': 'white',   // Šiauliai County
  'LT-TA': 'white',   // Tauragė County
  'LT-TE': 'white',   // Telšiai County
  'LT-UT': 'white',   // Utena County
  'LT-VL': 'white',   // Vilnius County

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
};
