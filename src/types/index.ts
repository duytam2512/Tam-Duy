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

export interface BackgroundSettings {
  type: 'gradient' | 'image';
  imageUrl?: string;
  opacity: number; // 0.1 to 0.9
  blur: number; // 0 to 12px
}

export type ViewMode = 'masonry' | 'timeline';

export const DEFAULT_COUPLE_INFO: CoupleInfo = {
  personOne: "Anh",
  personTwo: "Em",
  startDate: "2023-02-14",
  anniversaryNote: "Từng ngày bên nhau đều là ngày bình yên và dịu dàng nhất."
};

export const DEFAULT_BG_SETTINGS: BackgroundSettings = {
  type: 'gradient',
  imageUrl: '',
  opacity: 0.15,
  blur: 4
};

export const POPULAR_TAGS = [
  "Tất cả",
  "Hẹn hò",
  "Du lịch",
  "Kỷ niệm",
  "Khoảnh khắc",
  "Quán quen",
  "Bình yên",
  "Món ngon"
];

// 12 Kỷ niệm mẫu ban đầu phong phú, ấm áp
export const INITIAL_MEMORIES: Memory[] = [
  {
    id: "mem-1",
    imageUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=85",
    date: "2023-10-15",
    location: "Tiệm Cà Phê Trong Rừng, Đà Lạt",
    caption: "Buổi sáng se lạnh bên ly cacao nóng, ngồi nghe tiếng thông reo và ngắm nụ cười ấm áp của em. Cảm giác bình yên đến lạ.",
    tag: "Du lịch",
    likes: 38,
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
    likes: 52,
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
    likes: 64,
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
    likes: 45,
    isLiked: false,
    createdAt: 1718870400000
  },
  {
    id: "mem-5",
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=85",
    date: "2024-07-12",
    location: "Góc Ban Công Nhỏ",
    caption: "Sáng chủ nhật tưới hoa, pha một ấm trà hoa cúc và cùng em đọc quyển sách yêu thích. Không cần đi đâu xa, ở nhà thôi cũng thấy đủ đầy.",
    tag: "Bình yên",
    likes: 31,
    isLiked: false,
    createdAt: 1720771200000
  },
  {
    id: "mem-6",
    imageUrl: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=85",
    date: "2024-08-30",
    location: "Phố Cổ Hội An",
    caption: "Hội An về đêm lung linh ánh đèn hoa đăng. Thả chiếc đèn ước nguyện trôi theo dòng sông Hoài, anh chỉ ước hai đứa mãi nắm tay nhau như thế.",
    tag: "Du lịch",
    likes: 59,
    isLiked: false,
    createdAt: 1725004800000
  },
  {
    id: "mem-7",
    imageUrl: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=85",
    date: "2024-09-18",
    location: "Vườn Hoa Cúc Họa Mi",
    caption: "Gió heo may chớm lạnh mang theo mùa cúc họa mi trắng muốt. Nhìn em cài cành hoa nhỏ lên tóc, tim anh lại lỡ thêm một nhịp.",
    tag: "Hẹn hò",
    likes: 47,
    isLiked: false,
    createdAt: 1726646400000
  },
  {
    id: "mem-8",
    imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85",
    date: "2024-11-05",
    location: "Tiệm Trà Chiều Góc Phố",
    caption: "Hai ly trà sữa nóng và một chiếc bánh tart phô mai béo ngậy. Ngồi nghe em kể chuyện linh tinh cả buổi chiều mà chẳng hề thấy chán.",
    tag: "Quán quen",
    likes: 36,
    isLiked: false,
    createdAt: 1730793600000
  },
  {
    id: "mem-9",
    imageUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1200&q=85",
    date: "2024-12-15",
    location: "Hiệu Sách Cũ Bình Yên",
    caption: "Mùi giấy cũ phảng phất cùng tiếng mưa lách tách ngoài mái hiên. Em mải mê đọc thơ, còn anh mải ngắm nhìn em.",
    tag: "Khoảnh khắc",
    likes: 29,
    isLiked: false,
    createdAt: 1734249600000
  },
  {
    id: "mem-10",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
    date: "2025-01-01",
    location: "Đỉnh Núi Đón Bình Minh",
    caption: "Chào đón ngày đầu tiên của năm mới trên đỉnh đồi lộng gió, ngắm mặt trời nhô lên sưởi ấm thế gian. Hy vọng một năm mới tràn ngập an lành bên em.",
    tag: "Kỷ niệm",
    likes: 68,
    isLiked: false,
    createdAt: 1735718400000
  },
  {
    id: "mem-11",
    imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1200&q=85",
    date: "2025-02-14",
    location: "Cắm Trại Đêm Ngắm Sao",
    caption: "Dựng lều bên bờ suối, đốt một đống lửa nhỏ và cùng ngửa cổ ngắm bầu trời đầy sao. Thế giới bỗng chốc thu bé lại vừa bằng hai đứa mình.",
    tag: "Kỷ niệm",
    likes: 72,
    isLiked: false,
    createdAt: 1739520000000
  },
  {
    id: "mem-12",
    imageUrl: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=1200&q=85",
    date: "2025-03-22",
    location: "Bữa Cơm Gia Đình Ấm Cúng",
    caption: "Hôm nay em trổ tài nấu canh chua cá lóc và thịt kho tiêu. Mâm cơm giản dị mà đậm đà yêu thương, ăn miếng nào cũng thấy ngập tràn hạnh phúc.",
    tag: "Món ngon",
    likes: 54,
    isLiked: false,
    createdAt: 1742630400000
  }
];

