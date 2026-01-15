# Adjacency Detection Optimization Plan

## Problem Statement

The adjacency JSON generation process is slow due to O(n²) complexity in polygon intersection checks. For ~200 regions across multiple countries, the current implementation performs thousands of expensive geometry operations.

## Current Performance Bottlenecks

### 1. Cross-Border Adjacency Detection (`detectCrossBorderAdjacency`)
- **Complexity**: O(n×m) where n, m are region counts in different countries
- **Issue**: Compares every region pair across country boundaries
- **Expensive operations**:
  - `turf.buffer()` called for every pair (~thousands of times)
  - `turf.booleanIntersects()` on buffered geometries

### 2. Same-Country Adjacency Detection (`detectSameCountryAdjacency`)
- **Complexity**: O(n²) within each country
- **Issue**: Even with bbox filtering, still checks many unnecessary pairs
- **Expensive operations**:
  - `turf.booleanIntersects()` called for bbox-overlapping pairs

### 3. Isolated Region Detection (`detectIsolatedRegionAdjacency`)
- **Complexity**: O(n×m) for isolated regions
- **Issue**: Linear scan through all features for each isolated region

## Solution: RBush Spatial Index

### Overview

Replace brute-force O(n²) comparisons with **RBush** (R-tree-based 2D spatial index):
- **Index construction**: O(n log n)
- **Spatial queries**: O(log n + k) where k is result size
- **Expected speedup**: 10-50x for this dataset size

### Key Optimizations

#### 1. Spatial Indexing
- Build RBush index with all features' bounding boxes
- Query only nearby candidates instead of checking all pairs
- Reduces comparison space from O(n²) to O(n log n)

#### 2. Geometry Caching
- Pre-compute buffered geometries once per feature
- Reuse cached buffers across all comparisons
- Eliminates redundant `turf.buffer()` calls

#### 3. Early Termination
- Break out of loops once adjacency is found
- Skip already-known adjacent pairs

## Implementation Details

### New Files

#### `scripts/lib/spatial-index.ts`
```typescript
import RBush from 'rbush';
import type { Feature } from 'geojson';

interface IndexedFeature {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  feature: Feature;
  regionId: string;
  countryIso3: string;
}

// Build spatial index from features
// Use bulk loading (load()) for 2-3x faster indexing
export function buildSpatialIndex(features: Feature[]): RBush<IndexedFeature>

// Query features within expanded bounding box
export function queryNearby(
  tree: RBush<IndexedFeature>,
  bbox: [number, number, number, number],
  margin: number
): IndexedFeature[]
```

### Modified Files

#### `scripts/lib/adjacency-detector.ts`

**Before:**
```typescript
// Nested loops comparing ALL pairs
for (const featureA of features1) {
  for (const featureB of features2) {
    if (bboxIntersects(bboxA, bboxB)) {
      const bufferedA = turf.buffer(featureA, 2, { units: 'km' });
      const bufferedB = turf.buffer(featureB, 2, { units: 'km' });
      if (turf.booleanIntersects(bufferedA, bufferedB)) {
        // Add adjacency
      }
    }
  }
}
```

**After:**
```typescript
// 1. Build spatial index (once)
const tree = buildSpatialIndex(allFeatures);

// 2. Pre-compute buffered geometries (once per feature)
const bufferCache = new Map();
for (const feature of allFeatures) {
  bufferCache.set(regionId, turf.buffer(feature, 2, { units: 'km' }));
}

// 3. Query only nearby candidates
for (const feature of allFeatures) {
  const bbox = computeBBox(feature);
  const candidates = queryNearby(tree, bbox, margin);
  
  for (const candidate of candidates) {
    // Filter by country, check cache for existing adjacency
    if (shouldCheck(feature, candidate)) {
      const bufferedA = bufferCache.get(idA);
      const bufferedB = bufferCache.get(idB);
      if (turf.booleanIntersects(bufferedA, bufferedB)) {
        // Add adjacency
      }
    }
  }
}
```

### Algorithm Changes

#### detectCrossBorderAdjacency()
1. Build single spatial index for ALL features
2. Cache all buffered geometries upfront
3. For each feature, query candidates with bbox margin
4. Filter candidates to different country only
5. Use cached buffers for intersection check

#### detectSameCountryAdjacency()
1. Use same spatial index
2. For each feature, query candidates
3. Filter candidates to same country only
4. Direct intersection check (no buffer needed)

#### detectIsolatedRegionAdjacency()
1. Use spatial index to find isolated regions
2. For each isolated region, query by centroid or expanded bbox
3. Check containment/intersection

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| **Time Complexity** | O(n²) | O(n log n) |
| **Buffer Calls** | ~40,000 (200×200) | ~200 |
| **Intersection Checks** | All pairs (~40,000) | Only nearby (~1,000-2,000) |
| **Estimated Speedup** | Baseline | **10-50x faster** |

## Dependencies

Add to `package.json`:
```json
{
  "devDependencies": {
    "rbush": "^4.0.1"
  }
}
```

## Testing Strategy

1. Verify adjacency output matches existing implementation
2. Run `npm run map:build` and measure time improvement
3. Validate all edge cases:
   - Cross-border adjacencies preserved
   - Same-country adjacencies preserved
   - Isolated regions still connected
   - Custom adjacencies still applied

## Implementation Steps

1. ✅ Install `rbush` package
2. Create `scripts/lib/spatial-index.ts` with helper functions
3. Refactor `detectCrossBorderAdjacency()` to use spatial index
4. Refactor `detectSameCountryAdjacency()` to use spatial index
5. Refactor `detectIsolatedRegionAdjacency()` to use spatial index
6. Test and validate output matches original
7. Measure performance improvement

## References

- [RBush GitHub](https://github.com/mourner/rbush) - High-performance R-tree spatial index
- [Turf.js Performance Issues](https://github.com/Turfjs/turf/issues?q=performance) - Common patterns
- [pointsWithinPolygon optimization](https://github.com/Turfjs/turf/issues/2350) - Similar approach
