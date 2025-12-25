import { Mission } from './types';

export const INITIAL_MISSIONS: Mission[] = [
  // Root mission
  {
    id: 'root_logistics',
    title: 'Secure Logistics',
    description: 'Establish basic supply lines for your army.',
    cost: 50,
    rewardMoney: 0,
    rewardIncome: 2,
    parentId: null,
    completed: false,
    unlocked: true,
  },
  // Branch 1 - Military
  {
    id: 'mil_recruitment',
    title: 'Mass Recruitment',
    description: 'Begin recruiting campaigns in the villages.',
    cost: 100,
    rewardMoney: 0,
    rewardIncome: 1,
    parentId: 'root_logistics',
    completed: false,
    unlocked: false,
  },
  {
    id: 'mil_training',
    title: 'Basic Training',
    description: 'Train your recruits into effective fighting forces.',
    cost: 200,
    rewardMoney: 0,
    rewardIncome: 3,
    parentId: 'mil_recruitment',
    completed: false,
    unlocked: false,
  },
  // Branch 2 - Industry/Economy
  {
    id: 'eco_seize_assets',
    title: 'Seize Assets',
    description: 'Confiscate local resources for the war effort.',
    cost: 0,
    rewardMoney: 300,
    rewardIncome: 0,
    parentId: 'root_logistics',
    completed: false,
    unlocked: false,
  },
  {
    id: 'eco_factories',
    title: 'Nationalize Factories',
    description: 'Take control of industrial production.',
    cost: 500,
    rewardMoney: 0,
    rewardIncome: 10,
    parentId: 'eco_seize_assets',
    completed: false,
    unlocked: false,
  }
];
