export interface Memory {
  id: string;
  imageUrl: string;
  images?: string[]; // Mảng nhiều ảnh nếu kỷ niệm là album nhiều ảnh
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

export type CaptionFont = 'caveat' | 'dancing' | 'patrick' | 'playfair' | 'vietnam' | 'sans';

export interface FontOption {
  id: CaptionFont;
  name: string;
  category: string;
  cssClass: string;
  previewText: string;
  description: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'caveat',
    name: 'Viết tay tự nhiên (Caveat)',
    category: 'Chữ viết tay',
    cssClass: 'font-handwriting',
    previewText: 'Anh yêu Em qua từng khoảnh khắc bình yên 💕',
    description: 'Nét bút bi phóng khoáng, dễ thương và mộc mạc'
  },
  {
    id: 'dancing',
    name: 'Thư pháp mềm mại (Dancing Script)',
    category: 'Lãng mạn',
    cssClass: 'font-dancing',
    previewText: 'Tình yêu dịu dàng như một khúc tình ca ✨',
    description: 'Nét lượn sóng bay bổng, lãng mạn và ngọt ngào'
  },
  {
    id: 'patrick',
    name: 'Bút dạ học trò (Patrick Hand)',
    category: 'Dễ thương',
    cssClass: 'font-patrick',
    previewText: 'Cùng nhau đi qua bốn mùa thương nhớ 🌸',
    description: 'Nét tròn đầy, trẻ trung và ngập tràn năng lượng'
  },
  {
    id: 'playfair',
    name: 'Thơ mộng cổ điển (Playfair Display)',
    category: 'Có chân sang trọng',
    cssClass: 'font-serif-romantic',
    previewText: 'Mỗi khoảnh khắc bên em đều là vĩnh cửu 🕊️',
    description: 'Nét chân thanh thoát, quý phái như trang sách tình thơ'
  },
  {
    id: 'vietnam',
    name: 'Việt Pro thanh lịch (Be Vietnam Pro)',
    category: 'Hiện đại tinh tế',
    cssClass: 'font-vietnam',
    previewText: 'Bình yên là khi có anh và em bên cạnh 🍃',
    description: 'Chuẩn tiếng Việt, nét chữ sắc nét, tinh tế và rất dễ đọc'
  },
  {
    id: 'sans',
    name: 'Tối giản hiện đại (Plus Jakarta Sans)',
    category: 'Không chân tối giản',
    cssClass: 'font-sans-modern',
    previewText: 'Góc Nhỏ Bình Yên • Dành riêng cho hai bạn 🤍',
    description: 'Phong cách tối giản, rõ ràng và thanh thoát'
  }
];

export const DEFAULT_FONT: CaptionFont = 'caveat';

export interface DiaryEntry {
  id: string;
  title: string;
  content: string; // Nội dung bài viết nhật ký dài (nhiều đoạn văn)
  date: string; // YYYY-MM-DD
  author: string; // "Đức Duy" | "Thanh Tâm" | "Cả hai đứa"
  mood: string; // Biểu tượng cảm xúc & tâm trạng
  weather: string; // Thời tiết lúc viết
  tag?: string; // "Thư tình" | "Nhật ký" | "Chuyến đi" | "Lời hứa" | "Kỷ niệm"
  sticker?: string; // Nhãn dán trang trí: "🌸" | "💌" | "✨" | "💖" | "☕" | "🍃"
  imageUrl?: string; // Ảnh kẹp vào trang sổ tay (tùy chọn)
  createdAt: number;
  updatedAt?: number;
}

