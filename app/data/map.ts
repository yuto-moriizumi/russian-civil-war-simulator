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
  
  // Latvia (ADM1 - now split into municipalities)
  '71098776B41268812817743': 3,     // Rīga - Capital
  
  // Lithuania
  'LT-VL': 2,   // Vilnius County - Capital
  'LT-KU': 2,   // Kaunas County - Major city
  
  // Kazakhstan
  'KZ-ALA': 3,   // Almaty (city) - Major city
  'KZ-AST': 2,   // Astana (city) - Capital
  
  // Uzbekistan (ADM1 - now split into provinces)
  // Note: Region IDs need to be populated from the generated GeoJSON
  
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
  // LATVIA (Iskolat - Latvian Soviet Government) - ADM1
  // ============================================
  '71098776B41268812817743': 'iskolat',  // Rīga - Capital
  '71098776B79799475449991': 'iskolat',  // Alūksnes novads
  '71098776B86236730304515': 'iskolat',  // Līvānu novads
  '71098776B5661553593199': 'iskolat',   // Gulbenes novads
  '71098776B75589501739909': 'iskolat',  // Ventspils novads
  '71098776B61604579096819': 'iskolat',  // Valkas novads
  '71098776B26557032040822': 'iskolat',  // Salaspils novads
  '71098776B72876713406332': 'iskolat',  // Jelgavas
  '71098776B7836540053544': 'iskolat',   // Rēzeknes
  '71098776B69315771541786': 'iskolat',  // Jūrmalas
  '71098776B54416336216712': 'iskolat',  // Ventspils
  '71098776B36836907015105': 'iskolat',  // Liepājas
  '71098776B71258051821866': 'iskolat',  // Dienvidkurzemes novads
  '71098776B9951399870342': 'iskolat',   // Kuldīgas novads
  '71098776B25519893452051': 'iskolat',  // Saldus novads
  '71098776B72530071307653': 'iskolat',  // Talsu novads
  '71098776B88120504169111': 'iskolat',  // Tukuma novads
  '71098776B58439830015402': 'iskolat',  // Dobeles novads
  '71098776B34309626401644': 'iskolat',  // Jelgavas novads
  '71098776B68624450600982': 'iskolat',  // Mārupes novads
  '71098776B97467876462064': 'iskolat',  // Bauskas novads
  '71098776B85146594431848': 'iskolat',  // Ogres novads
  '71098776B85643540098422': 'iskolat',  // Aizkraukles novads
  '71098776B48937535890319': 'iskolat',  // Jēkabpils novads
  '71098776B32517746264485': 'iskolat',  // Ludzas novads
  '71098776B8434036234200': 'iskolat',   // Rēzeknes novads
  '71098776B22234049819432': 'iskolat',  // Balvu novads
  '71098776B63357041229203': 'iskolat',  // Madonas novads
  '71098776B38544645515098': 'iskolat',  // Smiltenes novads
  '71098776B7317746382863': 'iskolat',   // Cēsu novads
  '71098776B18023994711883': 'iskolat',  // Valmieras novads
  '71098776B78485662562022': 'iskolat',  // Ādažu novads
  '71098776B49730814014776': 'iskolat',  // Ropažu novads
  '71098776B50948551270506': 'iskolat',  // Siguldas novads
  '71098776B20667457444759': 'iskolat',  // Preiļu novads
  '71098776B38282481952649': 'iskolat',  // Krāslavas novads
  '71098776B82164502050739': 'iskolat',  // Daugavpils
  '71098776B65259108099076': 'iskolat',  // Ķekavas novads
  '71098776B7518739434496': 'iskolat',   // Olaines novads
  '71098776B45130970792207': 'iskolat',  // Saulkrastu novads
  '71098776B19754450586287': 'iskolat',  // Limbažu novads
  '71098776B31603947980404': 'iskolat',  // Augšdaugavas novads
  '71098776B4894818931549': 'iskolat',   // Varakļānu novads

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
  // UZBEKISTAN (White-controlled) - ADM1
  // ============================================
  '4885205B91155372132343': 'white',   // Tashkent - Capital
  '4885205B10194269353937': 'white',   // Andijan Region
  '4885205B52900409035974': 'white',   // Namangan Region
  '4885205B77081451230863': 'white',   // Fergana Region
  '4885205B61406292800140': 'white',   // Republic of Karakalpakstan
  '4885205B19700274577063': 'white',   // Xorazm Region
  '4885205B99988496879040': 'white',   // Navoiy Region
  '4885205B83157789420886': 'white',   // Surxondaryo Region
  '4885205B88950770616501': 'white',   // Samarqand Region
  '4885205B31052891590801': 'white',   // Tashkent Region
  '4885205B28875075161645': 'white',   // Sirdaryo Region
  '4885205B95489449998794': 'white',   // Jizzakh Region
  '4885205B6498512583322': 'white',    // Bukhara Region
  '4885205B24593429876046': 'white',   // Qashqadaryo Region (country)

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
  '63332228B70486487350611': 'white',    // Azerbaijan - Contiguous
  '63332228B45413776644545': 'white',    // Azerbaijan - Nakhchivan Autonomous Republic

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
  // NORTH MACEDONIA (Foreign Power) - ADM1
  // ============================================
  '19869673B18118429348634': 'foreign', '19869673B18425588006505': 'foreign',
  '19869673B2276524487216': 'foreign', '19869673B24262378327284': 'foreign',
  '19869673B25367051519859': 'foreign', '19869673B29343041094723': 'foreign',
  '19869673B59759079390778': 'foreign', '19869673B93268339583324': 'foreign',

  // ============================================
  // MOLDOVA (White/Neutral) - Now ADM0
  // ============================================
  'MDA': 'white',

  // ============================================
  // KOSOVO (Foreign) - Now ADM0
  // ============================================
  'XKX': 'foreign',

  // ============================================
  // TURKEY (Ottoman Empire - Neutral)
  // ============================================
  '25984515B18786507826220': 'neutral',  // İstanbul
  '25984515B47806653651907': 'neutral',  // Ankara
  '25984515B59477790330217': 'neutral',  // İzmir
  '25984515B95172477822815': 'neutral',  // Adana
  '25984515B90872828599679': 'neutral',  // Adıyaman
  '25984515B26209284550223': 'neutral',  // Afyonkarahisar
  '25984515B39003465173278': 'neutral',  // Ağrı
  '25984515B32583172380009': 'neutral',  // Amasya
  '25984515B97476213604692': 'neutral',  // Antalya
  '25984515B1602304411378': 'neutral',   // Artvin
  '25984515B63739470532168': 'neutral',  // Aydın
  '25984515B55384476443375': 'neutral',  // Balıkesir
  '25984515B40051660631000': 'neutral',  // Aksaray
  '25984515B60965754972902': 'neutral',  // Ardahan
  '25984515B74564265494308': 'neutral',  // Bartın
  '25984515B679661827679': 'neutral',    // Batman
  '25984515B37590323286202': 'neutral',  // Bayburt
  '25984515B39892287187022': 'neutral',  // Bilecik
  '25984515B43512589741592': 'neutral',  // Bingöl
  '25984515B19802935753104': 'neutral',  // Bitlis
  '25984515B96039700866385': 'neutral',  // Bolu
  '25984515B90474549897215': 'neutral',  // Burdur
  '25984515B5155931768473': 'neutral',   // Bursa
  '25984515B45885295326030': 'neutral',  // Çanakkale
  '25984515B3524648625362': 'neutral',   // Çankırı
  '25984515B57743432888015': 'neutral',  // Çorum
  '25984515B90258821264291': 'neutral',  // Denizli
  '25984515B99670107521163': 'neutral',  // Diyarbakır
  '25984515B87415935832289': 'neutral',  // Düzce
  '25984515B68163725002210': 'neutral',  // Edirne
  '25984515B73855241915553': 'neutral',  // Elazığ
  '25984515B21238382887484': 'neutral',  // Erzincan
  '25984515B50530672954016': 'neutral',  // Erzurum
  '25984515B12971548112787': 'neutral',  // Eskişehir
  '25984515B63001774148772': 'neutral',  // Gaziantep
  '25984515B57211123653900': 'neutral',  // Giresun
  '25984515B36227448932647': 'neutral',  // Gümüşhane
  '25984515B57889067347253': 'neutral',  // Hakkâri
  '25984515B95117543422129': 'neutral',  // Hatay
  '25984515B20089439873245': 'neutral',  // Iğdır
  '25984515B9026957888422': 'neutral',   // Isparta
  '25984515B58862484177861': 'neutral',  // Kahramanmaraş
  '25984515B55399473509250': 'neutral',  // Karabük
  '25984515B55022069390108': 'neutral',  // Karaman
  '25984515B40631498613339': 'neutral',  // Kars
  '25984515B36972543372669': 'neutral',  // Kastamonu
  '25984515B43172796860329': 'neutral',  // Kayseri
  '25984515B30869354278170': 'neutral',  // Kilis
  '25984515B11362042972294': 'neutral',  // Kırıkkale
  '25984515B10334298996421': 'neutral',  // Kırklareli
  '25984515B83185192232063': 'neutral',  // Kırşehir
  '25984515B86381770870747': 'neutral',  // Kocaeli
  '25984515B78139731385057': 'neutral',  // Konya
  '25984515B47044460443496': 'neutral',  // Kütahya
  '25984515B80837210717778': 'neutral',  // Malatya
  '25984515B19932594956901': 'neutral',  // Manisa
  '25984515B30119007363221': 'neutral',  // Mardin
  '25984515B33535290178113': 'neutral',  // Mersin
  '25984515B57226385500606': 'neutral',  // Muğla
  '25984515B88478081264350': 'neutral',  // Muş
  '25984515B18723924091225': 'neutral',  // Nevşehir
  '25984515B59741408878569': 'neutral',  // Niğde
  '25984515B15602000155844': 'neutral',  // Ordu
  '25984515B63638727958144': 'neutral',  // Osmaniye
  '25984515B47778459062669': 'neutral',  // Rize
  '25984515B30494634933389': 'neutral',  // Sakarya
  '25984515B31080883995775': 'neutral',  // Samsun
  '25984515B34503670046284': 'neutral',  // Siirt
  '25984515B86660708585065': 'neutral',  // Sinop
  '25984515B33997294820892': 'neutral',  // Sivas
  '25984515B4318484465943': 'neutral',   // Tekirdağ
  '25984515B20532508270601': 'neutral',  // Tokat
  '25984515B1589724669162': 'neutral',   // Trabzon
  '25984515B47484816256121': 'neutral',  // Tunceli
  '25984515B95251525471141': 'neutral',  // Uşak
  '25984515B28392380114016': 'neutral',  // Van
  '25984515B60423683749854': 'neutral',  // Yalova
  '25984515B19658467647683': 'neutral',  // Yozgat
  '25984515B41902751620989': 'neutral',  // Zonguldak
  '25984515B41137800759750': 'neutral',  // Şırnak
  '25984515B35512619552530': 'neutral',  // Şanlıurfa

  // ============================================
  // PERSIA/IRAN (Neutral)
  // ============================================
  '17685810B50760377364469': 'neutral',  // Tehran
  '17685810B10287014873220': 'neutral',  // Mazandaran
  '17685810B58703616021829': 'neutral',  // North Khorasan
  '17685810B68217123081047': 'neutral',  // Kerman
  '17685810B16876171097638': 'neutral',  // Ilam
  '17685810B13889842409055': 'neutral',  // Lorestan
  '17685810B67379877863322': 'neutral',  // Markazi
  '17685810B6126582797818': 'neutral',   // Chaharmahal and Bakhtiari
  '17685810B90334917415902': 'neutral',  // Kermanshah
  '17685810B60472007491578': 'neutral',  // Hamadan
  '17685810B64585898126645': 'neutral',  // Qazvin
  '17685810B84447356108506': 'neutral',  // Gilan
  '17685810B38369866596405': 'neutral',  // Zanjan
  '17685810B43663780619119': 'neutral',  // Semnan
  '17685810B20487167396081': 'neutral',  // Isfahan
  '17685810B7382218659393': 'neutral',   // Kohgiluyeh and Boyer-Ahmad
  '17685810B3064942505232': 'neutral',   // Kurdistan
  '17685810B23440170667410': 'neutral',  // West Azerbaijan
  '17685810B30738859401369': 'neutral',  // Fars
  '17685810B83340129779815': 'neutral',  // Bushehr
  '17685810B90918579754309': 'neutral',  // Ardabil
  '17685810B1629292304739': 'neutral',   // Golestan
  '17685810B98247647047819': 'neutral',  // Razavi Khorasan
  '17685810B5034457967489': 'neutral',   // South Khorasan
  '17685810B65996934059620': 'neutral',  // Sistan and Baluchestan
  '17685810B1706611058442': 'neutral',   // Qom
  '17685810B57153227405324': 'neutral',  // Alborz
  '17685810B81741200709170': 'neutral',  // East Azerbaijan
  '17685810B18940918043543': 'neutral',  // Yazd
  '17685810B64963005891064': 'neutral',  // Hormozgan
  '17685810B99097995033086': 'neutral',  // Khuzestan
  '17685810B76974127550435': 'neutral',  // Mazandaran (duplicate?)

  // ============================================
  // MONGOLIA (Neutral)
  // ============================================
  '14279143B69842940795179': 'neutral',  // Ulaanbaatar
  '14279143B81467460095364': 'neutral',  // Uvs
  '14279143B22317554045022': 'neutral',  // Khovd
  '14279143B63368554420497': 'neutral',  // Zavkhan
  '14279143B49613281560709': 'neutral',  // Bulgan
  '14279143B47638406449643': 'neutral',  // Dornogovi
  '14279143B31648094269757': 'neutral',  // Govisumber
  '14279143B54746499726346': 'neutral',  // Sükhbaatar
  '14279143B39885639062119': 'neutral',  // Govi-Altai
  '14279143B15424694570155': 'neutral',  // Orkhon
  '14279143B49702315868913': 'neutral',  // Arkhangai
  '14279143B7576416025221': 'neutral',   // Bayankhongor
  '14279143B59026071325992': 'neutral',  // Dundgovi
  '14279143B52126529381065': 'neutral',  // Ömnögovi
  '14279143B32793669032275': 'neutral',  // Övörkhangai
  '14279143B76228648820573': 'neutral',  // Töv
  '14279143B35762276870520': 'neutral',  // Dornod
  '14279143B84215380438566': 'neutral',  // Selenge
  '14279143B20985490361275': 'neutral',  // Hovsgel
  '14279143B7284431230829': 'neutral',   // Bayan-Ölgii
  '14279143B32551742065768': 'neutral',  // Darkhan-Uul
  '14279143B70362797710090': 'neutral',  // Khentii

  // ============================================
  // CHINA/PRC (Neutral)
  // ============================================
  '43563684B17418114845297': 'neutral',  // Beijing Municipality
  '43563684B32591653033375': 'neutral',  // Shanghai Municipality
  '43563684B84701301190484': 'neutral',  // Tianjin Municipality
  '43563684B97743196909507': 'neutral',  // Chongqing Municipality
  '43563684B67556328368055': 'neutral',  // Hainan Province
  '43563684B32372453033755': 'neutral',  // Taiwan Province
  '43563684B59914390554750': 'neutral',  // Guangxi Zhuang Autonomous Region
  '43563684B30737817496648': 'neutral',  // Fujian Province
  '43563684B84540832148656': 'neutral',  // Yunnan Province
  '43563684B78583622565599': 'neutral',  // Guizhou Province
  '43563684B87813050901813': 'neutral',  // Jiangxi Province
  '43563684B64987462919315': 'neutral',  // Hunan Province
  '43563684B73528730180553': 'neutral',  // Zhejiang Province
  '43563684B41908353419915': 'neutral',  // Hubei Province
  '43563684B14397599951889': 'neutral',  // Sichuan Province
  '43563684B75549295130005': 'neutral',  // Anhui Province
  '43563684B64367354813847': 'neutral',  // Jiangsu Province
  '43563684B96917371447908': 'neutral',  // Henan Province
  '43563684B19802372559419': 'neutral',  // Tibet Autonomous Region
  '43563684B58995436924100': 'neutral',  // Shandong Province
  '43563684B46172434476792': 'neutral',  // Qinghai Province
  '43563684B64666899633249': 'neutral',  // Ningxia Ningxia Hui Autonomous Region
  '43563684B62959128536432': 'neutral',  // Shaanxi Province
  '43563684B34303967365755': 'neutral',  // Shanxi Province
  '43563684B11053367304830': 'neutral',  // Gansu Province
  '43563684B58229551045164': 'neutral',  // Hebei Province
  '43563684B26929678147954': 'neutral',  // Liaoning Province
  '43563684B3982601277390': 'neutral',   // Jilin Province
  '43563684B50492231896073': 'neutral',  // Xinjiang Uyghur Autonomous Region
  '43563684B95381459098578': 'neutral',  // Inner Mongolia Autonomous Region
  '43563684B55920014778896': 'neutral',  // Heilongjiang Province
  '43563684B97104103456250': 'neutral',  // Macau Special Administrative Region
  '43563684B69230098435171': 'neutral',  // Hong Kong Special Administrative Region
  '43563684B38891657012300': 'neutral',  // Guangzhou Province

  // ============================================
  // JAPAN (Neutral)
  // ============================================
  '47310658B199342310790': 'neutral',    // Tokyo
  '47310658B55038426470858': 'neutral',  // Osaka Prefecture
  '47310658B84955483384411': 'neutral',  // Fukuoka Prefecture
  '47310658B53666900505284': 'neutral',  // Oita
  '47310658B99690886618857': 'neutral',  // Hyogo Prefecture
  '47310658B56113460554138': 'neutral',  // Fukui Prefecture
  '47310658B66619598690773': 'neutral',  // Shiga
  '47310658B6129583352403': 'neutral',   // Nara Prefecture
  '47310658B28580642450327': 'neutral',  // Gifu Prefecture
  '47310658B36253982271084': 'neutral',  // Mie Prefecture
  '47310658B18585040133157': 'neutral',  // Wakayama Prefecture
  '47310658B92659408322453': 'neutral',  // Saitama
  '47310658B52822170400832': 'neutral',  // Fukushima
  '47310658B20461581662238': 'neutral',  // Tochigi
  '47310658B70834199776359': 'neutral',  // Aomori
  '47310658B53717877461658': 'neutral',  // Saga Prefecture
  '47310658B82893106270036': 'neutral',  // Nagasaki Prefecture
  '47310658B9011809709100': 'neutral',   // Miyazaki Prefecture
  '47310658B50146545060878': 'neutral',  // Kumamoto
  '47310658B56795339529760': 'neutral',  // Kagoshima Prefecture
  '47310658B57998234967550': 'neutral',  // Gunma
  '47310658B94014236912993': 'neutral',  // Kyoto Prefecture
  '47310658B1351727290704': 'neutral',   // Chiba
  '47310658B31759366295450': 'neutral',  // Ibaraki
  '47310658B16920518838967': 'neutral',  // Kanagawa
  '47310658B84769036468911': 'neutral',  // Hiroshima
  '47310658B78383189487115': 'neutral',  // Tottori Prefecture
  '47310658B41093195623763': 'neutral',  // Shimane
  '47310658B84734951454670': 'neutral',  // Niigata
  '47310658B40291932252870': 'neutral',  // Nagano
  '47310658B49885151916407': 'neutral',  // Aichi Prefecture
  '47310658B89229150671737': 'neutral',  // Yamanashi
  '47310658B93104231283628': 'neutral',  // Miyagi
  '47310658B1770087263252': 'neutral',   // Yamagata
  '47310658B79582216473080': 'neutral',  // Akita
  '47310658B25007192225139': 'neutral',  // Iwate
  '47310658B23327126724630': 'neutral',  // Toyama
  '47310658B25198997079345': 'neutral',  // Shizuoka
  '47310658B64524405341851': 'neutral',  // Ishikawa Prefecture
  '47310658B14484689696833': 'neutral',  // Okayama Prefecture
  '47310658B83740553463450': 'neutral',  // Tokushima Prefecture
  '47310658B3517091690': 'neutral',      // Kochi Prefecture
  '47310658B51488753471902': 'neutral',  // Ehime Prefecture
  '47310658B61159371292051': 'neutral',  // Kagawa Prefecture
  '47310658B31569081891025': 'neutral',  // Okinawa Prefecture
  '47310658B99930143900280': 'neutral',  // Hokkaido
  '47310658B89542195514726': 'neutral',  // Yamaguchi
};
