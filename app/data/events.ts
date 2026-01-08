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

  // Soviet victory events
  {
    id: 'soviet_victory_1',
    title: 'Victory of the Proletariat',
    text: `The Red Army has achieved total victory! The forces of counter-revolution have been crushed, and the White armies have been driven from Russian soil.

Under the leadership of the Communist Party, the workers and peasants have successfully defended their revolution against all enemies—both domestic and foreign. The interventionist forces of Britain, France, Japan, and the United States have been expelled.

The Russian Soviet Federative Socialist Republic stands triumphant. A new era of socialist construction begins. The dream of a society without exploitation, where the means of production belong to the people, is now within reach.

Long live the Revolution! Long live Soviet Russia!`,
  },
  {
    id: 'soviet_victory_2',
    title: 'The Red Banner Flies Supreme',
    text: `After years of bitter struggle, the Civil War has ended in complete Bolshevik victory. The White movement has collapsed, its leaders fleeing into exile or facing revolutionary justice.

From the Baltic to the Pacific, from the Arctic to the Caucasus, the red banner of socialism now flies over all of Russia. The peasants have received land, the workers control the factories, and the old aristocratic order has been swept away forever.

Though the country lies exhausted and devastated by war, famine, and disease, the foundations of a new society have been laid. The Union of Soviet Socialist Republics will soon rise from the ashes of the old empire.

History has been made. The world will never be the same.`,
  },

  // Russian Republic (White) victory events
  {
    id: 'white_victory_1',
    title: 'The Republic Restored',
    text: `The White forces have achieved victory! The Bolshevik regime has fallen, and order has been restored to Russia.

After years of chaos and bloodshed, the legitimate government has been reestablished. The Red Army has been defeated, and the Communist leadership has been brought to justice for their crimes against the Russian people.

The new Russian Republic promises to restore law and order, protect private property, and establish a constitutional government. Russia will rejoin the community of civilized nations and honor its obligations to its wartime allies.

The nightmare of Bolshevism has ended. Russia can now begin the long process of healing and reconstruction.`,
  },
  {
    id: 'white_victory_2',
    title: 'Dawn of a New Russia',
    text: `The Civil War is over. The White armies, united under capable leadership, have liberated Russia from Communist tyranny.

The Bolshevik experiment has failed. Their promises of utopia brought only terror, famine, and destruction. Now, with the red menace defeated, Russia can chart a new course—one of democratic reform, economic recovery, and national reconciliation.

The sacrifices of countless patriots will not be forgotten. From the icy plains of Siberia to the shores of the Black Sea, brave men and women gave their lives to save their homeland from revolutionary madness.

A new chapter in Russian history begins today. May God bless the Russian Republic.`,
  },
];
