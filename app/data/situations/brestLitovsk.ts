import { Situation } from '../../types/game';

// Ukraine's core regions + adjacent contested areas (Eastern Front 1918)
const CONTESTED_REGIONS = [
  'UA-05', 'UA-07', 'UA-09', 'UA-12', 'UA-14', 'UA-18', 'UA-21', 'UA-23',
  'UA-26', 'UA-30', 'UA-32', 'UA-35', 'UA-40', 'UA-43', 'UA-46', 'UA-48',
  'UA-51', 'UA-53', 'UA-56', 'UA-59', 'UA-61', 'UA-63', 'UA-65', 'UA-68',
  'UA-71', 'UA-74', 'UA-77',
  'BY-BR', 'BY-HO', 'RU-KDA', 'RU-ROS',
];

export const brestLitovskSituation: Situation = {
  id: 'brest-litovsk-treaty',
  title: 'Treaty of Brest-Litovsk',
  description:
    'Germany and Soviet Russia are negotiating peace. The terms of the treaty will depend on the military situation on the Eastern Front.',
  active: false,
  resolved: false,
  warScore: 50,
  scoreCountry: 'germany',
  contestedRegions: CONTESTED_REGIONS,
  activationConditions: [
    { type: 'eventTriggered', eventId: 'treaty-of-brest-litovsk-ukraine' },
  ],
  highBranch: {
    threshold: 60,
    label: 'German Victory — Historical Brest-Litovsk Terms',
    actions: [
      {
        type: 'removeRelationship',
        fromCountry: 'soviet',
        toCountry: 'odessa',
        relationshipType: 'autonomy',
      },
      {
        type: 'removeRelationship',
        fromCountry: 'soviet',
        toCountry: 'ukrainesoviet',
        relationshipType: 'autonomy',
      },
      {
        type: 'removeRelationship',
        fromCountry: 'soviet',
        toCountry: 'dkr',
        relationshipType: 'autonomy',
      },
      {
        type: 'endWarWithCountryAndPuppets',
        masterCountry: 'germany',
        enemyCountry: 'soviet',
      },
    ],
  },
  lowBranch: {
    threshold: 40,
    label: 'Soviet Victory — Favorable Armistice',
    actions: [
      {
        type: 'endWarWithCountryAndPuppets',
        masterCountry: 'germany',
        enemyCountry: 'soviet',
      },
    ],
  },
};
