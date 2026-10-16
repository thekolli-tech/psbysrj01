import {
  User,
  Property,
  ConstructionLog,
  Lead,
  MediaItem,
  CorporateConference,
  MicroMarketTrend,
  CommunityPost,
  AgentApplication,
  DeveloperClaim,
  PropertyAdminAssignment,
  ChatMessage
} from '../types';

export const ASSET_IMAGES = {
  heroSkyline: '/src/assets/images/hero_luxury_skyline_1791288234434.jpg',
  swamyPortrait: '/src/assets/images/swamy_reddy_standing_vertical_1791363659975.jpg',
  studioBroadcast: '/src/assets/images/media_studio_broadcast_1791288261453.jpg',
  commercialHub: '/src/assets/images/project_commercial_hub_1791288276077.jpg',
  officialLogo: '/brand/property-studio-logo.jpg',
  officialHero: '/brand/property-studio-hero.jpg',
  swamyFullPortrait: '/src/assets/images/swamy_reddy_standing_vertical_1791363659975.jpg'
};

export const INITIAL_USERS: User[] = [
  {
    id: 'user_super_admin',
    name: 'Swamy Reddy Javidi',
    email: 'swamy.reddy@propertystudio.in',
    phone: '+91 98490 12890',
    role: 'SUPER_ADMIN',
    avatar: ASSET_IMAGES.swamyPortrait,
    organization: 'Property Studio Media & Intelligence',
    walletBalance: 0,
    isVerified: true
  },
  {
    id: 'user_prop_admin_rajiv',
    name: 'Rajiv Williams',
    email: 'rajiv.williams@thecrown-neopolis.com',
    phone: '+91 98230 45671',
    role: 'PROPERTY_ADMIN',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    organization: 'The Crown Project Management Office',
    assignedPropertyIds: ['prop_crown_neopolis'],
    walletBalance: 0,
    isVerified: true
  },
  {
    id: 'user_dev_aparna',
    name: 'Maheshwar Rao (MD)',
    email: 'maheshwar.rao@aparnainfra.com',
    phone: '+91 98850 99881',
    role: 'DEVELOPER',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    organization: 'Aparna Infra & Constructions',
    reraNumber: 'P02400004921',
    walletBalance: 0,
    isVerified: true
  },
  {
    id: 'user_agent_vikram',
    name: 'Vikram Sethi',
    email: 'vikram@luxuryestates-hyd.com',
    phone: '+91 99120 77654',
    role: 'AGENT',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
    organization: 'Sethi Luxury Advisory Pvt Ltd',
    reraNumber: 'A02400001882',
    walletBalance: 0,
    isVerified: true
  },
  {
    id: 'user_seeker_ananya',
    name: 'Dr. Ananya Rao',
    email: 'ananya.rao@apollohealth.org',
    phone: '+91 98480 34112',
    role: 'PROPERTY_SEEKER',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    organization: 'Healthcare Leadership',
    walletBalance: 0,
    isVerified: true
  },
  {
    id: 'user_landowner_reddy',
    name: 'K. Ramachandra Reddy',
    email: 'ramachandra.reddy@jvland.in',
    phone: '+91 94401 22891',
    role: 'LAND_OWNER',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    organization: 'Kokapet Land Owners Trust',
    walletBalance: 0,
    isVerified: true
  }
];

