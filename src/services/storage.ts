import { MediaItem, SharedLink } from '../types';

const STORAGE_KEYS = {
  MEDIA_ITEMS: 'nhachungminh_media_v2',
  SHARED_LINKS: 'nhachungminh_shared_links_v1',
  VAULT_MASTER_PIN: 'nhachungminh_master_pin_v1',
};

// Simplified to 2 meaningful albums matching: "Nhà chúng mình. Nơi bình yên của hai đứa"
const DEFAULT_MEMORIES: MediaItem[] = [
  {
    id: 'memory-1',
    title: 'Bình Minh Trên Cánh Đồng Lúa Chín Vàng Mùa Gặt',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80',
    source: 'upload',
    location: 'Cánh Đồng Mùa Gặt',
    album: 'Làng Quê Thanh Bình',
    ownerName: 'Chúng Mình',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    updatedAt: Date.now() - 1000 * 60 * 60 * 2,
    isProtected: false,
    tags: ['Cánh đồng lúa', 'Bình minh', 'Mùa gặt', 'Yên bình'],
    fileSize: '4.2 MB',
    isFavorite: true,
    notes: 'Sương sớm đọng trên từng nhánh lúa vàng óng ả, hương lúa mới thơm ngát cả một góc trời quê.',
  },
  {
    id: 'memory-2',
    title: 'Hoàng Hôn Dịu Dàng Bên Lũy Tre & Dòng Sông Quê',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    source: 'upload',
    location: 'Bến Sông Xưa',
    album: 'Làng Quê Thanh Bình',
    ownerName: 'Chúng Mình',
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    updatedAt: Date.now() - 1000 * 60 * 60 * 8,
    isProtected: false,
    tags: ['Hoàng hôn', 'Bến sông', 'Thơ mộng', 'Tre làng'],
    fileSize: '5.1 MB',
    isFavorite: true,
    notes: 'Ánh nắng chiều buông xuống mặt nước êm đềm, tiếng chuông chùa xa xa vọng lại thanh bình khôn xiết.',
  },
  {
    id: 'memory-4',
    title: 'Góc Sân Nắng Vàng & Vườn Rau Nhỏ Sau Nhà (Kỷ Niệm Riêng Tư)',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=600&q=80',
    source: 'upload',
    location: 'Mảnh Vườn Nhà Mình',
    album: 'Góc Nhỏ Của Hai Đứa',
    ownerName: 'Chúng Mình',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
    isProtected: true,
    // SHA-256 for '123456'
    passwordHash: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92',
    passwordHint: 'Mật mã bí mật mặc định: 123456',
    tags: ['Riêng tư', 'Kỷ niệm', 'Mật mã', 'Góc sân'],
    fileSize: '6.4 MB',
    isFavorite: false,
    notes: 'Kỷ niệm riêng tư chỉ mở khi nhập đúng mật mã bảo vệ.',
  },
  {
    id: 'memory-5',
    title: 'Con Đò Gỗ Trôi Giữa Đầm Sen Ngát Hương Mùa Hạ',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=80',
    source: 'google_photo',
    location: 'Đầm Sen Hương Quê',
    album: 'Làng Quê Thanh Bình',
    ownerName: 'Google Photos',
    createdAt: Date.now() - 1000 * 60 * 60 * 36,
    updatedAt: Date.now() - 1000 * 60 * 60 * 36,
    isProtected: false,
    tags: ['Đầm sen', 'Hoa sen hồng', 'Thuyền gỗ', 'Nắng hạ'],
    fileSize: '3.9 MB',
    isFavorite: true,
    notes: 'Những búp sen hồng e ấp tỏa hương thơm thuần khiết trong làn gió sớm.',
  },
  {
    id: 'memory-6',
    title: 'Mái Nhà Gỗ Rêu Phong Dưới Tán Cây Cổ Thụ',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=600&q=80',
    source: 'upload',
    location: 'Nhà Gỗ Đầu Làng',
    album: 'Làng Quê Thanh Bình',
    ownerName: 'Chúng Mình',
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    updatedAt: Date.now() - 1000 * 60 * 60 * 48,
    isProtected: false,
    tags: ['Nhà gỗ', 'Rêu phong', 'Cổ kính', 'Bình yên'],
    fileSize: '4.8 MB',
    isFavorite: false,
    notes: 'Nơi dừng chân ấm áp sau những chuỗi ngày bận rộn nơi phố thị.',
  },
  {
    id: 'memory-7',
    title: 'Video: Hoàng Hôn Lãng Mạn & Khói Lam Chiều Trên Đồi',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=1200&q=80',
    source: 'upload',
    location: 'Triền Đồi Xanh',
    album: 'Góc Nhỏ Của Hai Đứa',
    ownerName: 'Chúng Mình',
    createdAt: Date.now() - 1000 * 60 * 60 * 60,
    updatedAt: Date.now() - 1000 * 60 * 60 * 60,
    isProtected: false,
    tags: ['Video', 'Hoàng hôn', 'Lãng mạn', 'Khói chiều'],
    fileSize: '22.4 MB',
    duration: '0:30',
  },
  {
    id: 'memory-8',
    title: 'Đêm Trăng Thanh Bình & Ánh Đèn Dầu Ấm Áp Trong Hiên Nhà',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1600&q=80',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80',
    source: 'google_photo',
    location: 'Hiên Nhà Đêm Trăng',
    album: 'Góc Nhỏ Của Hai Đứa',
    ownerName: 'Google Photos',
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    updatedAt: Date.now() - 1000 * 60 * 60 * 72,
    isProtected: false,
    tags: ['Đêm trăng', 'Ánh sao', 'Bầu trời đêm', 'Tĩnh lặng'],
    fileSize: '5.6 MB',
    isFavorite: true,
    notes: 'Ngồi bên hiên nhà cùng chén trà ấm, ngắm vầng trăng sáng vằng vặc soi bóng cây.',
  },
];

