'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RegionState, Adjacency, FactionId, Movement, Division, ActiveCombat } from '../types/game';
import { FACTION_COLORS, getAdjacentRegions } from '../utils/mapUtils';
import { getDivisionCount } from '../utils/combat';

interface GameMapProps {
  regions: RegionState;
  adjacency: Adjacency;
  selectedRegion: string | null;
  selectedUnitRegion: string | null;
  movingUnits: Movement[];
  activeCombats: ActiveCombat[];
  currentDateTime: Date;
  playerFaction: FactionId;
  unitsInReserve: number;
  onRegionSelect: (regionId: string | null) => void;
  onUnitSelect: (regionId: string | null) => void;
  onRegionHover?: (regionId: string | null) => void;
  onDeployUnit: () => void;
  onMoveUnits: (fromRegion: string, toRegion: string, count: number) => void;
  onSelectCombat: (combatId: string | null) => void;
}

export default function GameMap({
  regions,
  adjacency,
  selectedRegion,
  selectedUnitRegion,
  movingUnits,
  activeCombats,
  currentDateTime,
  playerFaction,
  unitsInReserve,
  onRegionSelect,
  onUnitSelect,
  onRegionHover,
  onDeployUnit,
  onMoveUnits,
  onSelectCombat,
}: GameMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const movingMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const combatMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const hoveredRegionRef = useRef<string | null>(null);
  const selectedUnitRegionRef = useRef<string | null>(null);
  const regionsRef = useRef<RegionState>(regions);
  const adjacencyRef = useRef<Adjacency>(adjacency);
  const onMoveUnitsRef = useRef(onMoveUnits);
  const onUnitSelectRef = useRef(onUnitSelect);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [regionCentroids, setRegionCentroids] = useState<Record<string, [number, number]>>({});

  // Calculate centroid of a polygon
  const calculateCentroid = (coordinates: number[][][]): [number, number] => {
    let totalX = 0;
    let totalY = 0;
    let totalPoints = 0;
    
    // Handle MultiPolygon by iterating all rings
    for (const ring of coordinates) {
      for (const coord of ring) {
        totalX += coord[0];
        totalY += coord[1];
        totalPoints++;
      }
    }
    
    return [totalX / totalPoints, totalY / totalPoints];
  };

  // Load region centroids from GeoJSON
  useEffect(() => {
    const loadCentroids = async () => {
      try {
        const response = await fetch('/map/regions.geojson');
        const data = await response.json();
        const centroids: Record<string, [number, number]> = {};
        
        for (const feature of data.features) {
          const id = feature.properties?.shapeISO;
          if (!id) continue;
          
          const geometry = feature.geometry;
          if (geometry.type === 'Polygon') {
            centroids[id] = calculateCentroid(geometry.coordinates);
          } else if (geometry.type === 'MultiPolygon') {
            // For MultiPolygon, use the largest polygon's centroid
            let largestRing = geometry.coordinates[0];
            let maxPoints = 0;
            for (const polygon of geometry.coordinates) {
              const points = polygon[0]?.length || 0;
              if (points > maxPoints) {
                maxPoints = points;
                largestRing = polygon;
              }
            }
            centroids[id] = calculateCentroid(largestRing);
          }
        }
        
        setRegionCentroids(centroids);
      } catch (error) {
        console.error('Failed to load centroids:', error);
      }
    };
    
    loadCentroids();
  }, []);

  // Keep refs in sync with props for use in event handlers
  useEffect(() => {
    selectedUnitRegionRef.current = selectedUnitRegion;
  }, [selectedUnitRegion]);

  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  useEffect(() => {
    adjacencyRef.current = adjacency;
  }, [adjacency]);

  useEffect(() => {
    onMoveUnitsRef.current = onMoveUnits;
  }, [onMoveUnits]);

  useEffect(() => {
    onUnitSelectRef.current = onUnitSelect;
  }, [onUnitSelect]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#1a2e1a',
            },
          },
        ],
      },
      center: [50, 55], // Center on Russia
      zoom: 3,
      minZoom: 2,
      maxZoom: 8,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add regions GeoJSON source
      map.current.addSource('regions', {
        type: 'geojson',
        data: '/map/regions.geojson',
        promoteId: 'shapeISO',
      });

      // Add fill layer for regions
      map.current.addLayer({
        id: 'regions-fill',
        type: 'fill',
        source: 'regions',
        paint: {
          'fill-color': '#808080',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            0.9,
            ['boolean', ['feature-state', 'hover'], false],
            0.8,
            ['boolean', ['feature-state', 'adjacent'], false],
            0.7,
            0.6,
          ],
        },
      });

      // Add border layer
      map.current.addLayer({
        id: 'regions-border',
        type: 'line',
        source: 'regions',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            '#FFD700',
            ['boolean', ['feature-state', 'hover'], false],
            '#FFFFFF',
            '#333333',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'selected'], false],
            3,
            ['boolean', ['feature-state', 'hover'], false],
            2,
            1,
          ],
        },
      });

      setMapLoaded(true);
    });

    // Left-click handler - select region or unit
    map.current.on('click', 'regions-fill', (e) => {
      if (e.features && e.features.length > 0) {
        const regionId = e.features[0].properties?.shapeISO;
        if (regionId) {
          // If clicking on same region, deselect
          if (regionId === selectedRegion) {
            onRegionSelect(null);
            onUnitSelect(null);
          } else {
            onRegionSelect(regionId);
            // If this region has units owned by player, also select as unit
            const region = regions[regionId];
            if (region && region.owner === playerFaction && region.divisions.length > 0) {
              onUnitSelect(regionId);
            } else {
              onUnitSelect(null);
            }
          }
        }
      }
    });

    // Right-click handler - move selected unit
    map.current.on('contextmenu', 'regions-fill', (e) => {
      e.preventDefault();
      if (e.features && e.features.length > 0) {
        const targetRegionId = e.features[0].properties?.shapeISO;
        const currentSelectedUnit = selectedUnitRegionRef.current;
        // Check if we have a unit selected and this is an adjacent region
        if (currentSelectedUnit && targetRegionId && targetRegionId !== currentSelectedUnit) {
          const adjacentRegions = getAdjacentRegions(adjacencyRef.current, currentSelectedUnit);
          if (adjacentRegions.includes(targetRegionId)) {
            const sourceRegion = regionsRef.current[currentSelectedUnit];
            if (sourceRegion && sourceRegion.divisions.length > 0) {
              // Move all units (or could use unitsToMove for partial)
              onMoveUnitsRef.current(currentSelectedUnit, targetRegionId, sourceRegion.divisions.length);
              onUnitSelectRef.current(null);
            }
          }
        }
      }
    });

    // Hover handlers
    map.current.on('mousemove', 'regions-fill', (e) => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = 'pointer';

      if (e.features && e.features.length > 0) {
        const regionId = e.features[0].properties?.shapeISO;
        if (regionId && regionId !== hoveredRegionRef.current) {
          // Clear previous hover
          if (hoveredRegionRef.current) {
            map.current.setFeatureState(
              { source: 'regions', id: hoveredRegionRef.current },
              { hover: false }
            );
          }
          // Set new hover
          map.current.setFeatureState(
            { source: 'regions', id: regionId },
            { hover: true }
          );
          hoveredRegionRef.current = regionId;
          setHoveredRegion(regionId);
          onRegionHover?.(regionId);
        }
      }
    });

    map.current.on('mouseleave', 'regions-fill', () => {
      if (!map.current) return;
      map.current.getCanvas().style.cursor = '';

      if (hoveredRegionRef.current) {
        map.current.setFeatureState(
          { source: 'regions', id: hoveredRegionRef.current },
          { hover: false }
        );
        hoveredRegionRef.current = null;
        setHoveredRegion(null);
        onRegionHover?.(null);
      }
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update region colors based on ownership
  const updateRegionColors = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    // Build color expression from regions state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colorExpression: any[] = ['match', ['get', 'shapeISO']];
    
    for (const [id, region] of Object.entries(regions)) {
      colorExpression.push(id, FACTION_COLORS[region.owner]);
    }
    
    // Default color for unmatched regions
    colorExpression.push(FACTION_COLORS.neutral);

    map.current.setPaintProperty('regions-fill', 'fill-color', colorExpression);
  }, [regions, mapLoaded]);

  useEffect(() => {
    updateRegionColors();
  }, [updateRegionColors]);

  // Update selected region state and highlight adjacent regions for unit movement
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear all feature states first
    map.current.removeFeatureState({ source: 'regions' });

    if (selectedRegion) {
      // Set selected state
      map.current.setFeatureState(
        { source: 'regions', id: selectedRegion },
        { selected: true }
      );

      // Highlight adjacent regions
      const adjacent = getAdjacentRegions(adjacency, selectedRegion);
      for (const adjId of adjacent) {
        map.current.setFeatureState(
          { source: 'regions', id: adjId },
          { adjacent: true }
        );
      }
    }

    // If a unit is selected, also highlight adjacent regions for movement
    if (selectedUnitRegion && selectedUnitRegion !== selectedRegion) {
      const adjacent = getAdjacentRegions(adjacency, selectedUnitRegion);
      for (const adjId of adjacent) {
        map.current.setFeatureState(
          { source: 'regions', id: adjId },
          { adjacent: true }
        );
      }
    }
  }, [selectedRegion, selectedUnitRegion, adjacency, mapLoaded]);

  // Update unit markers on the map
  useEffect(() => {
    if (!map.current || !mapLoaded || Object.keys(regionCentroids).length === 0) return;

    // Track which markers we need
    const neededMarkers = new Set<string>();
    
    // Create or update markers for regions with units
    for (const [regionId, region] of Object.entries(regions)) {
      if (region.divisions.length > 0) {
        neededMarkers.add(regionId);
        const centroid = regionCentroids[regionId];
        if (!centroid) continue;

        const isSelected = selectedUnitRegion === regionId;
        const isPlayerUnit = region.owner === playerFaction;
        const existingMarker = markersRef.current.get(regionId);
        
        if (existingMarker) {
          // Update existing marker
          const el = existingMarker.getElement();
          const unitCountEl = el.querySelector('.unit-count');
          if (unitCountEl) {
            unitCountEl.textContent = String(region.divisions.length);
          }
          // Update color based on owner and selection
          const bgEl = el.querySelector('.unit-bg') as HTMLElement;
          if (bgEl) {
            bgEl.style.backgroundColor = FACTION_COLORS[region.owner];
            bgEl.style.border = isSelected ? '3px solid #22d3ee' : '2px solid rgba(0,0,0,0.5)';
            bgEl.style.boxShadow = isSelected ? '0 0 10px #22d3ee' : '0 2px 4px rgba(0,0,0,0.3)';
          }
        } else {
          // Create new marker
          const el = document.createElement('div');
          el.className = 'unit-marker';
          el.innerHTML = `
            <div class="unit-bg" style="
              background-color: ${FACTION_COLORS[region.owner]};
              border: ${isSelected ? '3px solid #22d3ee' : '2px solid rgba(0,0,0,0.5)'};
              border-radius: 4px;
              padding: 2px 6px;
              display: flex;
              align-items: center;
              gap: 4px;
              box-shadow: ${isSelected ? '0 0 10px #22d3ee' : '0 2px 4px rgba(0,0,0,0.3)'};
              cursor: ${isPlayerUnit ? 'pointer' : 'default'};
              transition: all 0.2s ease;
            ">
              <span style="font-size: 12px;">&#9876;</span>
              <span class="unit-count" style="
                font-size: 12px;
                font-weight: bold;
                color: ${region.owner === 'white' ? '#000' : '#fff'};
                text-shadow: ${region.owner === 'white' ? 'none' : '1px 1px 1px rgba(0,0,0,0.5)'};
              ">${region.divisions.length}</span>
            </div>
          `;
          
          // Make marker clickable to select unit (left-click)
          el.addEventListener('click', (e) => {
            e.stopPropagation();
            onRegionSelect(regionId);
            if (isPlayerUnit) {
              onUnitSelect(regionId);
            }
          });

          const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
            .setLngLat(centroid)
            .addTo(map.current!);
          
          markersRef.current.set(regionId, marker);
        }
      }
    }

    // Remove markers for regions that no longer have units
    for (const [regionId, marker] of markersRef.current.entries()) {
      if (!neededMarkers.has(regionId)) {
        marker.remove();
        markersRef.current.delete(regionId);
      }
    }
  }, [regions, regionCentroids, mapLoaded, onRegionSelect, onUnitSelect, selectedUnitRegion, playerFaction]);

  // Update moving unit markers on the map
  useEffect(() => {
    if (!map.current || !mapLoaded || Object.keys(regionCentroids).length === 0) return;

    // Track which moving markers we need
    const neededMovingMarkers = new Set<string>();
    
    // Create or update markers for moving units
    for (const movement of movingUnits) {
      neededMovingMarkers.add(movement.id);
      
      const fromCentroid = regionCentroids[movement.fromRegion];
      const toCentroid = regionCentroids[movement.toRegion];
      if (!fromCentroid || !toCentroid) continue;

      // Calculate current position based on progress
      const totalTime = movement.arrivalTime.getTime() - movement.departureTime.getTime();
      const elapsed = currentDateTime.getTime() - movement.departureTime.getTime();
      const progress = Math.min(1, Math.max(0, elapsed / totalTime));
      
      const currentLng = fromCentroid[0] + (toCentroid[0] - fromCentroid[0]) * progress;
      const currentLat = fromCentroid[1] + (toCentroid[1] - fromCentroid[1]) * progress;

      const existingMarker = movingMarkersRef.current.get(movement.id);
      
      if (existingMarker) {
        // Update position
        existingMarker.setLngLat([currentLng, currentLat]);
      } else {
        // Create new moving marker
        const el = document.createElement('div');
        el.className = 'moving-unit-marker';
        el.innerHTML = `
          <div style="
            background-color: ${FACTION_COLORS[movement.owner]};
            border: 2px dashed #22d3ee;
            border-radius: 50%;
            padding: 4px 8px;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 0 8px rgba(34, 211, 238, 0.5);
            animation: pulse 1.5s ease-in-out infinite;
          ">
            <span style="font-size: 10px;">&#9876;</span>
            <span style="
              font-size: 10px;
              font-weight: bold;
              color: ${movement.owner === 'white' ? '#000' : '#fff'};
            ">${movement.divisions.length}</span>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([currentLng, currentLat])
          .addTo(map.current!);
        
        movingMarkersRef.current.set(movement.id, marker);
      }
    }

    // Remove markers for completed movements
    for (const [movementId, marker] of movingMarkersRef.current.entries()) {
      if (!neededMovingMarkers.has(movementId)) {
        marker.remove();
        movingMarkersRef.current.delete(movementId);
      }
    }
  }, [movingUnits, regionCentroids, mapLoaded, currentDateTime]);

  // Update combat indicator markers on the map
  useEffect(() => {
    if (!map.current || !mapLoaded || Object.keys(regionCentroids).length === 0) return;

    // Track which combat markers we need
    const neededCombatMarkers = new Set<string>();
    
    // Create or update markers for active combats
    for (const combat of activeCombats) {
      if (combat.isComplete) continue;
      
      neededCombatMarkers.add(combat.id);
      
      const centroid = regionCentroids[combat.regionId];
      if (!centroid) continue;

      const attackerHp = combat.attackerDivisions.reduce((sum, d) => sum + d.hp, 0);
      const defenderHp = combat.defenderDivisions.reduce((sum, d) => sum + d.hp, 0);
      const attackerProgress = combat.initialAttackerHp > 0 
        ? (attackerHp / combat.initialAttackerHp) * 100 
        : 0;
      const defenderProgress = combat.initialDefenderHp > 0 
        ? (defenderHp / combat.initialDefenderHp) * 100 
        : 0;

      const attackerColor = FACTION_COLORS[combat.attackerFaction];
      const defenderColor = FACTION_COLORS[combat.defenderFaction];
      const attackerTextColor = combat.attackerFaction === 'white' ? '#000' : '#fff';
      const defenderTextColor = combat.defenderFaction === 'white' ? '#000' : '#fff';

      const existingMarker = combatMarkersRef.current.get(combat.id);
      
      if (existingMarker) {
        // Update existing marker content
        const el = existingMarker.getElement();
        const attackerCountEl = el.querySelector('.attacker-count');
        const defenderCountEl = el.querySelector('.defender-count');
        const attackerBarEl = el.querySelector('.attacker-bar') as HTMLElement;
        const defenderBarEl = el.querySelector('.defender-bar') as HTMLElement;
        
        if (attackerCountEl) attackerCountEl.textContent = String(combat.attackerDivisions.length);
        if (defenderCountEl) defenderCountEl.textContent = String(combat.defenderDivisions.length);
        if (attackerBarEl) attackerBarEl.style.width = `${attackerProgress}%`;
        if (defenderBarEl) defenderBarEl.style.width = `${defenderProgress}%`;
      } else {
        // Create new combat marker
        const el = document.createElement('div');
        el.className = 'combat-marker';
        el.style.cursor = 'pointer';
        el.style.pointerEvents = 'auto';
        el.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            animation: combat-pulse 2s ease-in-out infinite;
          ">
            <!-- Attacker side -->
            <div style="display: flex; flex-direction: column; align-items: flex-end; margin-right: 2px;">
              <div style="
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                padding: 0 6px;
                min-width: 35px;
                border-radius: 3px 0 0 3px;
                background-color: ${attackerColor};
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              ">
                <span class="attacker-count" style="
                  font-size: 11px;
                  font-weight: bold;
                  color: ${attackerTextColor};
                ">${combat.attackerDivisions.length}</span>
              </div>
              <div style="height: 3px; width: 100%; background: rgba(0,0,0,0.5); border-radius: 0 0 0 2px; margin-top: 1px;">
                <div class="attacker-bar" style="height: 100%; width: ${attackerProgress}%; background: ${attackerColor}; transition: width 0.3s;"></div>
              </div>
            </div>
            
            <!-- Combat icon -->
            <div style="
              width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: radial-gradient(circle, #4a4a4a 0%, #2a2a2a 100%);
              box-shadow: 0 2px 6px rgba(0,0,0,0.5);
              border: 2px solid #666;
              z-index: 10;
            ">
              <span style="font-size: 10px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5));">&#9876;</span>
            </div>
            
            <!-- Defender side -->
            <div style="display: flex; flex-direction: column; align-items: flex-start; margin-left: 2px;">
              <div style="
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: flex-start;
                padding: 0 6px;
                min-width: 35px;
                border-radius: 0 3px 3px 0;
                background-color: ${defenderColor};
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              ">
                <span class="defender-count" style="
                  font-size: 11px;
                  font-weight: bold;
                  color: ${defenderTextColor};
                ">${combat.defenderDivisions.length}</span>
              </div>
              <div style="height: 3px; width: 100%; background: rgba(0,0,0,0.5); border-radius: 0 0 2px 0; margin-top: 1px;">
                <div class="defender-bar" style="height: 100%; width: ${defenderProgress}%; background: ${defenderColor}; transition: width 0.3s;"></div>
              </div>
            </div>
          </div>
        `;
        
        // Add click handler to open combat popup
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectCombat(combat.id);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat(centroid)
          .addTo(map.current!);
        
        combatMarkersRef.current.set(combat.id, marker);
      }
    }

    // Remove markers for completed combats
    for (const [combatId, marker] of combatMarkersRef.current.entries()) {
      if (!neededCombatMarkers.has(combatId)) {
        marker.remove();
        combatMarkersRef.current.delete(combatId);
      }
    }
  }, [activeCombats, regionCentroids, mapLoaded, onSelectCombat]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="h-full w-full" />
      
      {/* Region info tooltip - only show when no region is selected */}
      {!selectedRegion && hoveredRegion && regions[hoveredRegion] && (
        <div className="absolute left-4 bottom-16 z-10 rounded-lg border border-stone-600 bg-stone-900/90 p-3">
          <div className="text-sm font-bold text-white">
            {regions[hoveredRegion].name}
          </div>
          <div className="text-xs text-stone-400">
            ID: {hoveredRegion}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: FACTION_COLORS[regions[hoveredRegion].owner] }}
            />
            <span className="text-xs capitalize text-stone-300">
              {regions[hoveredRegion].owner}
            </span>
          </div>
          {regions[hoveredRegion].divisions.length > 0 && (
            <div className="mt-1 text-xs text-amber-400">
              Divisions: {regions[hoveredRegion].divisions.length} | 
              Total HP: {regions[hoveredRegion].divisions.reduce((sum, d) => sum + d.hp, 0)}
            </div>
          )}
        </div>
      )}

      {/* Selected region info - bottom left */}
      {selectedRegion && regions[selectedRegion] && (
        <div className={`absolute left-4 bottom-16 z-10 rounded-lg border-2 bg-stone-900/95 p-4 min-w-[280px] ${
          selectedUnitRegion === selectedRegion ? 'border-cyan-400' : 'border-amber-500'
        }`}>
          <div className={`mb-2 text-lg font-bold ${
            selectedUnitRegion === selectedRegion ? 'text-cyan-400' : 'text-amber-400'
          }`}>
            {regions[selectedRegion].name}
            {selectedUnitRegion === selectedRegion && (
              <span className="ml-2 text-xs font-normal">(Unit Selected)</span>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-stone-400">Control:</span>
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: FACTION_COLORS[regions[selectedRegion].owner] }}
              />
              <span className="capitalize text-white">
                {regions[selectedRegion].owner}
              </span>
            </div>
            <div className="text-stone-400">
              Country: {regions[selectedRegion].countryIso3}
            </div>
            <div className="text-stone-400">
              Divisions: {regions[selectedRegion].divisions.length}
            </div>
            {/* Show division combat stats */}
            {regions[selectedRegion].divisions.length > 0 && (
              <div className="mt-2 space-y-1 rounded bg-stone-800 p-2">
                <div className="text-xs font-semibold text-stone-300 mb-1">Combat Stats:</div>
                {regions[selectedRegion].divisions.map((div, idx) => (
                  <div key={div.id} className="flex items-center justify-between text-xs">
                    <span className="text-stone-400 truncate max-w-[120px]" title={div.name}>
                      {div.name.length > 15 ? div.name.substring(0, 15) + '...' : div.name}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-red-400" title="HP">❤ {div.hp}/{div.maxHp}</span>
                      <span className="text-orange-400" title="Attack">⚔ {div.attack}</span>
                      <span className="text-blue-400" title="Defence">🛡 {div.defence}</span>
                    </span>
                  </div>
                ))}
                <div className="border-t border-stone-700 pt-1 mt-1 flex justify-between text-xs font-semibold">
                  <span className="text-stone-300">Total:</span>
                  <span className="flex items-center gap-2">
                    <span className="text-red-400">❤ {regions[selectedRegion].divisions.reduce((sum, d) => sum + d.hp, 0)}</span>
                    <span className="text-orange-400">⚔ {regions[selectedRegion].divisions.reduce((sum, d) => sum + d.attack, 0)}</span>
                    <span className="text-blue-400">🛡 {Math.round(regions[selectedRegion].divisions.reduce((sum, d) => sum + d.defence, 0) / regions[selectedRegion].divisions.length)}</span>
                  </span>
                </div>
              </div>
            )}
            <div className="text-stone-400">
              Adjacent: {getAdjacentRegions(adjacency, selectedRegion).length} regions
            </div>
          </div>
          
          {/* Actions for player-owned regions */}
          {regions[selectedRegion].owner === playerFaction && (
            <div className="mt-3 space-y-2 border-t border-stone-700 pt-3">
              {/* Deploy unit button */}
              {unitsInReserve > 0 && (
                <button
                  onClick={onDeployUnit}
                  className="w-full rounded bg-green-700 py-2 text-sm font-semibold text-white hover:bg-green-600"
                >
                  Deploy Unit ({unitsInReserve} available)
                </button>
              )}
              
              {/* Unit selection info */}
              {regions[selectedRegion].divisions.length > 0 && selectedUnitRegion === selectedRegion && (
                <div className="space-y-2 rounded bg-cyan-900/30 p-2">
                  <p className="text-xs text-cyan-300">
                    Right-click an adjacent region to move {regions[selectedRegion].divisions.length} division(s)
                  </p>
                  <p className="text-xs text-stone-400">
                    Travel time: ~6 hours
                  </p>
                </div>
              )}
              
              {regions[selectedRegion].divisions.length > 0 && selectedUnitRegion !== selectedRegion && (
                <button
                  onClick={() => onUnitSelect(selectedRegion)}
                  className="w-full rounded bg-blue-700 py-2 text-sm font-semibold text-white hover:bg-blue-600"
                >
                  Select Divisions ({regions[selectedRegion].divisions.length})
                </button>
              )}
            </div>
          )}

          {/* Show adjacent regions when unit is selected */}
          {selectedUnitRegion === selectedRegion && regions[selectedRegion].owner === playerFaction && (
            <div className="mt-3 space-y-1 border-t border-stone-700 pt-3">
              <p className="text-xs text-stone-400 mb-2">Adjacent regions (right-click to move):</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {getAdjacentRegions(adjacency, selectedRegion).map((adjId) => {
                  const adjRegion = regions[adjId];
                  if (!adjRegion) return null;
                  const isEnemy = adjRegion.owner !== playerFaction && adjRegion.owner !== 'neutral';
                  return (
                    <div
                      key={adjId}
                      className={`w-full rounded px-2 py-1 text-left text-xs ${
                        isEnemy 
                          ? 'bg-red-900/50 text-red-200' 
                          : adjRegion.owner === playerFaction
                          ? 'bg-green-900/50 text-green-200'
                          : 'bg-stone-700 text-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{adjRegion.name}</span>
                        <span className="flex items-center gap-1">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: FACTION_COLORS[adjRegion.owner] }}
                          />
                          {adjRegion.divisions.length > 0 && <span>({adjRegion.divisions.length})</span>}
                        </span>
                      </div>
                      {isEnemy && adjRegion.divisions.length > 0 && (
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-red-300">
                          <span>❤ {adjRegion.divisions.reduce((sum, d) => sum + d.hp, 0)}</span>
                          <span>⚔ {adjRegion.divisions.reduce((sum, d) => sum + d.attack, 0)}</span>
                          <span>🛡 {Math.round(adjRegion.divisions.reduce((sum, d) => sum + d.defence, 0) / adjRegion.divisions.length)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <button
            onClick={() => {
              onRegionSelect(null);
              onUnitSelect(null);
            }}
            className="mt-3 w-full rounded bg-stone-700 py-1 text-xs text-stone-300 hover:bg-stone-600"
          >
            Deselect
          </button>
        </div>
      )}

      {/* Moving units indicator */}
      {movingUnits.length > 0 && (
        <div className="absolute right-4 bottom-16 z-10 rounded-lg border border-blue-500 bg-stone-900/95 p-3 min-w-[200px]">
          <div className="text-sm font-bold text-blue-400 mb-2">
            Units in Transit ({movingUnits.length})
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {movingUnits.map((movement) => {
              const fromRegion = regions[movement.fromRegion];
              const toRegion = regions[movement.toRegion];
              const totalTime = movement.arrivalTime.getTime() - movement.departureTime.getTime();
              const elapsed = currentDateTime.getTime() - movement.departureTime.getTime();
              const progress = Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
              
              return (
                <div key={movement.id} className="rounded bg-stone-800 p-2">
                  <div className="text-xs text-stone-300">
                    {movement.divisions.length} unit(s): {fromRegion?.name || movement.fromRegion} → {toRegion?.name || movement.toRegion}
                  </div>
                  <div className="mt-1 h-1 bg-stone-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-stone-500 mt-1">
                    Arrives: {movement.arrivalTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
