import { processSituations } from '../../logic/situationProcessing';
import type { SimulationContext, SimulationDeps, SimulationLogger, EngineSimulationState } from '../types';

export function processSituationsStep(
  context: SimulationContext,
  _deps: SimulationDeps,
  _logger: SimulationLogger,
): SimulationContext {
  const patch = processSituations(context.state, context.newDate);
  const nextState: EngineSimulationState = { ...context.state, ...patch };
  return { ...context, state: nextState };
}
