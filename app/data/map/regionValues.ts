/**
 * Region CP contribution values for command power calculation.
 * Default value is 1. Major cities and industrial centers have higher values.
 */
export const regionValues: Record<string, number> = {
  // Russia
  'RU-MOW': 3,  // Moscow - Capital
  'RU-SPE': 2,  // Saint Petersburg
  'RU-MOS': 2,  // Moscow Oblast

  // Ukraine
  'UA-30': 3,   // Kyiv

  // Belarus
  'BY-HM': 3,   // Minsk

  // Poland
  'PL-MZ': 4,   // Warsaw
  'PL-SL': 2,   // Silesia

  // All other regions default to value 1
};
