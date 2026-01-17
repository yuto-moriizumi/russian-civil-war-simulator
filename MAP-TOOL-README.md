# Map Tool

A development tool for previewing GeoJSON and editing region ownership with an interactive paint tool.

## Access

Navigate to: **http://localhost:3000/map-tool** (when running `npm run dev`)

## Features

### 1. GeoJSON Preview
- **Load Current Project**: Load the existing `/public/map/regions.geojson`
- **File Upload**: Drag and drop `.geojson` files
- **URL Fetch**: Load GeoJSON from external URLs

### 2. Interactive Paint Tool
- **Click Mode**: Click individual regions to assign ownership
- **Drag Mode**: Shift+drag to paint multiple regions at once
- **Eyedropper**: Right-click any region to pick its current owner
- **Undo/Redo**: Full history with Ctrl+Z / Ctrl+Shift+Z

### 3. Adjacency Preview
- **Generate Adjacency**: Compute region adjacencies using Turf.js
- **Visual Preview**: Hover over regions to see their neighbors highlighted
- **Statistics**: View total connections and isolated regions

### 4. Export & Save
- **Export JSON**: Download ownership data as JSON file
- **Save to TypeScript**: Write directly to `app/data/map/ownership/*.ts` files (dev only)
- **Auto-categorization**: Regions automatically grouped by geography

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo |
| `Ctrl+S` / `Cmd+S` | Save to TypeScript files |
| `Ctrl+E` / `Cmd+E` | Export JSON |
| `Right-click` | Pick country (eyedropper) |

## Workflow

### Basic Workflow
1. **Load GeoJSON** - Click "Load Current Project" or upload a file
2. **Select Country** - Choose from the country palette
3. **Paint Regions** - Click or drag to assign ownership
4. **Preview** - Generate adjacency to visualize connections
5. **Export** - Save changes or download JSON

### Advanced: Editing Existing Ownership
1. Load current project GeoJSON
2. Regions automatically load with existing ownership from `initialRegionOwnership`
3. Make changes using the paint tool
4. Click "Save to TypeScript Files" to update source files
5. Changes are automatically grouped into files:
   - `russia.ts` - Russian regions (RU-*, RUS)
   - `easternEurope.ts` - Ukraine, Belarus, Finland, Baltics, Moldova
   - `centralEurope.ts` - Poland, Germany, Austria, Czechia, Slovakia, Hungary, Romania
   - `balkans.ts` - Croatia, Serbia, Slovenia, Bosnia, Albania, Macedonia, Bulgaria, Greece, Montenegro, Kosovo
   - `asia.ts` - Kazakhstan, Central Asia, China, Mongolia, Japan, Korea
   - `middleEast.ts` - Turkey, Iran, Iraq, Caucasus, Arabian Peninsula
   - `other.ts` - Regions that don't fit other categories (should be minimal)

## API Routes (Dev Mode Only)

### POST `/api/map-tool/save-ownership`
Save ownership data to local files.

**Request:**
```json
{
  "ownership": { "RU-MOW": "soviet", "RU-SPE": "soviet" },
  "format": "typescript" | "json",
  "filename": "optional-name.json"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Wrote 5 TypeScript files",
  "filesWritten": ["/.../russia.ts", "..."]
}
```

### POST `/api/map-tool/generate-adjacency`
Generate adjacency graph from GeoJSON.

**Request:**
```json
{
  "geojson": { "type": "FeatureCollection", "features": [...] },
  "options": {
    "bufferKm": 2,
    "detectIsolated": true
  }
}
```

**Response:**
```json
{
  "adjacency": { "RU-MOW": ["RU-MOS", "RU-KLU"], ... },
  "stats": {
    "totalRegions": 1234,
    "totalConnections": 5678,
    "isolatedRegions": ["FI-01"]
  }
}
```

### POST `/api/map-tool/load-geojson`
Proxy to load GeoJSON from external URLs (avoids CORS).

**Request:**
```json
{
  "url": "https://example.com/map.geojson"
}
```

**Response:**
```json
{
  "geojson": { "type": "FeatureCollection", ... }
}
```

## Safety Features

- **Dev-only file writes**: API routes only work in development mode
- **Unsaved changes warning**: Browser alerts before leaving with unsaved changes
- **Auto-backup**: Original ownership preserved in state for reset
- **Validation**: All country IDs validated against `CountryId` type

## Technical Details

### Dependencies
- **MapLibre GL**: Map rendering
- **Turf.js**: Geospatial analysis (adjacency detection)
- **React Map GL**: React bindings for MapLibre

### Data Flow
```
GeoJSON Load → Parse Features → Initialize Ownership → Paint Tool → Export/Save
                                        ↓
                            Generate Adjacency (optional)
```

### Region Categorization Logic
Regions are automatically categorized by their ISO codes for better organization:
- **Russia** (`RU-*`, `RUS`) → `russia.ts`
- **Eastern Europe** (`UA-*`, `BY-*`, `MD-*`, `EE-*`, `LV-*`, `LT-*`, `FI-*`) → `easternEurope.ts`
- **Central Europe** (`PL-*`, `DE-*`, `CZ-*`, `SK-*`, `HU-*`, `AT-*`, `RO-*`) → `centralEurope.ts`
- **Balkans** (`HR-*`, `RS-*`, `SI-*`, `BA-*`, `MK-*`, `AL-*`, `BG-*`, `GR-*`, `ME-*`, `XK-*`) → `balkans.ts`
- **Asia** (`KZ-*`, `UZ-*`, `TM-*`, `KG-*`, `TJ-*`, `MN-*`, `CN-*`, `JP-*`, `KR-*`, `KP-*`) → `asia.ts`
- **Middle East** (`TR-*`, `IR-*`, `IQ-*`, `SY-*`, `SA-*`, `AZ-*`, `AM-*`, `GE-*`, and other Arabian Peninsula countries) → `middleEast.ts`
- **Other** - Fallback for regions without clear categorization → `other.ts`

The categorization uses both `shapeISO` (regional codes like `RU-MOW`) and `countryIso3` (country codes like `RUS`) properties from the GeoJSON to ensure all regions are properly categorized.

## Future Enhancements

- [ ] Diff view showing changes side-by-side
- [ ] Bulk region selection and assignment
- [ ] Search regions by ID or name
- [ ] Custom adjacency editor
- [ ] Visual map config editor
- [ ] Electron wrapper for distribution