export function getStoredMedia(): MediaItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEDIA_ITEMS);
    if (!raw) {
      saveStoredMedia(DEFAULT_MEMORIES);
      return DEFAULT_MEMORIES;
    }
    const parsed: MediaItem[] = JSON.parse(raw);
    // Clean and consolidate to the 2 main albums
    const cleaned = parsed
      .filter(item => item.id !== 'memory-3' && item.album !== 'Âm Thanh Bình Yên')
      .map(item => {
        // Consolidate older album names into the 2 core albums
        if (!item.album || item.album === 'Những Buổi Sớm Quê' || item.album === 'Hoàng Hôn Làng Quê' || item.album === 'Mùa Hoa Nở' || item.album === 'Ký Ức Bình Dị') {
          return {
            ...item,
            album: item.album === 'Góc Nhỏ Của Hai Đứa' ? 'Góc Nhỏ Của Hai Đứa' : 'Làng Quê Thanh Bình',
          };
        }
        return item;
      });

    saveStoredMedia(cleaned);
    return cleaned;
  } catch {
    return DEFAULT_MEMORIES;
  }
}

export function saveStoredMedia(items: MediaItem[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.MEDIA_ITEMS, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save memories to localStorage', e);
  }
}

export function getStoredSharedLinks(): SharedLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHARED_LINKS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredSharedLinks(links: SharedLink[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SHARED_LINKS, JSON.stringify(links));
  } catch (e) {
    console.error('Failed to save shared links', e);
  }
}

export function addSharedLink(link: SharedLink) {
  const current = getStoredSharedLinks();
  const updated = [link, ...current.filter(l => l.id !== link.id)];
  saveStoredSharedLinks(updated);
}

export function getSharedLinkByToken(token: string): SharedLink | null {
  const links = getStoredSharedLinks();
  return links.find(l => l.token === token) || null;
}

export function incrementShareViewCount(token: string) {
  const links = getStoredSharedLinks();
  const index = links.findIndex(l => l.token === token);
  if (index !== -1) {
    links[index].viewCount = (links[index].viewCount || 0) + 1;
    saveStoredSharedLinks(links);
  }
}

export function getMasterVaultPin(): string | null {
  return localStorage.getItem(STORAGE_KEYS.VAULT_MASTER_PIN);
}

export function setMasterVaultPin(hash: string) {
  localStorage.setItem(STORAGE_KEYS.VAULT_MASTER_PIN, hash);
}
