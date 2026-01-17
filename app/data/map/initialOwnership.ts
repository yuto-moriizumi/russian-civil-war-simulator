import { CountryId } from '../../types/game';
import { russiaOwnership } from './ownership/russia';
import { easternEuropeOwnership } from './ownership/easternEurope';
import { centralEuropeOwnership } from './ownership/centralEurope';
import { asiaOwnership } from './ownership/asia';
import { middleEastOwnership } from './ownership/middleEast';
import { otherOwnership } from './ownership/other';

/**
 * Initial region ownership at game start (November 20, 1917 - Ukrainian People's Republic declared)
 * 
 * Soviet: Moscow and surrounding core regions (Bolshevik control)
 * White: Peripheral Russian regions, Ukraine, Belarus, Finland, Baltics, Central Asia (anti-Bolshevik forces)
 */
export const initialRegionOwnership: Record<string, CountryId> = {
  ...russiaOwnership,
  ...easternEuropeOwnership,
  ...centralEuropeOwnership,
  ...asiaOwnership,
  ...middleEastOwnership,
  ...otherOwnership,
};
