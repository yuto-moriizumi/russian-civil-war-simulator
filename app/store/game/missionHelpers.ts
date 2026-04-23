// Re-exported from domain. The pure implementation lives in domain/game/missionHelpers.ts.
// This file exists only for backward compatibility with existing tests.
export {
  evaluateMissionCondition,
  areMissionConditionsMet,
} from '../../domain/game/missionHelpers';
export type { MissionEvaluationState } from '../../domain/game/missionHelpers';
