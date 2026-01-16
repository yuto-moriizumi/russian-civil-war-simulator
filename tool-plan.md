# Map Tool Implementation Plan

A development tool for previewing GeoJSON and editing region ownership with a paint tool.

## Overview

**Approach:** Next.js route (`/map-tool`) with API routes for local file writes

**Key Features:**
1. **GeoJSON Preview** - Upload or fetch GeoJSON, visualize before creating adjacency graph
2. **Ownership Paint Tool** - Click/drag to assign regions to countries, with live preview
3. **File Export/Save** - Write changes to local files via API routes (dev mode only)

---

## Architecture

```
app/
├── map-tool/
│   ├── page.tsx                 # Main map tool page
│   └── components/
│       ├── MapToolCanvas.tsx    # MapLibre map with paint functionality
│       ├── GeoJSONLoader.tsx    # File upload + URL input
│       ├── CountryPalette.tsx   # Country selector (paint brush)
│       ├── AdjacencyPreview.tsx # Show detected adjacencies
│       └── ExportPanel.tsx      # Save/export controls
├── api/
│   └── map-tool/
│       ├── save-ownership/
│       │   └── route.ts         # POST: Write ownership to TS files
│       ├── generate-adjacency/
│       │   └── route.ts         # POST: Generate adjacency from GeoJSON
│       └── load-geojson/
│           └── route.ts         # GET: Load GeoJSON from URL (proxy)
```

---

## Features Detail

### 1. GeoJSON Preview

**Purpose:** Visualize GeoJSON data before running the full map processing pipeline

**Inputs:**
- File upload (drag & drop or file picker)
- URL input (fetch from GeoBoundaries or custom URL)
- Load current project GeoJSON (`/public/map/regions.geojson`)

**Display:**
- Render all features on MapLibre map
- Show region IDs on hover
- Color by `countryIso3` property or neutral gray
- Display feature count and bounding box

**Adjacency Preview:**
- Button to compute adjacency on-the-fly using Turf.js
- Highlight adjacent regions when hovering
- Show adjacency stats (total connections, isolated regions)

### 2. Ownership Paint Tool

**Purpose:** Visually assign/reassign regions to countries

**UI Components:**

| Component | Description |
|-----------|-------------|
| **Country Palette** | Grid of country buttons with colors/flags from `COUNTRY_METADATA` |
| **Active Brush** | Shows currently selected country |
| **Paint Modes** | Single click, drag paint, fill region |
| **Undo/Redo** | History stack for changes |

**Workflow:**
1. Select a country from palette (e.g., "Soviet Russia")
2. Click on regions to assign ownership
3. Shift+drag to paint multiple regions
4. Right-click to pick country from clicked region (eyedropper)

**Visual Feedback:**
- Regions colored by current ownership (using `COUNTRY_COLORS`)
- Changed regions highlighted with border
- Unsaved changes indicator

### 3. Export & Save

**Export Options:**

| Format | Description | Use Case |
|--------|-------------|----------|
| **JSON** | `{ "RU-MOW": "soviet", "RU-SPE": "soviet", ... }` | Manual integration, backup |
| **TypeScript** | Update `app/data/map/ownership/*.ts` files directly | Immediate integration |

**API Endpoints:**

#### `POST /api/map-tool/save-ownership`
```typescript
// Request body
{
  ownership: Record<string, CountryId>,
  format: 'json' | 'typescript',
  filename?: string  // For JSON export
}

// Response
{
  success: boolean,
  filesWritten: string[],
  message: string
}
```

**Safety:**
- Only works in development mode (`NODE_ENV === 'development'`)
- Creates backup before overwriting
- Validates country IDs against `CountryId` type

#### `POST /api/map-tool/generate-adjacency`
```typescript
// Request body
{
  geojson: FeatureCollection,
  options: {
    bufferKm: number,        // Cross-border buffer (default: 2)
    detectIsolated: boolean  // Find enclaves (default: true)
  }
}

// Response
{
  adjacency: Record<string, string[]>,
  stats: {
    totalRegions: number,
    totalConnections: number,
    isolatedRegions: string[]
  }
}
```

---

## Component Specifications

### MapToolCanvas.tsx

Reuses logic from `GameMap.tsx` but simplified:
- No unit markers, combat, or game state
- Click handler for painting instead of selection
- Feature-state for highlighting painted regions

```typescript
interface MapToolCanvasProps {
  geojson: FeatureCollection | null;
  ownership: Record<string, CountryId>;
  selectedCountry: CountryId;
  adjacency: Record<string, string[]> | null;
  showAdjacency: boolean;
  onRegionPaint: (regionId: string) => void;
  onRegionHover: (regionId: string | null) => void;
}
```

