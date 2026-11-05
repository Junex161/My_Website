/*
  Photo gallery, grouped into sections.
  To add a photo: put the file in src/assets/photos/, import it below and add it to a section.
  To add a section: add another { title, intro, photos } block.
*/
import starTrails from '../assets/photos/star-trails.jpg';
import moon from '../assets/photos/moon.jpg';
import milkyWay from '../assets/photos/milky-way.jpg';
import comet from '../assets/photos/comet.jpg';

export type Photo = {
  src: ImageMetadata;
  title: string;
  alt: string;
  note?: string;
};

export type Section = { id: string; title: string; intro?: string; photos: Photo[] };

export const sections: Section[] = [
  {
    id: 'astro',
    title: 'Night sky',
    intro: 'Things that only show up in the dark.',
    photos: [
      {
        src: comet,
        title: 'Comet NEOWISE',
        alt: 'Comet NEOWISE with a bright head and a long tail among scattered stars.',
      },
      {
        src: milkyWay,
        title: 'Milky Way',
        alt: 'The band of the Milky Way crossing a sky full of stars, with dark dust lanes.',
      },
      {
        src: starTrails,
        title: 'Star trails',
        alt: 'Concentric star trails circling the celestial pole above the dark silhouette of a tree.',
      },
      {
        src: moon,
        title: 'Full moon',
        alt: 'A small full moon alone in a black sky.',
      },
    ],
  },
];
