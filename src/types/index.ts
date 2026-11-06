export type MediaType = 'image' | 'video';

export type MediaSource = 'google_photo' | 'upload' | 'url';

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  source: MediaSource;
  location?: string;
  album?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerAvatar?: string;
  createdAt: number;
  updatedAt: number;
  isProtected: boolean;
  passwordHash?: string; // SHA-256 hash
  passwordHint?: string;
  tags?: string[];
  fileSize?: string;
  duration?: string;
  notes?: string;
  isFavorite?: boolean;
}

export interface SharedLink {
  id: string;
  token: string;
  targetType: 'single' | 'collection';
  mediaItem?: MediaItem;
  collectionTitle?: string;
  title: string;
  requiresPassword: boolean;
  passwordHash?: string;
  passwordHint?: string;
  allowDownload: boolean;
  expiresAt?: number | null;
  createdAt: number;
  viewCount: number;
  createdBy: string;
}

export interface ConnectedAccount {
  email: string;
  displayName: string;
  photoURL?: string;
  accessToken: string;
  connectedAt: number;
  isPrimary?: boolean;
}
