export type UserRole =
  | 'DEVELOPER'
  | 'SUPER_ADMIN'
  | 'COMMUNITY_MODERATOR'
  | 'CONTENT_CREATOR'
  | 'PROPERTY_ADMIN'
  | 'AGENT'
  | 'PROPERTY_SEEKER'
  | 'LAND_OWNER'
  | 'LANDOWNER'
  | 'CHANNEL_PARTNER'
  | 'RESELLER'
  | 'RERA_AGENT'
  | 'REAL_ESTATE_MEDIA';

export type LeadTier = 'STANDARD' | 'PREMIUM' | 'HNI';

export interface User {
  id: string;
  publicId?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  organization?: string;
  company?: string;
  townCity?: string;
  profession?: string;
  interests?: string[];
  reraNumber?: string;
  walletBalance: number;
  assignedPropertyIds?: string[];
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  accountStatus?: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  mustChangePassword?: boolean;
  lastLoginAt?: string;
}

export interface PropertyAdminAssignment {
  id: string;
  propertyId: string;
  adminUserId: string;
  adminUserName: string;
  adminUserEmail: string;
  assignedAt: string;
  assignedBySuperAdmin: string;
}

export interface ConstructionLog {
  id: string;
  propertyId: string;
  date: string;
  milestoneTitle: string;
  description: string;
  progressPercentage: number;
  stage: 'Excavation' | 'Foundation' | 'Superstructure' | 'Brickwork & MEP' | 'Finishing' | 'Handover Ready';
  verifiedBy: string;
  imageUrl?: string;
}

export interface PropertyRating {
  constructionQuality: number; // 1-5
  deliveryTimelines: number;   // 1-5
  legalCompliance: number;     // 1-5
  overallScore: number;
  totalReviews: number;
}

export interface FloorPlan {
  id: string;
  name: string;
  type: string;
  superBuiltUpSqft: number;
  carpetSqft: number;
  priceEstimate: string;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  facing: string;
  imageUrl: string;
}

export interface PriceBreakdownItem {
  label: string;
  amountLakhs: number;
  isMandatory: boolean;
  notes?: string;
}

export interface PropertyMapCoordinates {
  lat: number;
  lng: number;
  label: string;
  distanceToOrrKm: number;
  distanceToAirportKm: number;
}

export interface Property {
  id: string;
  title: string;
  developerName: string;
  developerLogo?: string;
  isClaimedByDeveloper: boolean;
  microMarket: string;
  location: string;
  propertyType: string;
  priceRange: string;
  pricePerSqft: number;
  totalUnits: number;
  availableUnits: number;
  reraRegId: string;
  completionDate: string;
  progressPercent: number;
  tags: string[];
  heroImage: string;
  galleryImages: string[];
  ratings: PropertyRating;
  assignedAdmins: string[];
  amenities: string[];
  highlights: string[];
  videoWalkthroughUrl?: string;
  videoDuration?: string;
  audioNarrationUrl?: string;
  audioNarrationTitle?: string;
  audioNarrationDuration?: string;
  audioTranscript?: string;
  floorPlans?: FloorPlan[];
  priceBreakdown?: PriceBreakdownItem[];
  mapCoordinates?: PropertyMapCoordinates;
}

export interface Lead {
  id: string;
  seekerName: string; // Masked if locked: "S*** K***"
  seekerPhone: string; // Masked if locked: "+91 98****3421"
  seekerEmail: string; // Masked if locked: "s***@gmail.com"
  budget: string;
  budgetMinLakhs: number;
  microMarket: string;
  propertyType: string;
  timeframe: 'Immediate (Within 15 Days)' | 'Next 30-45 Days' | 'Next 90 Days' | 'Investment (6+ Months)';
  requirements: string;
  tier: LeadTier;
  priceCredits: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  unlockedByUserId?: string;
  unlockedByRole?: UserRole;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  title: string;
  type: 'MASTERCLASS' | 'PODCAST' | 'PROJECT_WALKTHROUGH' | 'MARKET_ANALYSIS';
  duration: string;
  host: string;
  guest?: string;
  guestTitle?: string;
  videoUrl: string;
  thumbnail: string;
  summary: string;
  keyTakeaways: string[];
  timestamps: { time: string; label: string }[];
  views: number;
  publishedDate: string;
}

export interface ConferenceQuestion {
  id: string;
  authorName: string;
  authorRole: string;
  question: string;
  upvotes: number;
  isAnswered: boolean;
  timestamp: string;
}

export interface ConferencePoll {
  id: string;
  question: string;
  options: { label: string; votes: number }[];
  totalVotes: number;
  userVotedIndex?: number;
}

export interface CorporateConference {
  id: string;
  title: string;
  developerName: string;
  projectFocus: string;
  date: string;
  time: string;
  status: 'LIVE' | 'UPCOMING' | 'RECORDED';
  attendeesCount: number;
  currentPresenter: string;
  presenterRole: string;
  streamThumbnail: string;
  presentationSlideUrl: string;
  currentSlideIndex: number;
  totalSlides: number;
  agenda: string[];
  questions: ConferenceQuestion[];
  polls: ConferencePoll[];
}

export interface MicroMarketTrend {
  microMarket: string;
  currentAvgRate: number; // ₹/sqft
  quarterlyChangePct: number;
  yearlyAppreciationPct: number;
  supplyUnits: number;
  demandScore: number; // Out of 100
  infrastructureHighlights: string[];
  history: { quarter: string; avgRate: number }[];
}