export const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'prop_crown_neopolis',
    title: 'The Crown Residences Neopolis',
    developerName: 'Aparna Infra & Constructions',
    developerLogo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=120&q=80',
    isClaimedByDeveloper: true,
    microMarket: 'Neopolis, Kokapet',
    location: 'Plot 12-B, Golden Mile Road, Neopolis SEZ, Hyderabad',
    propertyType: 'Sky Villa',
    priceRange: '₹5.85 Cr - ₹12.50 Cr',
    pricePerSqft: 11800,
    totalUnits: 280,
    availableUnits: 46,
    reraRegId: 'P02400005891',
    completionDate: 'Dec 2027',
    progressPercent: 68,
    tags: ['Ultra Luxury', '4 & 5 BHK Sky Mansions', 'RERA Approved', 'Triple Height Decks'],
    heroImage: ASSET_IMAGES.heroSkyline,
    galleryImages: [
      ASSET_IMAGES.heroSkyline,
      ASSET_IMAGES.commercialHub,
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80'
    ],
    videoWalkthroughUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-modern-city-skyscrapers-31464-large.mp4',
    videoDuration: '3:45',
    audioNarrationUrl: '/audio/briefing-crown-neopolis.mp3',
    audioNarrationTitle: 'The Crown Neopolis: 58-Storey Aerodynamic Sky Architecture Briefing',
    audioNarrationDuration: '2:50',
    audioTranscript: 'Welcome to the architectural and structural audit of The Crown Residences, Neopolis. Positioned directly at Plot 12-B overlooking the Neopolis SEZ trumpet interchange, this 58-storey residential monolith features core shear walls engineered with M60 grade high-durability concrete. Each 4 and 5 BHK sky mansion offers a 3.4-meter floor-to-ceiling clear span with cantilevered triple-height biophilic balconies engineered to withstand wind vortex shedding exceeding 140 km/h. At ₹11,800 per square foot, initial tranches offer an audited 18.5% projected appreciation through its December 2027 handover cycle.',
    floorPlans: [
      {
        id: 'fp_crown_4bhk',
        name: 'Grand Sky Mansion',
        type: '4 BHK + Maid Quarters',
        superBuiltUpSqft: 5200,
        carpetSqft: 4120,
        priceEstimate: '₹6.14 Cr',
        bedrooms: 4,
        bathrooms: 5,
        balconies: 3,
        facing: 'East / Lake Facing',
        imageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'fp_crown_5bhk_penthouse',
        name: 'The Imperial Duplex Sky Villa',
        type: '5 BHK Duplex Penthouse',
        superBuiltUpSqft: 8900,
        carpetSqft: 7240,
        priceEstimate: '₹10.50 Cr',
        bedrooms: 5,
        bathrooms: 6,
        balconies: 4,
        facing: 'North-East Panoramic',
        imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80'
      }
    ],
    priceBreakdown: [
      { label: 'Base Unit Cost (5,200 sq.ft @ ₹11,800/sqft)', amountLakhs: 613.6, isMandatory: true },
      { label: 'Clubhouse & Biophilic Sky Park Amenities', amountLakhs: 25.0, isMandatory: true },
      { label: 'Covered Basement EV Parking (3 Bays)', amountLakhs: 15.0, isMandatory: true },
      { label: 'GST (5% for Under-Construction Luxury)', amountLakhs: 32.68, isMandatory: true, notes: 'Direct government statutory levy' },
      { label: 'Stamp Duty & Registration (7.5% TG Registration)', amountLakhs: 49.02, isMandatory: true, notes: 'Payable at sub-registrar handover' },
      { label: 'Advance Sinking Fund & 24-Month Maintenance', amountLakhs: 8.5, isMandatory: false }
    ],
    mapCoordinates: {
      lat: 17.3984,
      lng: 78.3325,
      label: 'Neopolis Golden Mile SEZ',
      distanceToOrrKm: 0.8,
      distanceToAirportKm: 26.4
    },
    ratings: {
      constructionQuality: 4.8,
      deliveryTimelines: 4.6,
      legalCompliance: 4.9,
      overallScore: 4.8,
      totalReviews: 84
    },
    assignedAdmins: ['user_prop_admin_rajiv'],
    amenities: [
      'Private Heated Lap Pool per Penthouse',
      'Helipad Access on Tower A',
      'Concierge by Quintessentially',
      '3.5-Acre Elevated Biophilic Sky Park',
      'IGBC Platinum Green Certification'
    ],
    highlights: [
      'Direct 3-minute access to Neopolis Trumpet Interchange',
      'Structure completed up to 42nd floor out of 58 levels',
      'Zero deviation architectural compliance audited by Property Studio'
    ]
  },
  {
    id: 'prop_kokapet_pinnacle',
    title: 'Kokapet Pinnacle Towers',
    developerName: 'My Home Real Estate Consortium',
    isClaimedByDeveloper: true,
    microMarket: 'Kokapet',
    location: 'Survey No. 74, Financial District Extension, Kokapet',
    propertyType: 'Luxury High-Rise',
    priceRange: '₹3.40 Cr - ₹6.80 Cr',
    pricePerSqft: 9600,
    totalUnits: 520,
    availableUnits: 98,
    reraRegId: 'P02400004112',
    completionDate: 'June 2028',
    progressPercent: 44,
    tags: ['3 & 4 BHK Luxury', 'Lake View Balconies', 'Smart Automation'],
    heroImage: ASSET_IMAGES.commercialHub,
    galleryImages: [
      ASSET_IMAGES.commercialHub,
      ASSET_IMAGES.heroSkyline,
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80'
    ],
    videoWalkthroughUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-city-traffic-and-buildings-42999-large.mp4',
    videoDuration: '2:55',
    audioNarrationUrl: '/audio/briefing-kokapet-pinnacle.mp3',
    audioNarrationTitle: 'Kokapet Pinnacle Towers: Gandipet Lake View High-Rise Analysis',
    audioNarrationDuration: '2:15',
    audioTranscript: 'Kokapet Pinnacle Towers offers unmatched vantage points overlooking the permanent Gandipet lake preservation buffer. Engineering highlights include post-tensioned slab casting for seismic resistance Zone II and double-glazed Saint-Gobain acoustic curtain walls that reduce ambient solar heating by 42%. With a 60,000 sq.ft clubhouse and direct proximity to Kokapet SEZ, this project captures both owner-occupier comfort and premier rental yield.',
    floorPlans: [
      {
        id: 'fp_pinnacle_3bhk',
        name: 'Executive Lake Suite',
        type: '3 BHK Luxury',
        superBuiltUpSqft: 2850,
        carpetSqft: 2280,
        priceEstimate: '₹3.42 Cr',
        bedrooms: 3,
        bathrooms: 3,
        balconies: 2,
        facing: 'West (Lake View)',
        imageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80'
      },
      {
        id: 'fp_pinnacle_4bhk',
        name: 'Presidential Horizon Suite',
        type: '4 BHK + Home Office',
        superBuiltUpSqft: 4200,
        carpetSqft: 3410,
        priceEstimate: '₹5.04 Cr',
        bedrooms: 4,
        bathrooms: 4,
        balconies: 3,
        facing: 'North-West',
        imageUrl: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=800&q=80'
      }
    ],
    priceBreakdown: [
      { label: 'Base Unit Cost (2,850 sq.ft @ ₹9,600/sqft)', amountLakhs: 273.6, isMandatory: true },
      { label: 'Clubhouse, Olympic Pool & Bowling Alley', amountLakhs: 18.0, isMandatory: true },
      { label: 'Car Parking (2 Covered Bays with EV Charging)', amountLakhs: 10.0, isMandatory: true },
      { label: 'GST (5%)', amountLakhs: 15.08, isMandatory: true },
      { label: 'Stamp Duty & Registration (7.5%)', amountLakhs: 22.62, isMandatory: true }
    ],
    mapCoordinates: {
      lat: 17.3892,
      lng: 78.3241,
      label: 'Kokapet Golden Mile Corridor',
      distanceToOrrKm: 1.2,
      distanceToAirportKm: 27.8
    },
    ratings: {
      constructionQuality: 4.5,
      deliveryTimelines: 4.4,
      legalCompliance: 4.7,
      overallScore: 4.5,
      totalReviews: 62
    },
    assignedAdmins: [],
    amenities: [
      '60,000 sq.ft Clubhouse with Bowling Alley',
      'Temperature Controlled Olympic Pool',
      'Co-Working Business Lounge with Video Pods',
      'Electric Vehicle Fast Charging at Every Bay'
    ],
    highlights: [
      'Overlooking Gandipet Lake preservation zone with unblocked sunset view',
      'Post-tensioned slab technology for seismic resistance Zone II'
    ]
  },
  {
    id: 'prop_tellapur_aura',
    title: 'Aura Biophilic Villas',
    developerName: 'Signature Green Spaces',
    isClaimedByDeveloper: false,
    microMarket: 'Tellapur',
    location: 'Radial Road 7, Opp. Kollur ORR Exit, Tellapur',
    propertyType: 'Gated Villa Community',
    priceRange: '₹6.20 Cr - ₹11.00 Cr',
    pricePerSqft: 13500,
    totalUnits: 110,
    availableUnits: 19,
    reraRegId: 'P02400003889',
    completionDate: 'Ready to Move / Q1 2027',
    progressPercent: 88,
    tags: ['Triplex Villas', 'Private Courtyards', 'Solar Grid Hybrid'],
    heroImage: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80'
    ],
    videoWalkthroughUrl: 'https://assets.mixkit.co/videos/preview/mixkit-modern-residence-with-a-pool-and-garden-42436-large.mp4',
    videoDuration: '3:12',
    audioNarrationUrl: '/audio/briefing-aura-villas.mp3',
    audioNarrationTitle: 'Aura Biophilic Villas: Tellapur Low-Density Luxury Living',
    audioNarrationDuration: '1:58',
    audioTranscript: 'Aura Biophilic Villas represents Hyderabad’s premier low-density estate concept on Radial Road 7. Featuring 400 to 550 square yard plots with triplex layouts, each home integrates private courtyards, subterranean rainwater recharging, and grid-tied solar canopies providing up to 8 kW of clean energy. With civil completion at 88%, handovers commence Q1 2027.',
    floorPlans: [
      {
        id: 'fp_aura_triplex',
        name: 'The Courtyard Triplex Villa',
        type: '5 BHK Triplex Estate',
        superBuiltUpSqft: 5400,
        carpetSqft: 4620,
        priceEstimate: '₹7.29 Cr',
        bedrooms: 5,
        bathrooms: 6,
        balconies: 3,
        facing: 'East Facing Vastu Compliant',
        imageUrl: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80'
      }
    ],
    priceBreakdown: [
      { label: 'Base Villa Land & Construction (5,400 sq.ft @ ₹13,500/sqft)', amountLakhs: 729.0, isMandatory: true },
      { label: 'Private Rooftop Jacuzzi & Landscaped Courtyard', amountLakhs: 20.0, isMandatory: true },
      { label: 'Clubhouse, Squash Court & Sports Facilities', amountLakhs: 15.0, isMandatory: true },
      { label: 'GST (5%)', amountLakhs: 38.2, isMandatory: true },
      { label: 'Stamp Duty & Registration (7.5%)', amountLakhs: 57.3, isMandatory: true }
    ],
    mapCoordinates: {
      lat: 17.4521,
      lng: 78.2754,
      label: 'Tellapur Radial Road 7',
      distanceToOrrKm: 2.1,
      distanceToAirportKm: 34.2
    },
    ratings: {
      constructionQuality: 4.7,
      deliveryTimelines: 4.8,
      legalCompliance: 4.9,
      overallScore: 4.8,
      totalReviews: 45
    },
    assignedAdmins: [],
    amenities: [
      'Private Rooftop Jacuzzis',
      'Zero-discharge rainwater harvest recharge wells',
      'Clubhouse with Squash and Badminton Courts',
      '24x7 Multi-tier RFID Security Gate'
    ],
    highlights: [
      '300 to 500 sq. yard plots with 4,800 to 6,200 sq.ft built-up area',
      'Clear title certified by High Court senior advocate verification'
    ]
  },
  {
    id: 'prop_vertex_horizon',
    title: 'Vertex Horizon Grade-A Tech Hub',
    developerName: 'Vertex Commercial Realty',
    isClaimedByDeveloper: true,
    microMarket: 'Financial District',
    location: 'Nanakramguda IT Corridor, Financial District, Hyderabad',
    propertyType: 'Grade-A Commercial',
    priceRange: '₹1.50 Cr - ₹45.00 Cr (Pre-Leased & Bare Shell)',
    pricePerSqft: 14200,
    totalUnits: 160,
    availableUnits: 34,
    reraRegId: 'P02400006201',
    completionDate: 'March 2027',
    progressPercent: 75,
    tags: ['Grade-A IT Office', 'Pre-Leased Options', '8.4% Rental Yield'],
    heroImage: ASSET_IMAGES.commercialHub,
    galleryImages: [
      ASSET_IMAGES.commercialHub,
      ASSET_IMAGES.heroSkyline,
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80'
    ],
    videoWalkthroughUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-skyscrapers-in-a-financial-district-43003-large.mp4',
    videoDuration: '3:30',
    audioNarrationUrl: '/audio/briefing-vertex-horizon.mp3',
    audioNarrationTitle: 'Vertex Horizon Financial District: Commercial Yield & Tenant Analysis',
    audioNarrationDuration: '2:40',
    audioTranscript: 'Vertex Horizon is a landmark Grade-A commercial campus situated in the core Nanakramguda IT corridor. Featuring 2.2 million square feet of leaseable floor plate with 12-meter column-to-column spans, this facility is pre-committed to global technology enterprises yielding an audited 8.4% capitalization rate.',
    floorPlans: [
      {
        id: 'fp_vertex_plate',
        name: 'Typical High-Efficiency Floor Plate',
        type: 'Commercial Bare Shell Plate',
        superBuiltUpSqft: 25000,
        carpetSqft: 20500,
        priceEstimate: '₹35.50 Cr',
        bedrooms: 0,
        bathrooms: 8,
        balconies: 2,
        facing: '360-Degree Daylight Glazed',
        imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
      }
    ],
    priceBreakdown: [
      { label: 'Commercial Office Space Cost (@ ₹14,200/sqft)', amountLakhs: 3550.0, isMandatory: true },
      { label: 'BMS Automated Central HVAC & MERV-14 Infrastructure', amountLakhs: 120.0, isMandatory: true },
      { label: 'Automated Multi-Level Parking Allocation', amountLakhs: 60.0, isMandatory: true },
      { label: 'GST (12% for Commercial Assets)', amountLakhs: 447.6, isMandatory: true },
      { label: 'Stamp Duty & Registration (7.5%)', amountLakhs: 279.7, isMandatory: true }
    ],
    mapCoordinates: {
      lat: 17.4158,
      lng: 78.3489,
      label: 'Financial District Nanakramguda IT Corridor',
      distanceToOrrKm: 0.5,
      distanceToAirportKm: 25.1
    },
    ratings: {
      constructionQuality: 4.9,
      deliveryTimelines: 4.7,
      legalCompliance: 5.0,
      overallScore: 4.9,
      totalReviews: 39
    },
    assignedAdmins: [],
    amenities: [
      'Double-height Air-conditioned Grand Atrium',
      'BMS controlled central HVAC with MERV-14 filtration',
      'Multi-level automated car parking for 2,400 vehicles',
      'Helipad and Executive Boardroom Suite'
    ],
    highlights: [
      'Pre-commitment leases signed with global Fortune 500 IT tenants',
      'Rooftop solar farm offsetting 22% of common area power'
    ]
  }
];

