export interface Memory {
  id: string;
  imageUrl: string;
  date: string; // YYYY-MM-DD
  location: string;
  caption: string;
  tag: string;
  likes: number;
  isLiked?: boolean;
  createdAt: number;
}

export interface CoupleInfo {
  personOne: string;
  personTwo: string;
  startDate: string; // YYYY-MM-DD
  anniversaryNote: string;
}

export type ViewMode = 'masonry' | 'timeline';

export const DEFAULT_COUPLE_INFO: CoupleInfo = {
  personOne: "Anh",
  personTwo: "Em",
  startDate: "2023-02-14",
  anniversaryNote: "Từng ngày bên nhau đều là ngày bình yên và dịu dàng nhất."
};

export const POPULAR_TAGS = [
  "Tất cả",
  "Hẹn hò",
  "Du lịch",
  "Kỷ niệm",
  "Khoảnh khắc",
  "Quán quen",
  "Bình yên"
];

export const INITIAL_MEMORIES: Memory[] = [
  {
    id: "mem-1",
    imageUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=85",
    date: "2023-10-15",
    location: "Tiệm Cà Phê Trong Rừng, Đà Lạt",
    caption: "Buổi sáng se lạnh bên ly cacao nóng, ngồi nghe tiếng thông reo và ngắm nụ cười ấm áp của em. Cảm giác bình yên đến lạ.",
    tag: "Du lịch",
    likes: 18,
    isLiked: false,
    createdAt: 1697356800000
  },
  {
    id: "mem-2",
    imageUrl: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=85",
    date: "2023-12-24",
    location: "Bờ Hồ Tây, Hà Nội",
    caption: "Hoàng hôn buông màu hồng cam rực rỡ cả góc trời, hai đứa đạp xe quanh hồ rồi ghé ăn kem. Khoảnh khắc nhỏ bé mà thấy lòng ấm áp vô ngần.",
    tag: "Hẹn hò",
    likes: 24,
    isLiked: false,
    createdAt: 1703404800000
  },
  {
    id: "mem-3",
    imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85",
    date: "2024-02-14",
    location: "Góc Bếp Nhỏ Của Hai Đứa",
    caption: "Cùng nhau nấu bữa tối ấm cúng, bật bản nhạc jazz nhẹ nhàng và thổi nến kỷ niệm tròn 1 năm. Cảm ơn vì đã luôn ở bên và kiên nhẫn cùng anh.",
    tag: "Kỷ niệm",
    likes: 35,
    isLiked: false,
    createdAt: 1707897600000
  },
  {
    id: "mem-4",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
    date: "2024-06-20",
    location: "Bãi Biển Quy Nhơn",
    caption: "Đi dạo trên bãi cát mịn lúc sáng sớm, nhặt những chiếc vỏ ốc nhỏ xinh. Nụ cười em rạng rỡ như tia nắng sớm sưởi ấm cả một mùa hè.",
    tag: "Du lịch",
    likes: 29,
    isLiked: false,
    createdAt: 1718870400000
  }
];