export interface CommunityReply {
  id: string;
  authorName: string;
  authorRole: UserRole;
  authorProfession?: string;
  isVerifiedBuilderReply: boolean;
  isAmaAnswer?: boolean;
  content: string;
  createdAt: string;
}

export interface PostLink {
  title: string;
  url: string;
}

export interface PostAttachment {
  type: string;
  url: string;
  name: string;
}

export interface CommentItem {
  id: string;
  postId: string;
  parentId?: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  likesCount: number;
  userLiked?: boolean;
  replies?: CommentItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface CommunityPost {
  id: string;
  authorId?: string;
  authorName: string;
  authorRole: UserRole;
  authorProfession?: string;
  propertyId?: string;
  propertyName?: string;
  communityId?: string;
  communityName?: string;
  topic: 'Construction Updates' | 'Legal & RERA' | 'Livability & Amenities' | 'Resale & Rental Yield' | 'Builder Credibility' | string;
  title: string;
  content: string;
  links?: PostLink[];
  attachments?: PostAttachment[];
  mediaType?: 'POST' | 'PODCAST' | 'VIDEO';
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  postType?: 'QUESTION' | 'POST' | 'IMAGE_VIDEO' | 'LINK' | 'POLL' | 'AMA';
  visibility?: 'PUBLIC' | 'COMMUNITY';
  pollOptions?: Array<{ id: string; text: string; votes: number }>;
  pollVotes?: Array<{ userId: string; optionId: string }>;
  userVotedOptionId?: string;
  amaHostName?: string;
  amaHostRole?: string;
  amaStatus?: 'UPCOMING' | 'LIVE' | 'CONCLUDED' | 'ENDED';
  amaStartTime?: string;
  amaEndTime?: string;
  bookmarked?: boolean;
  bookmarkCount?: number;
  status?: 'APPROVED' | 'PUBLISHED' | 'PENDING_APPROVAL' | 'PENDING' | 'REJECTED' | 'FLAGGED' | 'ARCHIVED' | 'SUSPENDED';
  rejectionReason?: string;
  upvotes: number;
  agreeCount?: number;
  disagreeCount?: number;
  userVote?: 1 | -1 | 0;
  followerCount?: number;
  following?: boolean;
  userLiked?: boolean;
  commentsCount?: number;
  repostsCount?: number;
  hasReposted?: boolean;
  isPinned?: boolean;
  isFlagged?: boolean;
  replies: CommunityReply[];
  comments?: CommentItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'POST' | 'COMMENT';
  targetId: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  reviewedBy?: string;
  resolutionNotes?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string;
  actorName: string;
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'MODERATION' | 'SYSTEM';
  title: string;
  message: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetId?: string;
  targetEmail?: string;
  details?: string;
  ipAddress?: string;
  status: string;
  createdAt: string;
}

export interface CommunityHub {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  location?: string;
  createdById?: string;
  createdByName?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  memberCount: number;
  icon?: string;
  bannerImage?: string;
  rules?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  membershipStatus?: 'NONE' | 'PENDING' | 'ACTIVE' | 'REJECTED';
  membershipRole?: 'CREATOR' | 'MODERATOR' | 'MEMBER';
  createdAt: string;
  updatedAt: string;
}

export interface CommunityMember {
  id: string;
  communityId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  userProfession?: string;
  userRole?: UserRole;
  role: 'CREATOR' | 'MODERATOR' | 'MEMBER';
  status: 'ACTIVE' | 'PENDING' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface DiscussionRepost {
  repostId: string;
  postId: string;
  repostedAt: string;
  note?: string;
  postTitle: string;
  postContent: string;
  postTopic: string;
  postAuthorId: string;
  postAuthorName: string;
  postAuthorRole: UserRole;
  postAuthorProfession?: string;
  postCreatedAt: string;
  communityId?: string;
  communityName?: string;
  upvotes: number;
  commentsCount: number;
  shareUrl: string;
}

export interface AgentApplication {
  id: string;
  agentName: string;
  agencyName: string;
  email: string;
  phone: string;
  reraState: string;
  reraNumber: string;
  experienceYears: number;
  feePaid: boolean;
  feeAmount: number;
  documents: { name: string; status: 'VALIDATED' | 'PENDING' }[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
}

export interface DeveloperClaim {
  id: string;
  propertyId: string;
  propertyName: string;
  developerName: string;
  authorizedPerson: string;
  contactEmail: string;
  contactPhone: string;
  reraCertificateUrl: string;
  boardResolutionUrl: string;
  planSubscription: 'Pro Builder' | 'Enterprise Developer';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId: string;
  text: string;
  timestamp: string;
  leadContextId?: string;
}

export type ViewType =
  | 'HOME'
  | 'DASHBOARD'
  | 'PROPERTIES'
  | 'LEADS_MARKET'
  | 'MEDIA'
  | 'CONFERENCE'
  | 'MARKET_INSIGHTS'
  | 'COMMUNITY'
  | 'REVIEWS'
  | 'REQUIREMENT'
  | 'CHAT'
  | 'ADMIN'
  | 'DEVELOPER'
  | 'PROFESSIONAL'
  | 'PROPERTY_ADMIN'
  | 'STUDIO'
  | 'CONTACT'
  | 'PRIVACY'
  | 'TERMS';

export type DeviceMode = 'AUTO' | 'MOBILE_APK' | 'DESKTOP' | 'STUDIO_IFP';