// Kho ảnh mẫu phong phú theo nhiều chủ đề để người dùng chọn nhanh khi đăng
export interface SampleCategory {
  category: string;
  items: {
    title: string;
    url: string;
    suggestedLocation: string;
  }[];
}

export const SAMPLE_PHOTO_LIBRARY: SampleCategory[] = [
  {
    category: "Cà phê & Quán quen",
    items: [
      {
        title: "Tách cà phê ấm",
        url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Tiệm Cà Phê Mộc, Đà Lạt"
      },
      {
        title: "Trà chiều & Bánh ngọt",
        url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Quán Trà Nhỏ Phố Cổ"
      },
      {
        title: "Góc bàn kính quán quen",
        url: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Cà Phê Sáng Cuối Tuần"
      },
      {
        title: "Cốc socola nóng",
        url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Góc Phố Mùa Đông"
      }
    ]
  },
  {
    category: "Hoàng hôn & Biển",
    items: [
      {
        title: "Hoàng hôn hồng đào",
        url: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Bờ Hồ Tây lộng gió"
      },
      {
        title: "Sóng biển vỗ về",
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Biển Quy Nhơn đầy nắng"
      },
      {
        title: "Ánh nắng cuối ngày",
        url: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Bến Tàu Hoàng Hôn"
      },
      {
        title: "Dấu chân trên cát",
        url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Bãi Cát Chiều Êm"
      }
    ]
  },
  {
    category: "Đi trốn & Thiên nhiên",
    items: [
      {
        title: "Rừng thông Đà Lạt",
        url: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Rừng Thông Sương Khói"
      },
      {
        title: "Đồi núi mây ngàn",
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Đỉnh Núi Sáng Sớm"
      },
      {
        title: "Cánh đồng hoa dại",
        url: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Đồi Hoa Nắng Vàng"
      },
      {
        title: "Đêm ngắm dải ngân hà",
        url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Khu Cắm Trại Bên Suối"
      }
    ]
  },
  {
    category: "Bình yên đời thường",
    items: [
      {
        title: "Căn bếp ấm áp",
        url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Bếp Nhỏ Của Hai Đứa"
      },
      {
        title: "Đọc sách bên cửa sổ",
        url: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Góc Ban Công Chiều Mưa"
      },
      {
        title: "Mâm cơm gia đình",
        url: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Bàn Ăn Ấm Áp"
      },
      {
        title: "Bó hoa tươi dịu dàng",
        url: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=1000&q=80",
        suggestedLocation: "Món Quà Bất Ngờ"
      }
    ]
  }
];

// Các mẫu hình nền web có sẵn
export const PRESET_BACKGROUNDS = [
  {
    id: "default-gradient",
    name: "Pastel Kem Sữa Cổ Điển",
    type: "gradient" as const,
    url: "",
    preview: "linear-gradient(135deg, #FFFDF9 0%, #FAF6F0 50%, #F5EFE6 100%)"
  },
  {
    id: "pine-forest",
    name: "Đồi Thông Sương Mờ",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80",
    preview: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=300&q=70"
  },
  {
    id: "sunset-cozy",
    name: "Hoàng Hôn Êm Đềm",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1920&q=80",
    preview: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=300&q=70"
  },
  {
    id: "quiet-sea",
    name: "Biển Chiều Bình Yên",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
    preview: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=70"
  },
  {
    id: "blooming-flowers",
    name: "Vườn Hoa Nắng Ấm",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1920&q=80",
    preview: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=300&q=70"
  },
  {
    id: "starry-night",
    name: "Bầu Trời Sao Lấp Lánh",
    type: "image" as const,
    url: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80",
    preview: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=300&q=70"
  }
];
