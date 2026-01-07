import { FactionId } from '../types/game';

/**
 * Initial region ownership at game start (November 1917 - October Revolution)
 * 
 * Soviet: Moscow and surrounding core regions (Bolshevik control)
 * White: Peripheral Russian regions (anti-Bolshevik forces)
 * Neutral: Ukrainian regions (contested/independent)
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
  // NEUTRAL REGIONS (Ukraine)
  // ============================================
  'UA-05': 'neutral',  // Vinnytsia Oblast
  'UA-07': 'neutral',  // Volyn Oblast
  'UA-09': 'neutral',  // Luhansk Oblast
  'UA-12': 'neutral',  // Dnipropetrovsk Oblast
  'UA-14': 'neutral',  // Donetsk Oblast
  'UA-18': 'neutral',  // Zhytomyr Oblast
  'UA-21': 'neutral',  // Zakarpattia Oblast
  'UA-23': 'neutral',  // Zaporizhzhia Oblast
  'UA-26': 'neutral',  // Ivano-Frankivsk Oblast
  'UA-30': 'neutral',  // Kyiv (city)
  'UA-32': 'neutral',  // Kyiv Oblast
  'UA-35': 'neutral',  // Kirovohrad Oblast
  'UA-40': 'neutral',  // Sevastopol (city)
  'UA-43': 'neutral',  // Crimea
  'UA-46': 'neutral',  // Lviv Oblast
  'UA-48': 'neutral',  // Mykolaiv Oblast
  'UA-51': 'neutral',  // Odesa Oblast
  'UA-53': 'neutral',  // Poltava Oblast
  'UA-56': 'neutral',  // Rivne Oblast
  'UA-59': 'neutral',  // Sumy Oblast
  'UA-61': 'neutral',  // Ternopil Oblast
  'UA-63': 'neutral',  // Kharkiv Oblast
  'UA-65': 'neutral',  // Kherson Oblast
  'UA-68': 'neutral',  // Khmelnytskyi Oblast
  'UA-71': 'neutral',  // Cherkasy Oblast
  'UA-74': 'neutral',  // Chernihiv Oblast
  'UA-77': 'neutral',  // Chernivtsi Oblast
};
