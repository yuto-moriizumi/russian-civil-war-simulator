import { FactionId, Relationship, RelationshipType, GameEvent, NotificationItem } from '../../types/game';
import { GameStore } from './types';
import { StoreApi } from 'zustand';
import { createGameEvent, createNotification } from '../../utils/eventUtils';
import { countries } from '../../data/gameData';

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
    const { relationships: startRelationships, dateTime, gameEvents, notifications } = get();
    
    // Don't allow setting relationship with self
    if (fromFaction === toFaction) {
      console.warn('Cannot set relationship with self');
      return;
    }

    const getFactionName = (id: FactionId) => countries.find(c => c.id === id)?.name || id;
    const newEvents: GameEvent[] = [];
    const newNotifications: NotificationItem[] = [];

    // Helper to get current status from startRelationships
    const getCurrentStatus = (from: FactionId, to: FactionId): RelationshipType => {
      const rel = startRelationships.find(r => r.fromFaction === from && r.toFaction === to);
      return rel ? rel.type : 'neutral';
    };
    
    // Helper to apply a single relationship change to a list
    const applyRelationshipChange = (
      rels: Relationship[], 
      from: FactionId, 
      to: FactionId, 
      newType: RelationshipType
    ): Relationship[] => {
      if (from === to) return rels;

      const existingIndex = rels.findIndex(
        r => r.fromFaction === from && r.toFaction === to
      );
      
      if (newType === 'neutral') {
        if (existingIndex !== -1) {
          return [
            ...rels.slice(0, existingIndex),
            ...rels.slice(existingIndex + 1)
          ];
        }
        return rels;
      } else {
        const newRel: Relationship = { fromFaction: from, toFaction: to, type: newType };
        if (existingIndex !== -1) {
          const updated = [...rels];
          updated[existingIndex] = newRel;
          return updated;
        } else {
          return [...rels, newRel];
        }
      }
    };

    // Check for autonomy relationships - cannot declare war on each other
    if (type === 'war') {
      const hasAutonomy = startRelationships.some(
        r => ((r.fromFaction === fromFaction && r.toFaction === toFaction) ||
              (r.fromFaction === toFaction && r.toFaction === fromFaction)) &&
             r.type === 'autonomy'
      );
      
      if (hasAutonomy) {
        console.warn('Cannot declare war on a faction with autonomy relationship');
        return;
      }
    }
    
    // Check if trying to set autonomy when at war
    if (type === 'autonomy') {
      const atWar = startRelationships.some(
        r => ((r.fromFaction === fromFaction && r.toFaction === toFaction) ||
              (r.fromFaction === toFaction && r.toFaction === fromFaction)) &&
             r.type === 'war'
      );
      
      if (atWar) {
        console.warn('Cannot establish autonomy relationship while at war');
        return;
      }
    }

    // Check if this is a new war declaration
    if (type === 'war' && getCurrentStatus(fromFaction, toFaction) !== 'war') {
      const fromName = getFactionName(fromFaction);
      const toName = getFactionName(toFaction);
      const event = createGameEvent(
        'war_declared',
        `${fromName} vs ${toName}`,
        `${fromName} has declared war on ${toName}!`,
        dateTime,
        fromFaction
      );
      newEvents.push(event);
      newNotifications.push(createNotification(event, dateTime));
    }
    
    let nextRelationships = applyRelationshipChange(startRelationships, fromFaction, toFaction, type);

    // Cascading war declarations for autonomy
    if (type === 'war') {
      // 1. If Master declares war, Servant also declares war on the target
      const servantsOfAggressor = startRelationships.filter(
        r => r.fromFaction === fromFaction && r.type === 'autonomy'
      );
      servantsOfAggressor.forEach(s => {
        // Servant declares war on the same target if not already at war
        if (getCurrentStatus(s.toFaction, toFaction) !== 'war') {
          const servantName = getFactionName(s.toFaction);
          const masterName = getFactionName(fromFaction);
          const targetName = getFactionName(toFaction);
          const event = createGameEvent(
            'war_declared',
            `${servantName} joins vs ${targetName}`,
            `${servantName} joins their Master (${masterName}) in war against ${targetName}!`,
            dateTime,
            s.toFaction
          );
          newEvents.push(event);
          newNotifications.push(createNotification(event, dateTime));
          nextRelationships = applyRelationshipChange(nextRelationships, s.toFaction, toFaction, 'war');
        }
      });

      // 2. If Master is declared war upon, Servant declares war on the aggressor
      const servantsOfDefender = startRelationships.filter(
        r => r.fromFaction === toFaction && r.type === 'autonomy'
      );
      servantsOfDefender.forEach(s => {
        // Servant declares war on the aggressor to defend Master if not already at war
        if (getCurrentStatus(s.toFaction, fromFaction) !== 'war') {
          const servantName = getFactionName(s.toFaction);
          const masterName = getFactionName(toFaction);
          const aggressorName = getFactionName(fromFaction);
          const event = createGameEvent(
            'war_declared',
            `${servantName} defends vs ${aggressorName}`,
            `${servantName} joins their Master (${masterName}) to defend against ${aggressorName}!`,
            dateTime,
            s.toFaction
          );
          newEvents.push(event);
          newNotifications.push(createNotification(event, dateTime));
          nextRelationships = applyRelationshipChange(nextRelationships, s.toFaction, fromFaction, 'war');
        }
      });
    }
    
    set({ 
      relationships: nextRelationships,
      gameEvents: [...gameEvents, ...newEvents],
      notifications: [...notifications, ...newNotifications]
    });
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
