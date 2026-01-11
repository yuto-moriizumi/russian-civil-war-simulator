# Map Creation Tool

This directory contains tools for creating and processing map data for the Russian Civil War Simulator.

## Files

- `download-geojson.ts` - Downloads GeoJSON data from GeoBoundaries API
- `process-map.ts` - Processes GeoJSON, extracts adjacency, applies custom rules
- `map-config.json` - Configuration for countries and custom adjacency

## Usage

1. Download GeoJSON data:
   ```bash
   npx tsx scripts/download-geojson.ts
   ```

2. Process map and generate adjacency:
   ```bash
   npx tsx scripts/process-map.ts
   ```

## Custom Adjacency

The map processing automatically detects adjacency using multiple methods:

1. **Arc-sharing** (TopoJSON) - Regions sharing boundary arcs
2. **Cross-border detection** - Different countries with buffered intersection
3. **Same-country detection** - Missed adjacencies within countries
4. **Isolated region detection** - Enclaves and capital regions

However, some adjacencies cannot be detected automatically (e.g., ferry routes, straits, gameplay connections). These can be defined manually in `map-config.json`:

```json
{
  "countries": [...],
  "customAdjacency": {
    "FI-01": ["FI-19"],
    "FI-19": ["FI-01"]
  }
}
```

### Example: FI-01 and FI-19

- **FI-01** - Åland Islands (isolated archipelago in Baltic Sea)
- **FI-19** - Lapland (northern Finland)

These regions are not geographically adjacent, but can be connected for gameplay purposes (e.g., representing naval/ferry connections, or simplifying the map for better gameplay).

### Adding Custom Adjacency

1. Identify region IDs from `public/map/adjacency.json`
2. Add entries to `customAdjacency` in `map-config.json`
3. Re-run `npx tsx scripts/process-map.ts`

**Important**: Custom adjacency must be **bidirectional**. If A is adjacent to B, both entries should be present:

```json
{
  "A": ["B"],
  "B": ["A"]
}
```

The script automatically ensures bidirectionality when applying custom adjacency.

## Output

- `public/map/regions.geojson` - Combined GeoJSON with region IDs
- `public/map/adjacency.json` - Adjacency map (region ID -> neighbor IDs)