export const INITIAL_CONSTRUCTION_LOGS: ConstructionLog[] = [
  {
    id: 'log_01',
    propertyId: 'prop_crown_neopolis',
    date: 'Oct 2, 2026',
    milestoneTitle: 'Level 42 Floor Slab Casting Completed (Tower A)',
    description: 'M60 grade high-durability concrete pumping completed for floor slab 42. Cube strength tests verified at 28-day target by SGS Labs. Core structural sheer walls progressing to level 43.',
    progressPercentage: 68,
    stage: 'Superstructure',
    verifiedBy: 'Rajiv Williams (Project PMO)',
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'log_02',
    propertyId: 'prop_crown_neopolis',
    date: 'Sep 18, 2026',
    milestoneTitle: 'Facade Double-Glazing Installation on Levels 18 to 28',
    description: 'Unitized structural curtain wall with Saint-Gobain SunBan acoustic and thermal insulated glass installed across south-facing elevation to reduce solar heat gain.',
    progressPercentage: 62,
    stage: 'Finishing',
    verifiedBy: 'Rajiv Williams (Project PMO)',
    imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'log_03',
    propertyId: 'prop_crown_neopolis',
    date: 'Aug 29, 2026',
    milestoneTitle: 'Underground Stormwater Storage & Dual Plumbing Testing',
    description: 'Hydrostatic pressure test successfully passed across basements 1 through 3. Greywater recycling plant piping hooked up to sewage treatment facility.',
    progressPercentage: 55,
    stage: 'Brickwork & MEP',
    verifiedBy: 'Rajiv Williams (Project PMO)'
  },
  {
    id: 'log_04',
    propertyId: 'prop_kokapet_pinnacle',
    date: 'Sep 25, 2026',
    milestoneTitle: 'Podium 2 Structural Slab & Ramp Reinforcement Checked',
    description: 'Inspection conducted for post-tensioned tendon placement before concreting. Reinforcement density compliant with structural consultant blueprints.',
    progressPercentage: 44,
    stage: 'Superstructure',
    verifiedBy: 'Aparna Quality Audit Wing'
  }
];

