import { StoryEvent } from '../types/game';

export const storyEvents: StoryEvent[] = [
  // Introduction event
  {
    id: 'introduction',
    title: 'The Russian Civil War Begins',
    text: `November 1917. The Bolshevik Revolution has overthrown the Provisional Government in Petrograd. Vladimir Lenin and the Communist Party have seized power, promising "Peace, Land, and Bread" to the war-weary Russian people.

But the revolution is far from secure. Across the vast Russian Empire, opposition forces are gathering. Former Tsarist officers, liberal democrats, Socialist Revolutionaries, and foreign interventionists refuse to accept Bolshevik rule.

The Russian Civil War has begun—a brutal conflict that will determine the fate of the world's largest nation. Will the Red Army of Workers and Peasants defend the revolution and establish the world's first socialist state? Or will the White forces restore order and prevent the spread of communism?

The future of Russia hangs in the balance.`,
  },

  // Soviet victory event
  {
    id: 'soviet_victory',
    title: 'Victory of the Proletariat',
    text: `The Red Army has achieved total victory! The forces of counter-revolution have been crushed, and the White armies have been driven from Russian soil.

Under the leadership of the Communist Party, the workers and peasants have successfully defended their revolution against all enemies—both domestic and foreign. The interventionist forces of Britain, France, Japan, and the United States have been expelled.

The Russian Soviet Federative Socialist Republic stands triumphant. A new era of socialist construction begins. The dream of a society without exploitation, where the means of production belong to the people, is now within reach.

Long live the Revolution! Long live Soviet Russia!`,
  },

  // Russian Republic (White) victory event
  {
    id: 'white_victory',
    title: 'The Republic Restored',
    text: `The White forces have achieved victory! The Bolshevik regime has fallen, and order has been restored to Russia.

After years of chaos and bloodshed, the legitimate government has been reestablished. The Red Army has been defeated, and the Communist leadership has been brought to justice for their crimes against the Russian people.

The new Russian Republic promises to restore law and order, protect private property, and establish a constitutional government. Russia will rejoin the community of civilized nations and honor its obligations to its wartime allies.

The nightmare of Bolshevism has ended. Russia can now begin the long process of healing and reconstruction.`,
  },
];
