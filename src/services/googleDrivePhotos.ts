import { getTokenForEmail } from './firebase';

export interface DriveMediaFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
  createdTime?: string;
  size?: string;
  isImage: boolean;
  isVideo: boolean;
}


/**
 * Fetch photos and videos directly from Google Drive / Google Photos
 */
export async function fetchDrivePhotosAndVideos(email?: string): Promise<DriveMediaFile[]> {
  const token = getTokenForEmail(email);
  if (!token) {
    throw new Error('Chưa đăng nhập tài khoản Google.');
  }

  const query = encodeURIComponent("mimeType contains 'image/' or mimeType contains 'video/' and trashed = false");
  const fields = encodeURIComponent('files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink,createdTime,size)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=40&orderBy=createdTime desc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lỗi tải tệp phương tiện Drive: ${errorText}`);
  }

  const data = await response.json();
  const files: DriveMediaFile[] = (data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    thumbnailLink: file.thumbnailLink?.replace(/=s\d+/, '=s800'),
    webContentLink: file.webContentLink,
    webViewLink: file.webViewLink,
    createdTime: file.createdTime,
    size: file.size ? `${(parseInt(file.size) / (1024 * 1024)).toFixed(1)} MB` : undefined,
    isImage: file.mimeType.startsWith('image/'),
    isVideo: file.mimeType.startsWith('video/'),
  }));

  return files;
}