export const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead_01',
    seekerName: 'S*** K***',
    seekerPhone: '+91 98****3210',
    seekerEmail: 's***@kothari-ventures.com',
    budget: '₹9.00 Cr - ₹12.50 Cr',
    budgetMinLakhs: 900,
    microMarket: 'Neopolis, Kokapet',
    propertyType: 'Sky Villa / Penthouse',
    timeframe: 'Immediate (Within 15 Days)',
    requirements: 'Looking for 5,500+ sq.ft duplex penthouse with private terrace pool and 4 covered car parks in Neopolis. Ready cheque book for right developer.',
    tier: 'HNI',
    priceCredits: 2000,
    isUnlocked: false,
    createdAt: '2 hours ago'
  },
  {
    id: 'lead_02',
    seekerName: 'P*** V***',
    seekerPhone: '+91 99****8712',
    seekerEmail: 'p***@techglobal.io',
    budget: '₹4.50 Cr - ₹5.50 Cr',
    budgetMinLakhs: 450,
    microMarket: 'Kokapet',
    propertyType: 'Luxury High-Rise (4 BHK)',
    timeframe: 'Next 30-45 Days',
    requirements: 'VP at tech multinational relocating from US. Needs East-facing corner 4BHK with unblocked lake view.',
    tier: 'PREMIUM',
    priceCredits: 750,
    isUnlocked: false,
    createdAt: '4 hours ago'
  },
  {
    id: 'lead_03',
    seekerName: 'A*** R***',
    seekerPhone: '+91 98****4112',
    seekerEmail: 'a***@apollohealth.org',
    budget: '₹3.20 Cr - ₹3.80 Cr',
    budgetMinLakhs: 320,
    microMarket: 'Financial District / Nanakramguda',
    propertyType: '3.5 BHK High-Rise',
    timeframe: 'Next 30-45 Days',
    requirements: 'Senior doctor couple seeking spacious 3.5 BHK close to Continental Hospital. Needs peaceful community with elder care amenities and walking tracks.',
    tier: 'STANDARD',
    priceCredits: 300,
    isUnlocked: true,
    unlockedAt: 'Today at 09:15 AM',
    unlockedByUserId: 'user_agent_vikram',
    unlockedByRole: 'AGENT',
    createdAt: 'Yesterday'
  }
];

