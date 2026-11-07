export type CaptionTone = 'romantic' | 'cute' | 'peaceful' | 'funny' | 'poem' | 'short';

export interface CaptionParams {
  personOne: string;
  personTwo: string;
  location?: string;
  tone: CaptionTone;
  keywords?: string;
  date?: string;
}

export interface CaptionSuggestion {
  text: string;
  badge: string; // e.g., 'Thơ tình', 'Story ngắn', 'Sâu lắng', 'Dễ thương', 'Dí dỏm', 'Gắn với ảnh'
  emojis: string;
}

export interface SmartCaptionResult {
  suggestions: CaptionSuggestion[];
  suggestedEmojis: string[];
}

// Bảng biểu tượng cảm xúc (Emoji) theo từng ngữ cảnh tình yêu và bối cảnh ảnh cụ thể
const EMOJI_TOPIC_MAP: Record<string, string[]> = {
  // Biển, đảo, du lịch mùa hè
  beach: ['🌊', '🏖️', '🌅', '🐚', '🐬', '🌴', '⛵', '🤍'],
  // Quán cà phê, trà chiều, bánh ngọt
  cafe: ['☕', '🍰', '🧋', '🥐', '🍂', '🪟', '🕯️', '✨'],
  // Đà Lạt, rừng thông, sương mù, se lạnh
  dalat: ['🌲', '⛰️', '🌫️', '🧣', '🍓', '🪵', '☕', '🏕️'],
  // Hà Nội, Hồ Tây, phố cổ, đạp xe
  hanoi: ['🦢', '🛵', '🌿', '🌇', '🌼', '🍂', '🤍', '🚲'],
  // Hoàng hôn, chiều tà, ráng chiều
  sunset: ['🌇', '🌅', '🧡', '✨', '⛅', '🌗', '🕊️', '🌾'],
  // Nấu ăn, góc bếp, bữa cơm nhà, nến
  cooking: ['🍳', '🍲', '🕯️', '🍷', '🍽️', '👩‍🍳', '🥢', '🥘'],
  // Mưa, gió lạnh, mùa đông, áo ấm
  rain: ['🌧️', '☔', '🧣', '🍵', '🧦', '❄️', '🌧️', '🫂'],
  // Hoa, cúc họa mi, hoa hồng, vườn hoa
  flowers: ['🌸', '💐', '🌷', '🌻', '🌼', '🌺', '🌿', '🌱'],
  // Kỷ niệm ngày yêu, sinh nhật, hẹn hò
  anniversary: ['🎂', '🎁', '🎉', '🎈', '🍾', '💌', '💖', '💍'],
  // Nắm tay, ôm, đi dạo, thân mật
  cuddle: ['🫂', '👫', '🤍', '✨', '👟', '🛵', '💕', '🥰'],
  // Mặc định lãng mạn & bình yên
  default: ['💖', '✨', '🤍', '🌸', '📸', '🥰', '🕊️', '🏡']
};

/**
 * Trích xuất danh sách Emoji phù hợp nhất với ngữ cảnh ảnh & địa điểm
 */