export const INITIAL_DIARY_ENTRIES: DiaryEntry[] = [
  {
    id: "diary-1",
    title: "Trang đầu tiên của cuốn sổ chúng mình",
    author: "Cả hai đứa",
    date: "2025-05-19",
    mood: "🥰 Ngập tràn hạnh phúc",
    weather: "☀️ Nắng ấm dịu dàng",
    tag: "Lời mở đầu",
    sticker: "💌",
    imageUrl: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=800&q=80",
    content: `Chào mừng em đến với góc nhỏ này. Cuốn sổ tay này được mở ra không chỉ để đính những tấm ảnh rực rỡ, mà là nơi lưu giữ những suy nghĩ dài hơn, những lời tâm sự vụng về mà đôi khi ngồi trước mặt nhau anh lại ngại ngùng chẳng dám nói hết.

Dù sau này năm tháng có trôi nhanh đến đâu, hy vọng mỗi khi lật từng trang giấy này, hai đứa vẫn sẽ mỉm cười nhớ về những ngày đầu dịu dàng như hôm nay. Mong rằng tình yêu của chúng mình sẽ luôn như một tách cacao ấm giữa buổi sáng se lạnh: ngọt ngào, êm dịu và tràn đầy bình yên.`,
    createdAt: 1747612800000
  },
  {
    id: "diary-2",
    title: "Bức thư gửi em vào một chiều mưa Hà Nội",
    author: "Đức Duy",
    date: "2025-07-14",
    mood: "☕ Bình yên dịu lắng",
    weather: "🌧️ Mưa rào lách tách",
    tag: "Thư tình",
    sticker: "☕",
    imageUrl: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=800&q=80",
    content: `Chiều nay trời đổ cơn mưa rào bất chợt, ngồi bên góc quán quen nhìn dòng người vội vã che ô, anh lại nhớ đến em da diết.

Nhớ những lần hai đứa che chung chiếc ô nhỏ xíu, vai áo anh ướt sũng nhưng nhìn thấy em cười tít mắt thì trong lòng lại thấy ấm áp lạ kỳ. Em hỏi anh: 'Sao anh cứ đi lệch sang phía em thế?'. Ngốc ạ, vì chỉ cần em không bị ướt, thì với anh trời mưa cũng đẹp như một khúc tình ca.

Cảm ơn em vì đã đến, mang theo sự ấm áp làm dịu đi những mệt mỏi trong anh. Dù ngoài kia có giông bão thế nào, chỉ cần quay về bên em là bình yên lại trở về.`,
    createdAt: 1752451200000
  },
  {
    id: "diary-3",
    title: "Những điều nhỏ xíu làm em yêu anh",
    author: "Thanh Tâm",
    date: "2025-09-20",
    mood: "💖 Ngọt ngào yêu đời",
    weather: "⛅ Trời thu trong veo",
    tag: "Nhật ký",
    sticker: "🌸",
    imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80",
    content: `Đôi khi tình yêu chẳng cần những điều to tát vĩ đại, mà nằm ở cốc nước ấm anh mang sang mỗi sáng, ở cái cách anh luôn đi về phía làn xe ngoài đường để bảo vệ em, hay lúc anh kiên nhẫn bóc từng con tôm để vào bát em.

Em thích ngắm anh lúc tập trung làm việc, rồi bất chợt quay sang mỉm cười xoa đầu em và hỏi: 'Bé đói bụng chưa?'. Những khoảnh khắc giản dị ấy khiến em tin rằng mình đã tìm đúng người để tựa vào cả cuộc đời này.

Cảm ơn anh vì đã luôn dịu dàng, kiên nhẫn và bao dung với một cô gái đôi lúc ẩm ương như em nhé!`,
    createdAt: 1758326400000
  },
  {
    id: "diary-4",
    title: "Lời hứa cho những chuyến đi phía trước",
    author: "Đức Duy",
    date: "2025-11-10",
    mood: "🍃 Háo hức & Hy vọng",
    weather: "🍂 Gió chớm đông",
    tag: "Lời hứa",
    sticker: "✨",
    imageUrl: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=800&q=80",
    content: `Chúng mình đã cùng nhau đi qua những con dốc thông mù sương ở Đà Lạt, ngắm hoàng hôn đỏ ửng buông xuống mặt Hồ Tây và lắng nghe tiếng sóng vỗ rì rào ở bờ biển Quy Nhơn.

Danh sách những nơi muốn đi cùng em vẫn còn rất dài: ngắm tuyết rơi đầu mùa ở vùng núi cao, đi dạo dưới tán hoa anh đào nở rộ, và cùng nhau già đi ở một ngôi nhà nhỏ có mảnh vườn đầy hoa và nắng sớm.

Cứ thong thả nắm tay anh bước tiếp nhé, vì với anh, đích đến đẹp nhất luôn luôn là có em bên cạnh.`,
    createdAt: 1762732800000
  }
];

export const DEFAULT_COUPLE_INFO: CoupleInfo = {
  personOne: "Đức Duy",
  personTwo: "Thanh Tâm",
  startDate: "2025-05-19",
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

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  mood: string;
  url: string;
  thumbnail?: string;
  duration?: number;
  isZing?: boolean;
  isYouTube?: boolean;
  youtubeId?: string;
}

export const DEFAULT_PLAYLIST: MusicTrack[] = [
  {
    id: "track-1",
    title: "Giai Điệu Acoustic Tình Yêu",
    artist: "Acoustic Romantic",
    mood: "Lãng mạn",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  {
    id: "track-2",
    title: "Chiều Mưa & Lofi Nhẹ Nhàng",
    artist: "Lofi Peace",
    mood: "Bình yên",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3"
  },
  {
    id: "track-3",
    title: "Tiếng Mưa Rơi Êm Đềm",
    artist: "Thiên Nhiên",
    mood: "Thư giãn",
    url: "https://actions.google.com/sounds/v1/weather/rain_heavy.ogg"
  },
  {
    id: "track-4",
    title: "Tiếng Sóng Biển Hoàng Hôn",
    artist: "Biển Chiều",
    mood: "Bình yên",
    url: "https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg"
  },
  {
    id: "track-5",
    title: "Tiếng Chim Hót Rừng Thông",
    artist: "Đà Lạt Sáng Sớm",
    mood: "Tươi mới",
    url: "https://actions.google.com/sounds/v1/ambiences/forest_birds.ogg"
  },
  {
    id: "track-6",
    title: "Khu Vườn Bình Yên",
    artist: "Giai Điệu Gió",
    mood: "Thư thái",
    url: "https://actions.google.com/sounds/v1/ambiences/peaceful_outdoor.ogg"
  }
];