export const INITIAL_MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'media_01',
    title: 'Kokapet vs. Neopolis: The $15 Billion Micro-Market Masterclass',
    type: 'MASTERCLASS',
    duration: '38:45',
    host: 'Swamy Reddy Javidi',
    guest: 'Maheshwar Rao',
    guestTitle: 'Managing Director, Aparna Infra',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder streamable link
    thumbnail: ASSET_IMAGES.studioBroadcast,
    summary: 'Swamy Reddy Javidi breaks down the urban planning blueprint, upcoming 100-meter Trumpet interchanges, FSI regulations, and realistic yield timelines for high-rise sky mansions in Kokapet & Neopolis.',
    keyTakeaways: [
      'Why Neopolis land auctions at ₹100 Cr/acre set a floor price of ₹11,000/sqft',
      'Hydrological impact study of the Musi River rejuvenation on western corridor drainage',
      'Structural comparison: Steel composite columns vs. high-strength M80 concrete',
      'Upcoming metro connectivity timeline under Hyderabad Metro Phase 2'
    ],
    timestamps: [
      { time: '00:00', label: 'Executive Intro & Land Auction Retrospective' },
      { time: '08:20', label: 'Neopolis Infrastructure & Trumpet Interchange Blueprints' },
      { time: '17:45', label: 'FSI Relaxations & High-Rise Wind Engineering Challenges' },
      { time: '29:10', label: 'Investor ROI Forecast: 2026 to 2030 Horizon' }
    ],
    views: 48200,
    publishedDate: 'Sep 28, 2026'
  },
  {
    id: 'media_02',
    title: 'High-Rise Structural Audits: Wind Load Analysis & Soil Testing Norms',
    type: 'MASTERCLASS',
    duration: '44:12',
    host: 'Swamy Reddy Javidi',
    guest: 'Dr. V. S. Murthy',
    guestTitle: 'Chief Structural Consultant, Premier Engineering',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: ASSET_IMAGES.heroSkyline,
    summary: 'An uncompromised deep dive into how buyers and investors must evaluate soil load-bearing capacities, pile depths, and wind tunnel tests for buildings exceeding 50 storeys in Hyderabad Deccan plateau.',
    keyTakeaways: [
      'How Deccan granite bedrock influences pile foundation depth',
      'Wind dampening systems: Tuned mass dampers vs. aerodynamic corner chamfering',
      'The red flags to check in RERA Form 4 and civil structural certificates'
    ],
    timestamps: [
      { time: '00:00', label: 'Why 50+ Floor Buildings Require Different Physics' },
      { time: '12:15', label: 'Soil Boring Reports & Standard Penetration Test (SPT) Values' },
      { time: '24:50', label: 'Vortex Shedding & Aero-elastic Structural Modeling' }
    ],
    views: 31900,
    publishedDate: 'Sep 15, 2026'
  },
  {
    id: 'media_03',
    title: 'Builder MD Podcast #43: The Future of Biophilic Luxury Communities',
    type: 'PODCAST',
    duration: '52:10',
    host: 'Swamy Reddy Javidi',
    guest: 'Sudheer Reddy',
    guestTitle: 'Executive Director, Green Horizon Developers',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: ASSET_IMAGES.commercialHub,
    summary: 'A candid conversation on whether biophilic sky gardens increase long-term maintenance costs, water consumption realities in gated communities, and how high-net-worth buyers define quiet luxury.',
    keyTakeaways: [
      'Subsurface drip irrigation with recycled RO reject water',
      'Acoustic insulation between floors in open-plan multi-generational layouts',
      'Transparent builder-buyer escrow protocols under TS-RERA 2.0'
    ],
    timestamps: [
      { time: '00:00', label: 'Defining Biophilic Architecture in Indian Climates' },
      { time: '18:30', label: 'Maintenance Cost Realities: ₹6 vs ₹12 per sq.ft/month' },
      { time: '37:10', label: 'Buyer Mindset: What Ultra HNIs Demand in 2026' }
    ],
    views: 27400,
    publishedDate: 'Aug 30, 2026'
  }
];

