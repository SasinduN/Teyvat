import { ExperienceItem } from '../types';

export const EXPERIENCE_CATEGORIES = [
  {
    id: 'beach-escapes',
    title: 'Beach Escapes',
    category: 'Beaches' as const,
    subtitle: 'Golden sands, turquoise waters & coconut palms',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
    description: 'Unwind along 1,300+ km of tropical coastline, from southern surf bays to serene eastern white sand beaches.'
  },
  {
    id: 'wild-sri-lanka',
    title: 'Wild Sri Lanka',
    category: 'Wildlife' as const,
    subtitle: 'Leopards, wild elephants & marine giants',
    image: 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=800',
    description: 'Embark on thrilling 4x4 safaris in Yala & Wilpattu or spot blue whales glinting in the Indian Ocean.'
  },
  {
    id: 'ancient-sri-lanka',
    title: 'Ancient Sri Lanka',
    category: 'Culture' as const,
    subtitle: '2,500 years of royal kingdoms & rock fortresses',
    image: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=800',
    description: 'Explore UNESCO rock fortresses, carved stone Buddhas, and sacred stupas towering above jungle plains.'
  },
  {
    id: 'mountain-adventures',
    title: 'Mountain Adventures',
    category: 'Mountains' as const,
    subtitle: 'Misty tea valleys, cloud forests & scenic trains',
    image: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=800',
    description: 'Hike sunrise peaks, ride the famous blue highland train, and swim in natural waterfall pools.'
  },
  {
    id: 'food-and-culture',
    title: 'Food & Culture',
    category: 'Food' as const,
    subtitle: 'Aromatic spices, hopper breakfasts & street feasts',
    image: 'https://images.unsplash.com/photo-1588598198321-9735fd52455b?auto=format&fit=crop&q=80&w=800',
    description: 'Savor fragrant coconut curries, fresh seafood, spicy kottu roti, and world-renowned Ceylon tea.'
  },
  {
    id: 'hidden-sri-lanka',
    title: 'Hidden Sri Lanka',
    category: 'Hidden Gems' as const,
    subtitle: 'Secret waterfalls, remote peaks & island gems',
    image: 'https://images.unsplash.com/photo-1608933221980-dfc7dd884fbf?auto=format&fit=crop&q=80&w=800',
    description: 'Venture beyond the guidebook to isolated mountain plateaus, wild river canyons, and serene islands.'
  }
];

export const FEATURED_EXPERIENCES: ExperienceItem[] = [
  {
    id: 'sunrise-ella',
    title: 'Sunrise at Ella',
    subtitle: 'Watch the mountains wake up above the clouds',
    location: 'Ella, Central Highlands',
    duration: '3–4 Hours',
    category: 'Mountains',
    image: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1000',
    description: 'Rise before dawn and hike up Little Adam’s Peak or Ella Rock as golden sunlight pierces mist floating across emerald tea valleys.',
    highlights: [
      '360-degree mountain gap panoramas',
      'Tea estate walk in morning dew',
      'Watch the blue train cross Nine Arch Bridge'
    ],
    recommendedTime: '5:30 AM – 8:30 AM',
    rating: 4.98
  },
  {
    id: 'safari-yala',
    title: 'Safari in Yala',
    subtitle: 'Experience Sri Lanka’s wild side up close',
    location: 'Yala National Park',
    duration: 'Half Day / Full Day',
    category: 'Wildlife',
    image: 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=1000',
    description: 'Navigate dusty jungle tracks in an open-top 4x4 jeep to track elusive Sri Lankan leopards, wild elephant herds, sloth bears, and crocodiles.',
    highlights: [
      'Highest leopard density in the world',
      'Private expert wilderness tracker',
      'Wild coastal dune coffee break'
    ],
    recommendedTime: '6:00 AM or 3:00 PM',
    rating: 4.94
  },
  {
    id: 'sunset-mirissa',
    title: 'Sunset in Mirissa',
    subtitle: 'Golden beaches and unforgettable ocean sunsets',
    location: 'Mirissa, South Coast',
    duration: '2–3 Hours',
    category: 'Beaches',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000',
    description: 'Climb Coconut Tree Hill as the sun dips into the Indian Ocean, painting the palm fronds and crashing waves in fiery violet and amber hues.',
    highlights: [
      'Iconic Coconut Tree Hill viewpoint',
      'Fresh grilled catch of the day at beachside cafes',
      'Calm turquoise bay swimming'
    ],
    recommendedTime: '5:00 PM – 7:00 PM',
    rating: 4.92
  },
  {
    id: 'walk-galle-fort',
    title: 'Walk Through Galle Fort',
    subtitle: 'Discover colonial architecture, cafés and stories',
    location: 'Galle Fort, South Coast',
    duration: '2–3 Hours',
    category: 'Culture',
    image: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80&w=1000',
    description: 'Wander cobblestone lanes enclosed by 400-year-old Dutch ramparts, visiting artisan jewelers, boutique espresso bars, and historic lighthouses.',
    highlights: [
      'Guided rampart heritage walk at golden hour',
      'Artisan gem & spiced tea shopping',
      'Colonial courtyard gourmet dining'
    ],
    recommendedTime: '4:00 PM – 7:00 PM',
    rating: 4.9
  }
];
