import { SimulationDeps, SimulationLogger, SimulationContext } from './types';
import { SimulationResult } from './types';
import { runPipeline } from './pipeline';

let _tickCounter = 0;

/**
 * Advances the simulation by one tick.
 * Pure function: reads state + deps, returns next state.
 * No Zustand imports or browser side-effects.
 *
 * Implementation delegates to a pipeline of independent SimulationSteps
 * defined in engine/steps/. Each step is a pure function
 * (context, deps, logger) => context.
 */
export function advanceSimulation(
  state: Parameters<typeof runPipeline>[0]['state'],
  deps: SimulationDeps,
  logger: SimulationLogger = console,
): SimulationResult {
  _tickCounter++;
  const tickNum = _tickCounter;

  const newDate = new Date(state.dateTime);
  newDate.setHours(newDate.getHours() + 1);

  const initialContext: SimulationContext = {
    state,
    tickNum,
    newDate,
  };

  const finalState = runPipeline(initialContext, deps, logger);

  return { state: finalState };
}