### CountryPalette.tsx

Grid display of all paintable countries:

```typescript
interface CountryPaletteProps {
  selectedCountry: CountryId;
  onSelectCountry: (country: CountryId) => void;
  recentlyUsed: CountryId[];  // Quick access to recent selections
}
```

**Layout:**
- 4-column grid of country buttons
- Each shows: flag icon, short name, color swatch
- Selected country highlighted
- Filterable/searchable for many countries

### GeoJSONLoader.tsx

```typescript
interface GeoJSONLoaderProps {
  onLoad: (geojson: FeatureCollection, source: string) => void;
  isLoading: boolean;
}
```

**Sections:**
1. **Current Project** - Button to load `/map/regions.geojson`
2. **File Upload** - Drag & drop zone
3. **URL Input** - Text field + Load button

### ExportPanel.tsx

```typescript
interface ExportPanelProps {
  ownership: Record<string, CountryId>;
  hasChanges: boolean;
  onSave: (format: 'json' | 'typescript') => Promise<void>;
  onExportJSON: () => void;  // Download to browser
  onReset: () => void;
}
```

---

## State Management

Use React state (or Zustand if complexity grows):

```typescript
interface MapToolState {
  // Data
  geojson: FeatureCollection | null;
  geojsonSource: string;  // filename or URL
  ownership: Record<string, CountryId>;
  originalOwnership: Record<string, CountryId>;  // For diff
  adjacency: Record<string, string[]> | null;
  
  // UI
  selectedCountry: CountryId;
  hoveredRegion: string | null;
  showAdjacency: boolean;
  paintMode: 'click' | 'drag';
  
  // History
  history: Record<string, CountryId>[];
  historyIndex: number;
}
```

---

## Implementation Order

### Phase 1: Basic Structure
- [ ] Create `/app/map-tool/page.tsx` with layout
- [ ] Create `MapToolCanvas.tsx` - basic MapLibre rendering
- [ ] Create `GeoJSONLoader.tsx` - file upload and URL fetch
- [ ] Load and display GeoJSON with neutral coloring

### Phase 2: Ownership Display
- [ ] Create `CountryPalette.tsx` - country selector grid
- [ ] Load initial ownership from `initialRegionOwnership`
- [ ] Color regions by ownership using `COUNTRY_COLORS`
- [ ] Region hover tooltip showing ID, name, owner

### Phase 3: Paint Tool
- [ ] Click-to-paint single region
- [ ] Drag-to-paint multiple regions
- [ ] Eyedropper (right-click to pick color)
- [ ] Undo/redo history

### Phase 4: Adjacency Preview
- [ ] Port adjacency detection from `scripts/lib/adjacency-detector.ts`
- [ ] Button to compute adjacency
- [ ] Highlight adjacent regions on hover
- [ ] Show isolated region warnings

### Phase 5: Export & Save
- [ ] Create `POST /api/map-tool/save-ownership` route
- [ ] Create `ExportPanel.tsx` component
- [ ] JSON download (browser-side)
- [ ] TypeScript file write (API route)
- [ ] Backup creation before overwrite

### Phase 6: Polish
- [ ] Keyboard shortcuts (1-9 for recent countries, Ctrl+Z undo)
- [ ] Unsaved changes warning on navigation
- [ ] Loading states and error handling
- [ ] Mobile-friendly layout (if needed)

---

## File Dependencies

**Reuse from existing codebase:**
- `app/data/countries.ts` - `COUNTRY_METADATA`, `CountryId`
- `app/types/game.ts` - Type definitions
- `app/components/GameMap/mapStyles.ts` - Color expressions
- `scripts/lib/adjacency-detector.ts` - Adjacency algorithms (may need browser-compatible version)

**New shared utilities:**
- `app/utils/geojsonUtils.ts` - GeoJSON parsing, validation (if not already browser-compatible)

---

## Security Considerations

1. **Dev-only file writes** - API routes check `NODE_ENV`
2. **Path validation** - Prevent directory traversal in save routes
3. **Input validation** - Validate GeoJSON structure, country IDs
4. **CORS for URL fetch** - Proxy through API route to avoid CORS issues

---

## Future Enhancements

- **Diff view** - Show changed regions side-by-side
- **Bulk operations** - Select multiple regions, assign to country
- **Region search** - Find region by ID or name
- **Custom adjacency editor** - Add/remove adjacency connections
- **Map config editor** - Edit `map-config.json` visually
- **Electron wrapper** - Package as standalone app if needed
