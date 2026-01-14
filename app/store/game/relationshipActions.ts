import { FactionId, Relationship, RelationshipType } from '../../types/game';
import { GameStore } from './types';
import { StoreApi } from 'zustand';

/**
 * Defines actions related to managing relationships between factions:
 * - Setting military access
 * - Declaring war
 * - Getting relationship status
 */
export const createRelationshipActions = (
  set: StoreApi<GameStore>['setState'],
  get: StoreApi<GameStore>['getState']
) => ({
  /**
   * Set or update relationship between two factions
   */
  setRelationship: (fromFaction: FactionId, toFaction: FactionId, type: RelationshipType) => {
    const { relationships } = get();
    
    // Don't allow setting relationship with self
    if (fromFaction === toFaction) {
      console.warn('Cannot set relationship with self');
      return;
    }
    
    // Check if relationship already exists
    const existingIndex = relationships.findIndex(
      r => r.fromFaction === fromFaction && r.toFaction === toFaction
    );
    
    let newRelationships: Relationship[];
    
    if (type === 'neutral') {
      // Remove the relationship entry if setting to neutral
      if (existingIndex !== -1) {
        newRelationships = [
          ...relationships.slice(0, existingIndex),
          ...relationships.slice(existingIndex + 1)
        ];
      } else {
        return; // Already neutral (no entry exists)
      }
    } else {
      // Create or update relationship
      const newRelationship: Relationship = {
        fromFaction,
        toFaction,
        type
      };
      
      if (existingIndex !== -1) {
        // Update existing relationship
        newRelationships = [...relationships];
        newRelationships[existingIndex] = newRelationship;
      } else {
        // Add new relationship
        newRelationships = [...relationships, newRelationship];
      }
    }
    
    set({ relationships: newRelationships });
  },
  
  /**
   * Get relationship status between two factions
   * Returns 'neutral' if no explicit relationship exists
   */
  getRelationship: (fromFaction: FactionId, toFaction: FactionId): RelationshipType => {
    if (fromFaction === toFaction) {
      return 'neutral'; // Can't have relationship with self
    }
    
    const { relationships } = get();
    const relationship = relationships.find(
      r => r.fromFaction === fromFaction && r.toFaction === toFaction
    );
    
    return relationship ? relationship.type : 'neutral';
  },
});
