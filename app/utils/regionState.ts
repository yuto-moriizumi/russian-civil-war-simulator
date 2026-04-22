import {
  CountryId,
  Region,
  RegionDefinitions,
  RegionOwnershipState,
  RegionState,
} from '../types/game';

const DEFAULT_OWNER: CountryId = 'neutral';

export function extractRegionDefinitions(regions: RegionState): RegionDefinitions {
  const definitions: RegionDefinitions = {};
  for (const [id, region] of Object.entries(regions)) {
    definitions[id] = {
      id: region.id,
      name: region.name,
      countryIso3: region.countryIso3,
    };
  }
  return definitions;
}

export function extractRegionOwners(regions: RegionState): RegionOwnershipState {
  const owners: RegionOwnershipState = {};
  for (const [id, region] of Object.entries(regions)) {
    owners[id] = region.owner;
  }
  return owners;
}

export function splitRegionState(regions: RegionState): {
  regionDefinitions: RegionDefinitions;
  regionOwners: RegionOwnershipState;
} {
  return {
    regionDefinitions: extractRegionDefinitions(regions),
    regionOwners: extractRegionOwners(regions),
  };
}

export function composeRegionState(
  regionDefinitions: RegionDefinitions,
  regionOwners: RegionOwnershipState,
  fallbackRegions: RegionState = {}
): RegionState {
  const regionIds = new Set([
    ...Object.keys(regionDefinitions),
    ...Object.keys(regionOwners),
    ...Object.keys(fallbackRegions),
  ]);
  const regions: RegionState = {};

  for (const id of regionIds) {
    const definition = regionDefinitions[id] ?? fallbackRegions[id] ?? createFallbackRegion(id);
    regions[id] = {
      ...definition,
      owner: regionOwners[id] ?? fallbackRegions[id]?.owner ?? DEFAULT_OWNER,
    };
  }

  return regions;
}

export function createRegionStatePatch(regions: RegionState): {
  regions: RegionState;
  regionDefinitions: RegionDefinitions;
  regionOwners: RegionOwnershipState;
} {
  const { regionDefinitions, regionOwners } = splitRegionState(regions);
  return { regions, regionDefinitions, regionOwners };
}

export function createRegionOwnersPatch(regions: RegionState): {
  regions: RegionState;
  regionOwners: RegionOwnershipState;
} {
  return {
    regions,
    regionOwners: extractRegionOwners(regions),
  };
}

function createFallbackRegion(id: string): Omit<Region, 'owner'> {
  return {
    id,
    name: id,
    countryIso3: 'UNK',
  };
}