export const INITIAL_CONFERENCE: CorporateConference = {
  id: 'conf_live_01',
  title: 'Neopolis High-Rise Layout Launch & Institutional Investor Summit 2026',
  developerName: 'Aparna Infra & Consortium Developers',
  projectFocus: 'The Crown Residences & Commercial Sky-Park (Neopolis Phase II)',
  date: 'October 6, 2026',
  time: 'LIVE BROADCAST (Ongoing)',
  status: 'LIVE',
  attendeesCount: 342,
  currentPresenter: 'Swamy Reddy Javidi & Maheshwar Rao (MD)',
  presenterRole: 'Platform Host & Lead Developer MD',
  streamThumbnail: ASSET_IMAGES.studioBroadcast,
  presentationSlideUrl: ASSET_IMAGES.commercialHub || ASSET_IMAGES.heroSkyline,
  currentSlideIndex: 8,
  totalSlides: 24,
  agenda: [
    '01. Opening Remarks by Swamy Reddy Javidi: Western Corridor Macro Trends',
    '02. Project Blueprint Unveiling: 58-Storey Aerodynamic Architecture',
    '03. Financial Modeling & Projected IRR for First-Tranche Unit Holders',
    '04. Live Q&A and Due-Diligence Inquiries from Institutional Buyers'
  ],
  questions: [
    {
      id: 'cq_01',
      authorName: 'Rohan Mehta',
      authorRole: 'Private Wealth Advisor',
      question: 'What is the exact escalation clause on steel and cement prices during the 36-month construction cycle?',
      upvotes: 42,
      isAnswered: true,
      timestamp: '12 mins ago'
    },
    {
      id: 'cq_02',
      authorName: 'Anita Krishnan',
      authorRole: 'Angel Investor',
      question: 'Will the commercial sky-park have independent high-speed elevators or shared bank with the residential sky villas?',
      upvotes: 29,
      isAnswered: false,
      timestamp: '6 mins ago'
    },
    {
      id: 'cq_03',
      authorName: 'Dr. Sudhakar Reddy',
      authorRole: 'Prospective 5 BHK Seeker',
      question: 'Can you confirm the exact clear floor-to-ceiling height in Tower A after false ceiling ducting is accounted for?',
      upvotes: 18,
      isAnswered: false,
      timestamp: '2 mins ago'
    }
  ],
  polls: [
    {
      id: 'poll_01',
      question: 'What is your primary investment criteria for Neopolis high-rise properties in 2026-2027?',
      options: [
        { label: 'Long-term Capital Appreciation (14%+ CAGR)', votes: 184 },
        { label: 'Rental Yield & Corporate Expat Leasing', votes: 76 },
        { label: 'Self-Use End Residence / Trophy Asset', votes: 68 },
        { label: 'Short-term Flip before Handover', votes: 14 }
      ],
      totalVotes: 342,
      userVotedIndex: 0
    }
  ]
};