export function extractContextualEmojis(params: CaptionParams): string[] {
  const combined = `${params.location || ''} ${params.keywords || ''}`.toLowerCase();

  let matched: string[] = [];

  if (/biển|bãi|sóng|cát|vũng tàu|nha trang|quy nhơn|đà nẵng|phú quốc/.test(combined)) {
    matched = EMOJI_TOPIC_MAP.beach;
  } else if (/cà phê|cafe|coffee|trà|tiệm|quán|bánh|tart/.test(combined)) {
    matched = EMOJI_TOPIC_MAP.cafe;
  } else if (/đà lạt|thông|sương|đồi|mây|cao nguyên/.test(combined)) {
    matched = EMOJI_TOPIC_MAP.dalat;
  } else if (/hà nội|hồ tây|phố cổ|hoàn kiếm|ba đình|cầu long biên/.test(combined)) {
    matched = EMOJI_TOPIC_MAP.hanoi;
  } else if (/hoàng hôn|chiều|nắng chiều|ráng|mặt trời lặn/.test(combined)) {
    matched = EMOJI_TOPIC_MAP.sunset;
  } else if (/bếp|nấu|cơm|ăn tối|món|lẩu|nướng/.test(combined)) {
    matched = EMOJI_TOPIC_MAP.cooking;
  } else if (/mưa|lạnh|rét|gió|mùa đông|ấm/.test(combined)) {
    matched = EMOJI_TOPIC_MAP.rain;
  } else if (/hoa|cúc|hồng|vườn|sen|hướng dương/.test(combined)) {
    matched = EMOJI_TOPIC_MAP.flowers;
  } else if (/kỷ niệm|sinh nhật|năm|tháng|quà|bánh kem|nhẫn/.test(combined)) {
    matched = EMOJI_TOPIC_MAP.anniversary;
  } else {
    matched = EMOJI_TOPIC_MAP.default;
  }

  // Kết hợp một vài emoji cảm xúc đặc trưng
  const toneEmojis =
    params.tone === 'cute'
      ? ['🥰', '🌸', '✨', '🍬']
      : params.tone === 'funny'
      ? ['😜', '🦈', '🤣', '👀']
      : params.tone === 'peaceful'
      ? ['🍃', '☕', '🤍', '✨']
      : params.tone === 'poem'
      ? ['📜', '🪶', '🌸', '🕊️']
      : params.tone === 'short'
      ? ['✨', '🖤', '🤍', '📍']
      : ['💖', '🤍', '✨', '🫂'];

  const merged = Array.from(new Set([...matched.slice(0, 5), ...toneEmojis])).slice(0, 8);
  return merged;
}

/**
 * Động cơ sáng tác thông minh với kho dữ liệu đồ sộ, ngôn từ giàu chất thơ, không sáo rỗng
 */
