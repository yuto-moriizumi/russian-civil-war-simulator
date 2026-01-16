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
