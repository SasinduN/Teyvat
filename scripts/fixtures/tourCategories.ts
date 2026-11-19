import type { TourCategory } from '../../src/types';

/**
 * The tour categories as migration 0030 seeds them (`docs/plans/tour-categories.md`),
 * in order, with `photo` the destination whose verified photo each one starts with.
 * `npm run verify:roundtrip` maps them through the database's shape and back, and
 * `tour-categories.test` holds 0030's rows to them.
 */
export const TOUR_CATEGORIES: (Omit<TourCategory, 'image'> & { photo: string })[] = [
  {
    id: 'beach',
    name: 'Beach Tours',
    heading: 'Beach tours in Sri Lanka',
    shortIntro:
      "Time on the south, west and east coasts: swimming bays, surf towns and Galle's old fort, with drives short enough to leave the afternoons free.",
    intro: [
      "Sri Lanka's coasts have their seasons at different times of year. The south and west, from Bentota round to Mirissa, are calmer in the first months of the year; the east coast at Trincomalee and Arugam Bay has its season in the middle of the year.",
      "Our beach tours keep the driving short. Most days start or end by the sea, with time for a swim, a surf lesson at Weligama or a walk on Galle Fort's walls.",
      'Any of them can add a few days inland, in the hills or at a national park.'
    ],
    photo: 'mirissa',
    bestTimeNote: 'The west and south coasts are usually driest from December to March, and the east coast from May to September.'
  },
  {
    id: 'family',
    name: 'Family Tours',
    heading: 'Family tours in Sri Lanka',
    shortIntro: 'Routes with shorter drives and slower days, mixing places children enjoy with time to rest.',
    intro: [
      "Travelling with children changes how far you can go in a day. These tours keep the drives short and plan one main outing a day, so there's time for a pool, a nap or an early night.",
      'Days can include a jeep safari at Udawalawe to see elephants, the train through the tea country, or a morning on a calm beach.',
      "Tell us the children's ages when you ask, and we'll suggest the pace and the stops."
    ],
    photo: 'udawalawe'
  },
  {
    id: 'hill-country',
    name: 'Hill Country Tours',
    heading: 'Hill country tours in Sri Lanka',
    shortIntro: 'Tea estates, cool mornings and walks in the central highlands, from Kandy up to Nuwara Eliya, Ella and Haputale.',
    intro: [
      'The hill country is in the middle of the island and much cooler than the coast. Roads wind slowly between tea estates, so these tours plan fewer stops and longer stays.',
      'Days can include the train between Kandy and Ella, an early walk on Horton Plains, a tea factory visit and short hikes around Ella.',
      'Bring a warm layer: mornings and evenings in Nuwara Eliya can be cold.'
    ],
    photo: 'ella',
    bestTimeNote: 'The hill country is usually driest from December to March. From May to September the southwest monsoon brings rain to the hills.'
  },
  {
    id: 'wellness',
    name: 'Wellness Tours',
    heading: 'Wellness tours in Sri Lanka',
    shortIntro:
      'Slower trips built around rest: fewer moves, longer stays, and time for Ayurveda treatments, yoga or quiet days by the sea or in the hills.',
    intro: [
      'These tours are for travelling slowly. Most stay three or more nights in one place, with no early starts unless you want them.',
      'Many hotels and retreats in Sri Lanka offer Ayurveda treatments and yoga. We can include them, or leave the days open.',
      "Tell us what kind of rest you're after, and we'll plan the stays around it."
    ],
    photo: 'bentota'
  },
  {
    id: 'adventure',
    name: 'Adventure Tours',
    heading: 'Adventure tours in Sri Lanka',
    shortIntro: 'Active days: hikes in the hills, early climbs up rock fortresses, and surf on the south and east coasts.',
    intro: [
      "For travellers who'd rather walk, climb or paddle than watch from a car window. Each activity is matched to a place known for it.",
      'That can mean a hike in the Knuckles range, a sunrise climb up Sigiriya, a walk across Horton Plains, or surf at Arugam Bay or Weligama.',
      "Tell us your experience and fitness when you ask, and we'll pitch the days to suit."
    ],
    photo: 'knuckles'
  },
  {
    id: 'honeymoon',
    name: 'Honeymoon Tours',
    heading: 'Honeymoon tours in Sri Lanka',
    shortIntro: 'Slow trips for two: quiet stays in the hills and on the coast, a car and driver, and time left free.',
    intro: [
      'These tours keep the pace easy and the days your own: fewer stops, longer stays and evenings with nothing planned.',
      'A typical route pairs a few days in the hills, around Ella or Nuwara Eliya, with a stretch of coast near Galle or Mirissa.',
      "Tell us your dates and what you'd like, and we'll suggest where to stay."
    ],
    photo: 'nuwara-eliya'
  },
  {
    id: 'cultural',
    name: 'Cultural Tours',
    heading: 'Cultural tours in Sri Lanka',
    shortIntro:
      'Ancient cities, cave temples and living traditions in the Cultural Triangle, Kandy and Jaffna, with time to see each site properly.',
    intro: [
      "Sri Lanka's early capitals are in the north-central plains: Anuradhapura, Polonnaruwa and the rock fortress at Sigiriya, with the cave temples of Dambulla nearby.",
      'Kandy, in the hills, is home to the Temple of the Tooth. Further north, Jaffna has its own Hindu temples, food and history.',
      'Most sites are best seen early. We plan visits for the cooler hours and leave the middle of the day free.'
    ],
    photo: 'sigiriya'
  },
  {
    id: 'wildlife',
    name: 'Wildlife Tours',
    heading: 'Wildlife tours in Sri Lanka',
    shortIntro: 'Jeep safaris in national parks such as Yala and Udawalawe, with early starts and time to watch.',
    intro: [
      "Sri Lanka's national parks are home to elephants, leopards, sloth bears, water buffalo and many kinds of birds. Udawalawe is known for its elephants, and Yala for its leopards.",
      "Safaris are in open jeeps, usually early in the morning or late in the afternoon. These are wild animals in their own habitat, so sightings can't be guaranteed, and every drive is different.",
      'A tour can pair a park or two with a few days on the coast or in the hills.'
    ],
    photo: 'yala'
  }
];

/** 0030's assignments: each seed tour's categories, in order. */
export const TOUR_CATEGORY_LINKS: Readonly<Record<string, readonly string[]>> = {
  'island-in-7-days': ['hill-country', 'cultural'],
  'cultural-sri-lanka': ['cultural'],
  'wild-sri-lanka': ['wildlife'],
  'southern-escape': ['beach']
};
