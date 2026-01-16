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
  '28173009B19676032168465': 5,  // Moscow (city) - Capital
  '28173009B8796515134902': 4,  // Saint Petersburg (city) - Former capital
  '14850775B22712718081002': 3,   // Kyiv (city) - Major city
  
  // Industrial and strategic centers (value 2)
  '28173009B74836580104791': 2,  // Moscow Oblast - Industrial heartland
  '28173009B90810482533567': 2,  // Leningrad Oblast - Industrial
  '28173009B18259284234443': 2,  // Nizhny Novgorod Oblast - Industrial
  '28173009B92397886288731': 2,  // Sverdlovsk Oblast - Ural industrial center
  '28173009B19466568926459': 2,  // Chelyabinsk Oblast - Ural industrial
  '28173009B25497318303482': 2,  // Samara Oblast - Volga industrial
  '28173009B46424166303156': 2,  // Rostov Oblast - Southern industrial
  '28173009B83675725671802': 2,  // Krasnodar Krai - Agricultural heartland
  '28173009B46738131000378': 2,   // Republic of Tatarstan - Oil and industry
  '28173009B30250450380208': 2,   // Republic of Bashkortostan - Industrial
  '14850775B41808765507575': 2,   // Dnipropetrovsk Oblast - Industrial
  '14850775B15615817748403': 2,   // Donetsk Oblast - Coal and industry
  '14850775B15913324833724': 2,   // Kharkiv Oblast - Industrial
  '14850775B53240635394722': 2,   // Odesa Oblast - Port city
  
  // Belarus
  '45462678B57724394311820': 3,   // Minsk (city) - Capital
  
  // Finland
  '49019192B30960840619879': 3,   // Uusimaa (Helsinki) - Capital region
  
  // Estonia
  '21999144B19319879871883': 2,   // Harju County (Tallinn) - Capital
  
  // Latvia (ADM1 - now split into municipalities)
  '71098776B41268812817743': 3,     // Rīga - Capital
  
  // Lithuania
  '39236102B79521903246642': 2,   // Vilnius County - Capital
  '39236102B54951608919811': 2,   // Kaunas County - Major city
  
  // Kazakhstan
  '16772668B7707561767580': 3,   // Almaty (city) - Major city
  '16772668B6136604360804': 2,   // Astana (city) - Capital
  
  // Uzbekistan (ADM1 - now split into provinces)
  // Note: Region IDs need to be populated from the generated GeoJSON
  
  // Tajikistan
  '86453995B94288483398487': 2,   // Dushanbe (city) - Capital
  
  // Germany
  '10402087B20892132820961': 5,   // Berlin - Capital
  '10402087B86022102756745': 3,   // North Rhine-Westphalia - Industrial heartland
  '10402087B60477050509260': 2,   // Bavaria
  '10402087B60055985875400': 2,   // Baden-Württemberg
  '10402087B89016843004490': 2,   // Saxony
  
  // Poland
  'PL-MZ': 4,   // Warsaw - Capital
  'PL-SL': 2,   // Silesia - Industrial
  
  // Austria-Hungary (successors)
  '97560089B24691553772644': 5,    // Vienna - Capital
  '22733592B46801225244053': 4,   // Budapest - Capital
  '73172107B16313596965023': 3,   // Prague - Major city
  
  // Balkans
  '36066543B11747992440272': 3,    // Bucharest - Capital
  '22928101B40975042441370': 3,   // Sofia - Capital
  '41074048B91434818545320': 3,    // Belgrade - Capital
  '93993887B88980272284763': 3,    // Athens - Capital
  
  // North Macedonia & Kosovo
  '19869673B29343041094723': 3, // Skopje - Capital
  '2360587B5118871504069': 3,   // Pristina - Capital
  
  // All other regions default to value 1
};