export const MICRO_MARKET_TRENDS: MicroMarketTrend[] = [
  {
    microMarket: 'Neopolis, Kokapet',
    currentAvgRate: 11800,
    quarterlyChangePct: 4.8,
    yearlyAppreciationPct: 22.4,
    supplyUnits: 3400,
    demandScore: 96,
    infrastructureHighlights: [
      'Direct Trumpet interchange connecting to 8-lane ORR',
      'Underground utility ducting eliminating overhead wires',
      'Upcoming Hyderabad Metro Line 3 extension terminus'
    ],
    history: [
      { quarter: 'Q1 2025', avgRate: 8900 },
      { quarter: 'Q2 2025', avgRate: 9400 },
      { quarter: 'Q3 2025', avgRate: 10100 },
      { quarter: 'Q4 2025', avgRate: 10750 },
      { quarter: 'Q1 2026', avgRate: 11250 },
      { quarter: 'Q2 2026', avgRate: 11500 },
      { quarter: 'Q3 2026', avgRate: 11800 }
    ]
  },
  {
    microMarket: 'Financial District & Nanakramguda',
    currentAvgRate: 10400,
    quarterlyChangePct: 3.2,
    yearlyAppreciationPct: 16.8,
    supplyUnits: 4800,
    demandScore: 92,
    infrastructureHighlights: [
      'Mature IT commercial corridor with 40M+ sq.ft operational Grade-A space',
      'Continental Hospital & WaveRock walkability',
      'Zero-vacancy for pre-leased corporate developments'
    ],
    history: [
      { quarter: 'Q1 2025', avgRate: 8500 },
      { quarter: 'Q2 2025', avgRate: 8900 },
      { quarter: 'Q3 2025', avgRate: 9350 },
      { quarter: 'Q4 2025', avgRate: 9800 },
      { quarter: 'Q1 2026', avgRate: 10050 },
      { quarter: 'Q2 2026', avgRate: 10250 },
      { quarter: 'Q3 2026', avgRate: 10400 }
    ]
  },
  {
    microMarket: 'Tellapur & Kollur',
    currentAvgRate: 7850,
    quarterlyChangePct: 5.6,
    yearlyAppreciationPct: 19.5,
    supplyUnits: 6200,
    demandScore: 88,
    infrastructureHighlights: [
      'Radial Road 7 widening to 150 feet connecting directly to Gachibowli',
      'High concentration of top international schools (Manthan, Glendale)',
      'High density of low-rise gated villa enclaves'
    ],
    history: [
      { quarter: 'Q1 2025', avgRate: 6100 },
      { quarter: 'Q2 2025', avgRate: 6500 },
      { quarter: 'Q3 2025', avgRate: 6900 },
      { quarter: 'Q4 2025', avgRate: 7250 },
      { quarter: 'Q1 2026', avgRate: 7450 },
      { quarter: 'Q2 2026', avgRate: 7650 },
      { quarter: 'Q3 2026', avgRate: 7850 }
    ]
  },
  {
    microMarket: 'Kokapet Core',
    currentAvgRate: 9650,
    quarterlyChangePct: 3.9,
    yearlyAppreciationPct: 18.2,
    supplyUnits: 5100,
    demandScore: 94,
    infrastructureHighlights: [
      'Overlooking Osmansagar & Gandipet protected ecological buffer',
      'Direct link to Golden Mile road and Gopanpally flyover',
      'Proximity to Phoenix Bhubaneswar commercial parks'
    ],
    history: [
      { quarter: 'Q1 2025', avgRate: 7800 },
      { quarter: 'Q2 2025', avgRate: 8200 },
      { quarter: 'Q3 2025', avgRate: 8650 },
      { quarter: 'Q4 2025', avgRate: 9000 },
      { quarter: 'Q1 2026', avgRate: 9250 },
      { quarter: 'Q2 2026', avgRate: 9450 },
      { quarter: 'Q3 2026', avgRate: 9650 }
    ]
  }
];

