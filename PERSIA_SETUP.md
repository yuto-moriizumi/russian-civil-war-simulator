# Persia (Qajar Iran) - Initial Setup Documentation

## Historical Context (November 20, 1917)

### Overview
Persia (officially Qajar Iran) was officially neutral during World War I but was de facto occupied by multiple foreign powers. The country was under the rule of the Qajar dynasty, with Ahmad Shah Qajar as monarch (1909-1925).

### Key Historical Facts
- **Official Status**: Neutral country (declared neutrality in 1914)
- **Dynasty**: Qajar Dynasty (1789-1925)
- **Ruler**: Ahmad Shah Qajar (1909-1925)
- **Capital**: Tehran
- **Population**: Approximately 10-11 million

### World War I Occupation
Despite declaring neutrality, Persia was occupied by three major powers:
1. **Russian Empire** - Northern regions (Azerbaijan, Gilan, Mazandaran)
2. **British Empire** - Southern regions and oil fields
3. **Ottoman Empire** - Western border regions

The Persian Campaign (1914-1918) devastated the country, leading to the Persian famine of 1917-1919 which killed approximately 2 million people.

## Military Forces (November 1917)

### Persian Cossack Brigade
- Russian-officered force, approximately 6,000-8,000 men
- Stationed in Tehran, Qazvin, and Hamadan
- Most reliable military force
- 8-9 battalions with artillery support

### Persian Central Government Gendarmerie
- Swedish-officered force, approximately 6,000 men
- 2,000 mounted troops
- Distributed across major roads and cities
- Better organized than regular army

### Tribal Forces
Various tribal groups with varying loyalties:
- **Qashqai Tribesmen** (Southern Persia)
- **Tangistani Tribesmen** (Southern coast)
- **Laristani Tribesmen** (Southern regions)
- **Feyli Tribesmen** (Western borders)
- **Tabarestani Tribesmen** (Mazandaran)

Total estimated strength: 30,000-50,000 irregular troops

## Recommended Initial Configuration

### Territories (app/data/map.ts)
Persia should initially control these regions at game start:

**Core Persian Regions:**
- Tehran and surrounding provinces
- Isfahan region
- Shiraz and Fars province
- Kerman region
- Khorasan province (eastern regions)
- Parts of Azerbaijan not under Russian occupation
- Southern coastal regions

**Contested/Occupied Regions:**
- Northern Azerbaijan (under Russian influence)
- Southern oil regions (under British influence)
- Western border regions (Ottoman presence)

### Starting Military Units (app/store/game/initialState.ts)

Recommended starting divisions for Persia:

1. **Persian Cossack Brigade** (Tehran)
   - 2-3 divisions representing the Cossack Brigade
   - Higher stats: Attack 12, Defence 14, HP 80
   - Most professional force

2. **Persian Gendarmerie** (scattered)
   - 3-4 divisions representing the Gendarmerie
   - Moderate stats: Attack 10, Defence 12, HP 70
   - Deployed in major cities and roads

3. **Tribal Levies** (regional)
   - 4-6 divisions representing tribal forces
   - Lower stats: Attack 8, Defence 8, HP 60
   - Deployed in tribal regions

**Total Starting Strength**: 9-13 divisions (representing approximately 30,000-40,000 troops)

### Diplomatic Relationships (app/store/game/initialState.ts)

**Recommended Initial Relationships:**

```typescript
// Persia was occupied by multiple powers but officially neutral
{ fromCountry: 'persia', toCountry: 'ottoman', type: 'war' }, // Ottoman incursions
// No formal military access to Russia/Britain (de facto occupation)
```

## AI Behavior Configuration

Persia should have defensive AI behavior:
- Priority: Defend core territories
- Low aggression
- Focus on survival rather than expansion
- May form temporary alliances with any faction against invaders

## Game Balance Considerations

### Strengths
- Large territory with resource potential
- Multiple military organizations (though weak)
- Strategic location

### Weaknesses
- Occupied by foreign powers
- Weak military compared to major powers
- Internal divisions and tribal conflicts
- Economic devastation from WWI and famine

### Suggested Game Mechanics
- **Famine Event**: Consider triggering the Persian famine event in 1917-1918
- **Foreign Occupation**: Russian/British/Ottoman forces should have military access or occupation
- **Neutral Status**: Persia should not be aggressive toward any faction initially
- **Resource Penalty**: Lower income/production due to wartime devastation

## Implementation Priority

### Must Configure
1. Initial region ownership in `app/data/map.ts`
2. Starting military units in `app/store/game/initialState.ts`
3. Diplomatic relationships in initial state

### Optional Enhancements
1. Specific scheduled events for Persian famine
2. Special mechanics for tribal loyalty
3. Foreign intervention events
4. Persian Constitutional/political events

## Historical Accuracy Notes

- The Persian Cossack Brigade would later be instrumental in Reza Khan's 1921 coup
- By 1917, Persia was in a state of near-collapse due to foreign occupation and famine
- The country maintained nominal independence but had little real sovereignty
- The British South Persia Rifles (formed 1916) operated in southern regions
- Ottoman forces withdrew after the Armistice of Mudros (October 30, 1918)

## References

- Persian Campaign (World War I) - Wikipedia
- Qajar Iran - Wikipedia  
- Flag of Iran - Historical Qajar period (1907-1933)
- Persian famine of 1917-1919
- Treaty of Turkmenchay (1828) - established borders with Russia

---

**Note**: This is a non-playable country (NPC). Players cannot select Persia, but it will exist in the game world and be controlled by AI.
