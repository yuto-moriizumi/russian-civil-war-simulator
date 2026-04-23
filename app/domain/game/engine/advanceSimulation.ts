import { SimulationDeps, SimulationLogger, SimulationContext } from './types';
import { SimulationResult } from './types';
import { runPipeline } from './pipeline';

export function advanceSimulation(
  state: Parameters<typeof runPipeline>[0]['state'],
  deps: SimulationDeps,
  logger: SimulationLogger = console,
): SimulationResult {
  const newDate = new Date(state.dateTime);
  newDate.setHours(newDate.getHours() + 1);

  const initialContext: SimulationContext = {
    state,
    newDate,
    tickNum: 0,
  };

  const finalState = runPipeline(initialContext, deps, logger);

  return { state: finalState };
}
