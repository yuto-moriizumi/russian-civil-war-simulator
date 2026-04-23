import { CountryId, DivisionState, ProductionQueueItem } from '../../types/game';
import { getDivisionPrefix } from '../../data/countries';

export function generateAIDivisionName(
  countryId: CountryId,
  divisions: DivisionState,
  productionQueue: ProductionQueueItem[],
  offset: number = 0
): string {
  const prefix = getDivisionPrefix(countryId);
  const existingCount = Object.values(divisions).filter(d => d.owner === countryId).length;
  const productionCount = productionQueue.filter(p => p.owner === countryId).length;

  const totalCount = existingCount + productionCount + offset;

  const n = totalCount + 1;
  const suffix =
    n % 10 === 1 && n % 100 !== 11
      ? 'st'
      : n % 10 === 2 && n % 100 !== 12
        ? 'nd'
        : n % 10 === 3 && n % 100 !== 13
          ? 'rd'
          : 'th';

  return `${prefix} ${n}${suffix} Division`;
}
