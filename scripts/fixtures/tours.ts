import { TourPackage } from '../../src/types';

export const TOURS: TourPackage[] = [
  {
    id: 'island-in-7-days',
    title: 'Island in 7 Days',
    subtitle: 'The essential Sri Lanka journey combining culture, mountains, wildlife & beach.',
    days: 7,
    category: 'Full Island',
    priceFrom: 1250,
    image: 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&q=80&w=1200',
    route: ['Colombo', 'Kandy', 'Ella', 'Yala', 'South Coast'],
    shortDesc: 'Experience the magical highlights of Sri Lanka in one week—from sacred hill capitals and scenic train journeys to leopard safaris and tropical beach sunsets.',
    fullDesc: 'Curated for travelers seeking the ultimate introduction to Sri Lanka, this signature 7-day expedition spans the vibrant island across five distinct landscapes.',
    highlights: [
      'Temple of the Tooth ceremonial blessing in Kandy',
      'Iconic scenic blue train ride through Ella tea plantations',
      'Private 4x4 leopard safari in Yala National Park',
      'Sunset rampart stroll at historic Galle Fort'
    ],
    includedPlaces: ['Colombo', 'Kandy', 'Nuwara Eliya', 'Ella', 'Yala', 'Mirissa', 'Galle'],
    itinerary: [
      { day: 1, title: 'Arrival & Colombo Gateway', description: 'Private airport greeting, boutique hotel check-in, and sunset cocktails overlooking Galle Face Green.', location: 'Colombo' },
      { day: 2, title: 'Journey to Kandy Hill Capital', description: 'Scenic drive into the mountains, visit Peradeniya Botanical Gardens and Temple of the Tooth Relic.', location: 'Kandy' },
      { day: 3, title: 'The Highland Blue Train to Ella', description: 'Board the world-famous highland blue train winding through tea estates and misty mountain gaps.', location: 'Ella' },
      { day: 4, title: 'Ella Peaks & Waterfall Discovery', description: 'Sunrise hike to Little Adam’s Peak, photo stop at Nine Arch Bridge, and Ravana Falls.', location: 'Ella' },
      { day: 5, title: 'Wild Safari in Yala', description: 'Descend to southern plains for an afternoon 4x4 jeep safari tracking leopards and wild elephants.', location: 'Yala' },
      { day: 6, title: 'South Coast Beach Relaxation', description: 'Coastal drive to Mirissa & Galle, Coconut Tree Hill sunset photo and beachside seafood banquet.', location: 'Mirissa / Galle' },
      { day: 7, title: 'Galle Fort Heritage & Farewell', description: 'Morning guided walk through Dutch colonial ramparts before coastal highway return to Colombo airport.', location: 'Galle / Colombo' }
    ]
  },
  {
    id: 'cultural-sri-lanka',
    title: 'Cultural Sri Lanka',
    subtitle: 'Immerse yourself in 2,500 years of royal heritage and sacred architecture.',
    days: 6,
    category: 'Culture',
    priceFrom: 1100,
    image: 'https://images.unsplash.com/photo-1586861635167-e5223aadc9fe?auto=format&fit=crop&q=80&w=1200',
    route: ['Anuradhapura', 'Sigiriya', 'Dambulla', 'Kandy'],
    shortDesc: 'Step back in time as you explore ancient rock fortresses, subterranean cave temples, ruined royal palaces, and sacred Buddhist monuments.',
    fullDesc: 'An enchanting voyage through Sri Lanka’s UNESCO World Heritage Cultural Triangle, designed for lovers of history, art, and timeless spiritual traditions.',
    highlights: [
      'Dawn climb of the majestic Sigiriya Lion Rock Fortress',
      'Bicycle tour through Anuradhapura ancient royal stupas',
      'Dambulla gilded rock cave temples exploration',
      'Kandyan traditional drum and dance cultural show'
    ],
    includedPlaces: ['Anuradhapura', 'Polonnaruwa', 'Sigiriya', 'Dambulla', 'Kandy'],
    itinerary: [
      { day: 1, title: 'Arrival & Sacred Anuradhapura', description: 'Drive to Sri Lanka’s 1st ancient capital and visit the 2,300-year-old sacred Sri Maha Bodhi tree.', location: 'Anuradhapura' },
      { day: 2, title: 'Medieval Ruins of Polonnaruwa', description: 'Cycle past royal palaces, audience halls, and the carved granite Buddhas of Gal Vihara.', location: 'Polonnaruwa' },
      { day: 3, title: 'Sigiriya Lion Rock Sunrise', description: 'Scale the 200m granite citadel of Sigiriya before crowds arrive, exploring royal water gardens.', location: 'Sigiriya' },
      { day: 4, title: 'Dambulla Cave Temples', description: 'Ascend to 5 illuminated rock caverns filled with ancient frescoes and gilded Buddha statues.', location: 'Dambulla' },
      { day: 5, title: 'Kandy Royal Kingdom', description: 'Discover Kandy lake, traditional artisan workshops, and evening Temple of the Tooth ceremony.', location: 'Kandy' },
      { day: 6, title: 'Spice Gardens & Departure', description: 'Morning herbal spice garden tour and private transfer back to Colombo airport.', location: 'Colombo' }
    ]
  },
  {
    id: 'wild-sri-lanka',
    title: 'Wild Sri Lanka Expedition',
    subtitle: 'An epic wildlife safari from dense jungles to elephant gatherings.',
    days: 8,
    category: 'Wildlife',
    priceFrom: 1480,
    image: 'https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&q=80&w=1200',
    route: ['Wilpattu', 'Sigiriya', 'Minneriya', 'Yala'],
    shortDesc: 'A paradise for wildlife lovers. Track leopards, sloth bears, wild elephant herds, saltwater crocodiles, and blue whales across national sanctuaries.',
    fullDesc: 'Sri Lanka is Asia’s top biodiversity hotspot. This expedition brings you face-to-face with the island’s Big Five: Leopard, Elephant, Sloth Bear, Blue Whale, and Sperm Whale.',
    highlights: [
      'Wilpattu National Park natural lake safari',
      'Witness the Elephant Gathering at Minneriya Reservoir',
      'Yala National Park dawn leopard tracking safari',
      'Whale watching cruise off the southern coast'
    ],
    includedPlaces: ['Wilpattu', 'Sigiriya', 'Minneriya', 'Udawalawe', 'Yala', 'Mirissa'],
    itinerary: [
      { day: 1, title: 'Arrival & Wilpattu Wilderness', description: 'Head north to Sri Lanka’s largest and quietest national park, famous for natural lakes.', location: 'Wilpattu' },
      { day: 2, title: 'Full Day Wilpattu Safari', description: 'Track elusive leopards and sloth bears through dense dry zone evergreen forests.', location: 'Wilpattu' },
      { day: 3, title: 'Sigiriya & Minneriya Elephants', description: 'Climb Pidurangala rock at sunrise, followed by an afternoon jeep safari watching wild elephant herds.', location: 'Minneriya' },
      { day: 4, title: 'Scenic Countryside Drive South', description: 'Travel through rubber and spice plantations to Udawalawe National Park edge.', location: 'Udawalawe' },
      { day: 5, title: 'Udawalawe Elephant Sanctuary', description: 'Morning safari witnessing wild elephant herds and visiting the Elephant Transit Home.', location: 'Udawalawe' },
      { day: 6, title: 'Yala Leopard Territory', description: 'Check into luxury safari tented camp near Yala and embark on afternoon 4x4 game drive.', location: 'Yala' },
      { day: 7, title: 'Ocean Safari in Mirissa', description: 'Early morning ocean vessel excursion to view giant blue whales and playful dolphin pods.', location: 'Mirissa' },
      { day: 8, title: 'Coastal Farewell', description: 'Relaxed beach breakfast and highway transfer to airport.', location: 'Colombo' }
    ]
  },
  {
    id: 'southern-escape',
    title: 'Southern Coastal Escape',
    subtitle: 'Sun-drenched beaches, surf bays, colonial fort heritage & ocean breezes.',
    days: 5,
    category: 'Luxury',
    priceFrom: 950,
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200',
    route: ['Galle', 'Unawatuna', 'Weligama', 'Mirissa'],
    shortDesc: 'Unwind along Sri Lanka’s golden southern shore. Enjoy boutique luxury, seafood gastronomy, surf points, and tranquil sunset bays.',
    fullDesc: 'The ultimate coastal getaway combining luxury beachfront living, heritage strolls inside Galle Fort, wellness spa treatments, and ocean sunsets.',
    highlights: [
      'Private boutique villa accommodation on the beach',
      'Guided culinary street food and seafood market tour',
      'Catamaran sunset sailing along Mirissa coast',
      'Surf coaching or paddleboarding in Weligama Bay'
    ],
    includedPlaces: ['Galle', 'Unawatuna', 'Weligama', 'Mirissa', 'Bentota'],
    itinerary: [
      { day: 1, title: 'Arrival at Galle Coast', description: 'Express highway transfer to UNESCO Galle Fort. Evening rampart walk and welcome dinner.', location: 'Galle Fort' },
      { day: 2, title: 'Unawatuna Bay & Jungle Beach', description: 'Beach day at pristine Unawatuna bay, Japanese Peace Pagoda visit, and oceanfront dining.', location: 'Unawatuna' },
      { day: 3, title: 'Weligama Surf & Stilt Fishermen', description: 'Morning surf session or stilt fishermen photography, afternoon herbal spa rejuvenation.', location: 'Weligama' },
      { day: 4, title: 'Mirissa Coconut Hill & Catamaran', description: 'Coconut Tree Hill sunrise photo shoot and private sunset catamaran cruise with drinks.', location: 'Mirissa' },
      { day: 5, title: 'Bentota Lagoon & Departure', description: 'Madu River mangrove boat safari on the way back to Colombo airport.', location: 'Bentota / Colombo' }
    ]
  }
];
