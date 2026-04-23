import { CountryId, RelationshipType, GameEvent, NotificationItem } from '../../types/game';
import { ActionsState } from './types';
import { StoreApi } from 'zustand';
import { createGameEvent, createNotification } from '../../utils/eventUtils';
import { countries } from '../../data/gameData';
import { applyRelationshipChange, getRelationshipStatus, joinPuppetToOverlordWars } from '../../utils/relationshipUtils';

/**
 * Defines actions related to managing relationships between countries:
 * - Setting military access
 * - Declaring war
 * - Getting relationship status
 */
export const createRelationshipActions = (
  set: StoreApi<ActionsState>['setState'],
  get: StoreApi<ActionsState>['getState']
) => ({
  /**
   * Set or update relationship between two countries
   */
  setRelationship: (fromCountry: CountryId, toCountry: CountryId, type: RelationshipType) => {
    const { relationships: startRelationships, dateTime, gameEvents, notifications } = get();
    
    // Don't allow setting relationship with self
    if (fromCountry === toCountry) {
      console.warn('Cannot set relationship with self');
      return;
    }

    const getCountryName = (id: CountryId) => countries.find(c => c.id === id)?.name || id;
    const newEvents: GameEvent[] = [];
    const newNotifications: NotificationItem[] = [];

    // Helper to get current status from startRelationships
    const getCurrentStatus = (from: CountryId, to: CountryId): RelationshipType => {
      return getRelationshipStatus(startRelationships, from, to);
    };

    // Check for autonomy relationships - cannot declare war on each other
    if (type === 'war') {
      const hasAutonomy = startRelationships.some(
        r => ((r.fromCountry === fromCountry && r.toCountry === toCountry) ||
              (r.fromCountry === toCountry && r.toCountry === fromCountry)) &&
             r.type === 'autonomy'
      );
      
      if (hasAutonomy) {
        console.warn('Cannot declare war on a country with autonomy relationship');
        return;
      }
    }
    
    // Check if trying to set autonomy when at war
    if (type === 'autonomy') {
      const atWar = startRelationships.some(
        r => ((r.fromCountry === fromCountry && r.toCountry === toCountry) ||
              (r.fromCountry === toCountry && r.toCountry === fromCountry)) &&
             r.type === 'war'
      );
      
      if (atWar) {
        console.warn('Cannot establish autonomy relationship while at war');
        return;
      }
    }

    // Check if this is a new war declaration
    if (type === 'war' && getCurrentStatus(fromCountry, toCountry) !== 'war') {
      const fromName = getCountryName(fromCountry);
      const toName = getCountryName(toCountry);
      const event = createGameEvent(
        'war_declared',
        `${fromName} declares war against ${toName}`,
        `${fromName} has declared war on ${toName}!`,
        dateTime,
        fromCountry
      );
      newEvents.push(event);
      newNotifications.push(createNotification(event, dateTime));
    }
    
    let nextRelationships = applyRelationshipChange(startRelationships, fromCountry, toCountry, type);

    // War is mutual
    if (type === 'war') {
      nextRelationships = applyRelationshipChange(nextRelationships, toCountry, fromCountry, 'war');
    }

    // When autonomy is newly established, puppet joins master's existing wars
    if (type === 'autonomy' && getCurrentStatus(fromCountry, toCountry) !== 'autonomy') {
      const joinResult = joinPuppetToOverlordWars(nextRelationships, fromCountry, toCountry);
      nextRelationships = joinResult.updatedRelationships;

      joinResult.joinedEnemies.forEach(enemyId => {
        const puppetName = getCountryName(toCountry);
        const masterName = getCountryName(fromCountry);
        const enemyName = getCountryName(enemyId);
        const event = createGameEvent(
          'war_declared',
          `${puppetName} joins war against ${enemyName}`,
          `${puppetName} joins their new Master (${masterName}) in war against ${enemyName}!`,
          dateTime,
          toCountry
        );
        newEvents.push(event);
        newNotifications.push(createNotification(event, dateTime));
      });
    }

    // Cascading war declarations for autonomy
    if (type === 'war') {
      // 1. If Master declares war, Servant also declares war on the target
      const servantsOfAggressor = startRelationships.filter(
        r => r.fromCountry === fromCountry && r.type === 'autonomy'
      );
      servantsOfAggressor.forEach(s => {
        // Servant declares war on the same target if not already at war
        if (getCurrentStatus(s.toCountry, toCountry) !== 'war') {
          const servantName = getCountryName(s.toCountry);
          const masterName = getCountryName(fromCountry);
          const targetName = getCountryName(toCountry);
          const event = createGameEvent(
            'war_declared',
            `${servantName} joins war against ${targetName}`,
            `${servantName} joins their Master (${masterName}) in war against ${targetName}!`,
            dateTime,
            s.toCountry
          );
          newEvents.push(event);
          newNotifications.push(createNotification(event, dateTime));
          
          // Make it mutual between Servant and Target
          nextRelationships = applyRelationshipChange(nextRelationships, s.toCountry, toCountry, 'war');
          nextRelationships = applyRelationshipChange(nextRelationships, toCountry, s.toCountry, 'war');
        }
      });

      // 2. If Master is declared war upon, Servant declares war on the aggressor
      const servantsOfDefender = startRelationships.filter(
        r => r.fromCountry === toCountry && r.type === 'autonomy'
      );
      servantsOfDefender.forEach(s => {
        // Servant declares war on the aggressor to defend Master if not already at war
        if (getCurrentStatus(s.toCountry, fromCountry) !== 'war') {
          const servantName = getCountryName(s.toCountry);
          const masterName = getCountryName(toCountry);
          const aggressorName = getCountryName(fromCountry);
          const event = createGameEvent(
            'war_declared',
            `${servantName} joins defense against ${aggressorName}`,
            `${servantName} joins their Master (${masterName}) to defend against ${aggressorName}!`,
            dateTime,
            s.toCountry
          );
          newEvents.push(event);
          newNotifications.push(createNotification(event, dateTime));
          
          // Make it mutual between Servant and Aggressor
          nextRelationships = applyRelationshipChange(nextRelationships, s.toCountry, fromCountry, 'war');
          nextRelationships = applyRelationshipChange(nextRelationships, fromCountry, s.toCountry, 'war');
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
   * Get relationship status between two countries
   * Returns 'neutral' if no explicit relationship exists
   */
  getRelationship: (fromCountry: CountryId, toCountry: CountryId): RelationshipType => {
    if (fromCountry === toCountry) {
      return 'neutral'; // Can't have relationship with self
    }
    
    const { relationships } = get();
    const relationship = relationships.find(
      r => r.fromCountry === fromCountry && r.toCountry === toCountry
    );
    
    return relationship ? relationship.type : 'neutral';
  },
});