export function generateSmartCaptions(params: CaptionParams): SmartCaptionResult {
  const p1 = params.personOne?.trim() || 'Anh';
  const p2 = params.personTwo?.trim() || 'Em';
  const loc = params.location?.trim();
  const kw = params.keywords?.trim();

  const locPhrase = loc ? `tại ${loc}` : 'ở một góc nhỏ bình yên';
  const locIntro = loc ? `Ghé lại ${loc}, ` : '';

  const suggestedEmojis = extractContextualEmojis(params);
  const mainEmoji = suggestedEmojis[0] || '✨';
  const loveEmoji = suggestedEmojis[1] || '🤍';

  // 1. KHO THƠ TÌNH NGẮN (POEM) - Vần điệu mộc mạc, tha thiết
  const poemPool: { text: string; emojis: string }[] = [
    {
      text: `Gió đưa cành trúc la đà,\nBao nhiêu năm tháng vẫn là thương ${p2}.`,
      emojis: '🍃🤍✨'
    },
    {
      text: `Nắng vàng trải nhẹ lối đi,\nCó ${p2} cạnh bước, chẳng chi bận lòng.`,
      emojis: '☀️👫🌸'
    },
    {
      text: `Thế gian vạn dặm rộng dài,\nChỉ mong nắm chặt tay ai trọn đời.`,
      emojis: '🤍🫂🕊️'
    },
    {
      text: `Trăm năm chọn một nụ cười,\nNgàn năm chỉ ước một người là ${p2}.`,
      emojis: '🌸💖✨'
    },
    {
      text: `Ngoài kia bão táp mưa sa,\nVề bên nhau ấm một nhà bình yên.`,
      emojis: '🏡🌧️🕯️'
    },
    {
      text: `Trời xanh, mây trắng, nắng hồng,\nHôm nay ${p1} đã phải lòng ${p2} chưa?`,
      emojis: '⛅🥰💖'
    },
    {
      text: `Hôm nay trời đổ cơn mưa,\nNhớ thương gom lại vừa bằng nụ cười ${p2}.`,
      emojis: '🌧️☕🤍'
    },
    {
      text: `Dẫu mai vật đổi sao dời,\nTay trong tay bước, nửa lời không buông.`,
      emojis: '🤝✨❤️'
    },
    {
      text: `Nhìn mây nhìn gió nhìn trời,\nNhìn đâu cũng thấy nụ cười của ${p2}.`,
      emojis: '🌤️🌸✨'
    }
  ];

  // 2. KHO LÃNG MẠN SÂU LẮNG (ROMANTIC) - Tự sự, chạm đến trái tim
  const romanticPool: { text: string; emojis: string }[] = [
    {
      text: `Giữa thành phố hối hả, điều an tâm nhất là khi quay đầu lại luôn thấy ánh mắt dịu dàng của ${p2}.`,
      emojis: '🌆🤍✨'
    },
    {
      text: `Có những ngày chẳng cần hẹn trước điều gì to tát, chỉ cần được cùng ${p2} ngồi cạnh nhau ${locPhrase}, nghe gió thổi và im lặng ngắm nhìn nhau.`,
      emojis: '🍃☕🤍'
    },
    {
      text: `Thanh xuân này rực rỡ nhất không phải vì đi được bao nhiêu nơi, mà là trong mỗi chuyến đi đều có bóng hình ${p2} đồng hành.`,
      emojis: '📸🛵🌸'
    },
    {
      text: `Người ta mong ước vạn điều lớn lao, còn ${p1} chỉ mong mỗi sớm mai thức dậy đều được thấy ${p2} an yên bên cạnh.`,
      emojis: '🌅☕✨'
    },
    {
      text: `Không phải gặp gỡ đúng lúc mới thương nhau, mà chính vì có ${p2}, mọi khoảnh khắc trôi qua đều hóa thành dịu dàng.`,
      emojis: '💖✨🕊️'
    },
    {
      text: `Mỗi bức hình chụp chung như một chiếc neo giữ lại những ngày hai đứa mình yêu nhau tha thiết và chân thành nhất.`,
      emojis: '🎞️🤍📸'
    },
    {
      text: `Cảm ơn ${p2} vì đã luôn lắng nghe những điều vụn vặt và cùng ${p1} sưởi ấm góc nhỏ bình yên này.`,
      emojis: '🫂🤍🏡'
    }
  ];

  // 3. KHO DỄ THƯƠNG NGỌT NGÀO (CUTE) - Nhí nhảnh, ngọt lịm
  const cutePool: { text: string; emojis: string }[] = [
    {
      text: `Dạo này năng lượng lúc nào cũng 100%, vì trong lòng có sẵn một cục cưng ${p2} siêu cấp đáng yêu!`,
      emojis: '🥰✨💖'
    },
    {
      text: `Menu hôm nay của ${p1}: Một ly nước ngọt, một ngày nắng đẹp và nụ cười ngọt xỉu của ${p2}.`,
      emojis: '🧋🍰🌸'
    },
    {
      text: `Chụp ảnh với ai cũng thấy bình thường, chụp chung với ${p2} tự dưng thấy hai đứa đẹp đôi lạ lùng!`,
      emojis: '📸👫✨'
    },
    {
      text: `Trời sinh ${p1} vốn ít cười, gặp trúng ${p2} là cười cả ngày không ngớt.`,
      emojis: '☀️🥰💕'
    },
    {
      text: `Bao nhiêu kẹo ngọt trên đời cũng không bằng một giây ${p2} nghiêng đầu tựa vào vai ${p1}.`,
      emojis: '🍬🌸🤍'
    },
    {
      text: `Nhỏ xíu như hạt đậu mà chiếm trọn vẹn cả trái tim người ta rồi đó nha ${p2}!`,
      emojis: '🍓🤏💖'
    }
  ];

  // 4. KHO NHẸ NHÀNG BÌNH YÊN (PEACEFUL) - Chữa lành, tĩnh lặng
  const peacefulPool: { text: string; emojis: string }[] = [
    {
      text: `Bình yên là một buổi chiều gió nhẹ, tách trà thơm và được nghe ${p2} kể những câu chuyện không đầu không cuối.`,
      emojis: '🍵🪟🍃'
    },
    {
      text: `Gác lại muộn phiền ngoài ô cửa, chỉ giữ lại ấm áp và sự an lòng khi có ${p2} bên cạnh.`,
      emojis: '🏡🕯️🤍'
    },
    {
      text: `Hạnh phúc đôi khi giản đơn đến lạ: cùng nhau đi dạo, nấu một bữa cơm nóng và nhìn nhau mỉm cười.`,
      emojis: '🍲🍳👫'
    },
    {
      text: `Mong hai đứa mình cứ nhẹ nhàng nắm tay nhau đi qua từng mùa nắng mưa của cuộc đời.`,
      emojis: '🌦️🤍✨'
    },
    {
      text: `Có những khoảnh khắc tĩnh lặng chỉ nghe tiếng thở của phố, nhưng lòng lại thấy đủ đầy vì có ${p2}.`,
      emojis: '🌙🍃🤍'
    }
  ];

  // 5. KHO HÀI HƯỚC DÍ DỎM (FUNNY) - Trêu đùa ngọt ngào
  const funnyPool: { text: string; emojis: string }[] = [
    {
      text: `Ra đường là cá mập hung dữ, về bên ${p2} tự động hóa thành cá con ngoan ngoãn liền!`,
      emojis: '🦈❤️😜'
    },
    {
      text: `Chụp 100 tấm ảnh thì 99 tấm chụp ${p2} xinh lung linh, còn 1 tấm duy nhất của ${p1} thì... bị mờ nét!`,
      emojis: '📸😂🤦‍♂️'
    },
    {
      text: `Ưu điểm của ${p1}: Rất yêu ${p2}. Nhược điểm: Quá yêu nên suốt ngày bị 'nóc nhà' bắt nạt!`,
      emojis: '🏠😜💕'
    },
    {
      text: `Ví tiền có thể hao hụt vì dắt ${p2} đi ăn, nhưng tình cảm thì lúc nào cũng lãi to.`,
      emojis: '🍜💸🥰'
    },
    {
      text: `Cãi nhau thì ${p1} luôn là người thắng... trong suy nghĩ, còn thực tế thì xin lỗi trước cho ấm nhà!`,
      emojis: '🤐🫡❤️'
    }
  ];

  // 6. KHO STORY NGẮN GỌN (SHORT) - Bắt trend mạng xã hội
  const shortPool: { text: string; emojis: string }[] = [
    { text: `Bình yên cạnh ${p2}.`, emojis: '✨🤍📍' },
    { text: `Ngày nắng đẹp cùng người thương.`, emojis: '☀️🌸📸' },
    { text: `My favorite person in the whole wide world.`, emojis: '🤍✨' },
    { text: `Ở bên ${p2}, mọi thứ đều hóa dịu dàng.`, emojis: '🍃🤍' },
    { text: `Gom một chút nắng vào góc nhỏ kỷ niệm.`, emojis: '🌤️💌' },
    { text: `Hạnh phúc giản dị của hai đứa mình.`, emojis: '👫🏡' },
    { text: `Chỉ cần là ${p2}, nơi đâu cũng đẹp.`, emojis: '🌸💕' }
  ];

  // 7. KHO CÂU ĐẶC THÙ THEO ĐỊA ĐIỂM & TỪ KHÓA
  const contextPool: { text: string; emojis: string; badge: string }[] = [];
  if (loc) {
    contextPool.push(
      {
        text: `${locIntro}nắng chiếu nghiêng qua hàng cây, chỉ ước thời gian ngừng lại ở giây phút này bên ${p2}.`,
        emojis: `${mainEmoji}🤍✨`,
        badge: `Tại ${loc}`
      },
      {
        text: `Đánh dấu thêm một kỷ niệm ngọt ngào tại ${loc} cùng người thương yêu nhất đời.`,
        emojis: `📍📸${loveEmoji}`,
        badge: `Kỷ niệm ${loc}`
      },
      {
        text: `${loc} hôm nay đẹp lạ kỳ, có lẽ vì trong mắt ${p1} đang có trọn vẹn nụ cười của ${p2}.`,
        emojis: `${mainEmoji}🌸🥰`,
        badge: `Bối cảnh ${loc}`
      }
    );
  }

  if (kw) {
    contextPool.push(
      {
        text: `Một ngày thật đặc biệt với ${kw}, nhưng điều tuyệt vời nhất vẫn là được cùng ${p2} trải qua.`,
        emojis: `✨🤍🎁`,
        badge: `Kỷ niệm ${kw}`
      },
      {
        text: `Gom chút dư vị của ${kw} và ánh mắt em vào góc nhỏ yêu thương của hai đứa mình.`,
        emojis: `💌🌸✨`,
        badge: `Chi tiết ${kw}`
      }
    );
  }

  // Thuật toán chọn lọc và xáo trộn ngẫu nhiên
  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  let primaryList = romanticPool;
  let primaryBadge = 'Lãng mạn';

  if (params.tone === 'cute') {
    primaryList = cutePool;
    primaryBadge = 'Ngọt ngào';
  } else if (params.tone === 'peaceful') {
    primaryList = peacefulPool;
    primaryBadge = 'Bình yên';
  } else if (params.tone === 'funny') {
    primaryList = funnyPool;
    primaryBadge = 'Dí dỏm';
  } else if (params.tone === 'poem') {
    primaryList = poemPool;
    primaryBadge = 'Thơ tình';
  } else if (params.tone === 'short') {
    primaryList = shortPool;
    primaryBadge = 'Story ngắn';
  }

  const shuffledPrimary = shuffle(primaryList);
  const shuffledPoems = shuffle(poemPool);
  const shuffledRomantic = shuffle(romanticPool);
  const shuffledCute = shuffle(cutePool);
  const shuffledShorts = shuffle(shortPool);
  const shuffledContext = shuffle(contextPool);

  const selectedItems: CaptionSuggestion[] = [];

  // 1. Câu theo đúng tông cảm xúc người dùng chọn
  if (shuffledPrimary.length > 0) {
    const item = shuffledPrimary[0];
    selectedItems.push({
      text: `${item.text} ${item.emojis}`,
      badge: primaryBadge,
      emojis: item.emojis
    });
  }

  // 2. Câu gắn với địa điểm/từ khóa nếu có, hoặc câu sâu lắng thứ 2
  if (shuffledContext.length > 0) {
    const item = shuffledContext[0];
    selectedItems.push({
      text: `${item.text} ${item.emojis}`,
      badge: item.badge,
      emojis: item.emojis
    });
  } else if (shuffledPrimary.length > 1) {
    const item = shuffledPrimary[1];
    selectedItems.push({
      text: `${item.text} ${item.emojis}`,
      badge: primaryBadge,
      emojis: item.emojis
    });
  }

  // 3. Một câu thơ ngắn gieo vần êm ái
  if (params.tone !== 'poem' && shuffledPoems.length > 0) {
    const item = shuffledPoems[0];
    selectedItems.push({
      text: `${item.text} ${item.emojis}`,
      badge: 'Thơ tình êm ái',
      emojis: item.emojis
    });
  } else if (shuffledRomantic.length > 0) {
    const item = shuffledRomantic[0];
    selectedItems.push({
      text: `${item.text} ${item.emojis}`,
      badge: 'Sâu lắng',
      emojis: item.emojis
    });
  }

  // 4. Một câu ngắn gọn đăng Story
  if (params.tone !== 'short' && shuffledShorts.length > 0) {
    const item = shuffledShorts[0];
    selectedItems.push({
      text: `${item.text} ${item.emojis}`,
      badge: 'Story ngắn 1 câu',
      emojis: item.emojis
    });
  } else if (shuffledCute.length > 0) {
    const item = shuffledCute[0];
    selectedItems.push({
      text: `${item.text} ${item.emojis}`,
      badge: 'Đáng yêu',
      emojis: item.emojis
    });
  }

  // 5. Một câu dễ thương hoặc dí dỏm tạo điểm nhấn
  if (params.tone !== 'funny' && shuffledCute.length > 1) {
    const item = shuffledCute[1];
    selectedItems.push({
      text: `${item.text} ${item.emojis}`,
      badge: 'Ngọt lịm',
      emojis: item.emojis
    });
  } else if (shuffledPrimary.length > 2) {
    const item = shuffledPrimary[2];
    selectedItems.push({
      text: `${item.text} ${item.emojis}`,
      badge: primaryBadge,
      emojis: item.emojis
    });
  }

  return {
    suggestions: selectedItems.slice(0, 5),
    suggestedEmojis
  };
}