export const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post_official_welcome',
    authorName: 'Swamy Reddy Javidi',
    authorRole: 'SUPER_ADMIN',
    topic: 'Construction Updates',
    title: 'Property Studio Live Construction & Engineering Community Feed',
    content: 'Welcome to the official Property Studio forum. Real-time civil foundation reports, RERA compliance milestones, and micro-market analyses are published regularly here. Submit your questions or project updates directly below.',
    upvotes: 48,
    createdAt: '2 hours ago',
    mediaType: 'POST',
    thumbnailUrl: ASSET_IMAGES.heroSkyline,
    attachments: [
      { type: 'image', url: ASSET_IMAGES.heroSkyline, name: 'Neopolis High-Rise Elevation Audit.jpg' },
      { type: 'image', url: ASSET_IMAGES.commercialHub, name: 'Commercial Podium Layout.jpg' }
    ],
    replies: [
      {
        id: 'reply_01',
        authorName: 'Rajiv Williams',
        authorRole: 'PROPERTY_ADMIN',
        isVerifiedBuilderReply: true,
        content: 'Project PMO confirms Level 42 casting is now complete with all SGS cube strength certifications on file.',
        createdAt: '1 hour ago'
      }
    ]
  },
  {
    id: 'post_video_drone_neopolis',
    authorName: 'Vikram Sethi',
    authorRole: 'AGENT',
    propertyId: 'prop_crown_neopolis',
    propertyName: 'The Crown Residences Neopolis',
    topic: 'Construction Updates',
    title: '4K Drone Walkthrough: Level 42 Shear Wall & Trumpet Interchange Progress',
    content: 'Exclusive 4K aerial drone survey showing Tower A superstructure progression. Notice the acoustic curtain wall glazing progressing smoothly from Level 18 through 28 without civil delays.',
    upvotes: 64,
    createdAt: 'Yesterday',
    mediaType: 'VIDEO',
    mediaUrl: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-modern-city-skyscrapers-31464-large.mp4',
    thumbnailUrl: ASSET_IMAGES.heroSkyline,
    duration: '3:45',
    attachments: [
      { type: 'video', url: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-modern-city-skyscrapers-31464-large.mp4', name: 'Neopolis Drone Survey 4K.mp4' }
    ],
    replies: [
      {
        id: 'reply_02',
        authorName: 'Maheshwar Rao (MD)',
        authorRole: 'DEVELOPER',
        isVerifiedBuilderReply: true,
        content: 'Thank you Vikram. Schindler high-speed destination dispatch elevator rails are arriving on site next week.',
        createdAt: '18 hours ago'
      }
    ]
  },
  {
    id: 'post_audio_podcast_briefing',
    authorName: 'Swamy Reddy Javidi',
    authorRole: 'SUPER_ADMIN',
    topic: 'Resale & Rental Yield',
    title: 'Executive Audio Briefing: Western Corridor 2026 Price Appreciation Drivers',
    content: 'Listen to my 3-minute executive voice note analyzing why Kokapet Neopolis and Radial Road 7 continue to outperform central Hyderabad in capital appreciation and rental yield.',
    upvotes: 89,
    createdAt: '3 days ago',
    mediaType: 'PODCAST',
    mediaUrl: '/audio/briefing-western-corridor-macro.mp3',
    thumbnailUrl: ASSET_IMAGES.swamyPortrait,
    duration: '3:12',
    replies: []
  },
  {
    id: 'post_rera_due_diligence',
    authorName: 'Dr. Ananya Rao',
    authorRole: 'PROPERTY_SEEKER',
    propertyId: 'prop_tellapur_aura',
    propertyName: 'Aura Biophilic Villas',
    topic: 'Legal & RERA',
    title: 'High Court Senior Advocate Title Due Diligence: 100% Clear Link Documents',
    content: 'Before booking our triplex villa at Aura, our legal counsel conducted a 45-year title trace from 1980 onwards. Verified that zero Inam land or ceiling litigation exists across Survey No. 74.',
    upvotes: 38,
    createdAt: '5 days ago',
    mediaType: 'POST',
    thumbnailUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
    attachments: [
      { type: 'image', url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80', name: 'Aura Villa Site Photo.jpg' }
    ],
    replies: []
  }
];

export const INITIAL_AGENT_APPLICATIONS: AgentApplication[] = [
  {
    id: 'agent_app_01',
    agentName: 'Harish Varma',
    agencyName: 'Varma Prime Properties',
    email: 'harish@varmaprime.com',
    phone: '+91 98499 12345',
    reraState: 'Telangana',
    reraNumber: 'A02400008922',
    experienceYears: 11,
    feePaid: true,
    feeAmount: 2499,
    documents: [
      { name: 'TS-RERA Agent Registration Certificate.pdf', status: 'VALIDATED' },
      { name: 'GSTIN Certificate Form REG-06.pdf', status: 'VALIDATED' },
      { name: 'Aadhaar & PAN Verification.pdf', status: 'VALIDATED' }
    ],
    status: 'PENDING',
    submittedAt: 'Today at 08:30 AM'
  },
  {
    id: 'agent_app_02',
    agentName: 'Meenakshi Iyer',
    agencyName: 'Prestige Advisory Partners',
    email: 'meenakshi@prestigeadvisors.in',
    phone: '+91 97011 55667',
    reraState: 'Telangana',
    reraNumber: 'A02400006731',
    experienceYears: 8,
    feePaid: true,
    feeAmount: 2499,
    documents: [
      { name: 'TS-RERA Agent Certificate.pdf', status: 'VALIDATED' },
      { name: 'Professional Indemnity Insurance.pdf', status: 'VALIDATED' }
    ],
    status: 'PENDING',
    submittedAt: 'Yesterday'
  }
];

export const INITIAL_DEVELOPER_CLAIMS: DeveloperClaim[] = [
  {
    id: 'claim_01',
    propertyId: 'prop_tellapur_aura',
    propertyName: 'Aura Biophilic Villas',
    developerName: 'Signature Green Spaces Pvt Ltd',
    authorizedPerson: 'N. Venkat Rao (Director of Operations)',
    contactEmail: 'operations@signaturegreens.in',
    contactPhone: '+91 98480 99112',
    reraCertificateUrl: 'https://rera.telangana.gov.in/cert/P02400003889',
    boardResolutionUrl: 'https://signaturegreens.in/legal/board-resolution-property-studio.pdf',
    planSubscription: 'Enterprise Developer',
    status: 'PENDING',
    submittedAt: 'Oct 5, 2026'
  }
];

export const INITIAL_ASSIGNMENTS: PropertyAdminAssignment[] = [
  {
    id: 'assign_01',
    propertyId: 'prop_crown_neopolis',
    adminUserId: 'user_prop_admin_rajiv',
    adminUserName: 'Rajiv Williams',
    adminUserEmail: 'rajiv.williams@thecrown-neopolis.com',
    assignedAt: 'Aug 1, 2026',
    assignedBySuperAdmin: 'Swamy Reddy Javidi'
  }
];

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_01',
    senderId: 'user_agent_vikram',
    senderName: 'Vikram Sethi (Agent)',
    senderRole: 'AGENT',
    recipientId: 'user_seeker_ananya',
    text: 'Good morning Dr. Ananya. I have obtained the verified architectural layouts for Tower B at Continental Walk. Would you be open to an executive site walkthrough this Saturday at 11 AM?',
    timestamp: '10:15 AM',
    leadContextId: 'lead_03'
  },
  {
    id: 'msg_02',
    senderId: 'user_seeker_ananya',
    senderName: 'Dr. Ananya Rao',
    senderRole: 'PROPERTY_SEEKER',
    recipientId: 'user_agent_vikram',
    text: 'Hello Vikram. Saturday 11 AM works well. Please ensure the project civil engineer or PMO is present to walk us through the noise isolation specs.',
    timestamp: '10:28 AM',
    leadContextId: 'lead_03'
  },
  {
    id: 'msg_03',
    senderId: 'user_agent_vikram',
    senderName: 'Vikram Sethi (Agent)',
    senderRole: 'AGENT',
    recipientId: 'user_seeker_ananya',
    text: 'Confirmed. I have notified Rajiv Williams from the Project PMO. He will accompany us with the calibrated decibel readings and structural drawings.',
    timestamp: '10:32 AM',
    leadContextId: 'lead_03'
  }
];
