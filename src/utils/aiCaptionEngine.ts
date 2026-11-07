export type CaptionTone = 'romantic' | 'cute' | 'peaceful' | 'funny' | 'poem' | 'short';

interface CaptionParams {
  personOne: string;
  personTwo: string;
  location?: string;
  tone: CaptionTone;
  keywords?: string;
}

export interface CaptionSuggestion {
  text: string;
  badge: string; // e.g., 'Thơ tình', 'Story ngắn', 'Sâu lắng', 'Dễ thương', 'Dí dỏm'
}

// Lưu các câu đã hiển thị gần nhất trong phiên để chống lặp
const recentUsedHashes = new Set<string>();

/**
 * Kho dữ liệu phong phú, đậm chất thơ, đa dạng phong cách cho cặp đôi
 */
export function generateSmartCaptions(params: CaptionParams): CaptionSuggestion[] {
  const p1 = params.personOne?.trim() || 'Anh';
  const p2 = params.personTwo?.trim() || 'Em';
  const loc = params.location?.trim();
  const kw = params.keywords?.trim();

  // Xác định địa điểm tự nhiên
  const locPhrase = loc ? `tại ${loc}` : 'ở một góc nhỏ quen thuộc';
  const locIntro = loc ? `Đứng ở ${loc}, ` : '';

  // 1. KHO THƠ TÌNH (POEM)
  const poemPool: string[] = [
    `Gió đưa cành trúc la đà\nBao nhiêu năm tháng vẫn là thương ${p2}.`,
    `Nắng vàng trải nhẹ lối đi\nCó ${p2} bên cạnh, chẳng chi bận lòng.`,
    `Thế gian vạn dặm rộng dài\nChỉ mong nắm chặt tay ai trọn đời.`,
    `Bình yên chẳng ở đâu xa\nLà khi ${p1} thấy ${p2} cười thật tươi.`,
    `Trăm năm chọn một nụ cười\nNgàn năm chỉ ước một người là ${p2}.`,
    `Ngoài kia bão táp mưa sa\nVề bên nhau ấm một nhà bình yên.`,
    `Trời xanh, mây trắng, nắng hồng\nHôm nay ${p1} đã phải lòng ${p2} chưa?`,
    `Hôm nay trời đổ cơn mưa\nNhớ thương gom lại vừa bằng nụ cười ${p2}.`,
    `Có những ngày lòng chùng lại\nChỉ cần nghe giọng ${p2} là thấy an yên.`,
    `Cây xanh cần có ánh trời\nCòn ${p1} chỉ muốn trọn đời có ${p2}.`,
    `Dẫu mai vật đổi sao dời\nTay trong tay bước, nửa lời không buông.`
  ];

  // 2. KHO LÃNG MẠN SÂU LẮNG (ROMANTIC)
  const romanticPool: string[] = [
    `Cảm ơn cuộc đời vì giữa tám tỷ người ngoài kia, ${p2} đã dịu dàng dừng chân bên ${p1}.`,
    `Có những ngày chẳng cần làm gì to tát, chỉ cần được cùng ${p2} ngồi cạnh nhau ${locPhrase}, ngắm hoàng hôn buông là thấy trọn vẹn cả một đời.`,
    `Người ta mơ ước nhà cao cửa rộng, còn ${p1} chỉ ước mỗi sớm mai thức dậy đều nhìn thấy ánh mắt dịu dàng của ${p2}.`,
    `Thế giới của người lớn đôi khi mệt mỏi quá, nhưng cứ hễ về bên ${p2}, ${p1} lại được làm chính mình – bình yên và an lòng nhất.`,
    `Không phải vì gặp gỡ đúng thời điểm mới yêu nhau, mà vì có ${p2}, mọi thời điểm đều hóa thành dịu dàng.`,
    `Khoảnh khắc đẹp nhất không phải là phong cảnh rực rỡ đến nhường nào, mà là trong khung hình ấy luôn có hình bóng ${p2}.`,
    `Mỗi bức ảnh chụp chung là một trang nhật ký, lưu giữ lại thanh xuân đẹp đẽ nhất mà ${p1} có được cùng ${p2}.`,
    `Dù sau này tóc có điểm bạc, mắt có mờ đi, ${p1} vẫn muốn nắm chặt tay ${p2} đi qua từng con phố quen.`,
    `Cảm ơn ${p2} vì đã luôn kiên nhẫn, dịu dàng và cùng ${p1} vun đắp cho góc nhỏ bình yên này mỗi ngày.`
  ];

  // 3. KHO DỄ THƯƠNG NGỌT NGÀO (CUTE)
  const cutePool: string[] = [
    `Dạo này chẳng thấy mệt mỏi gì cả, vì trong lòng lúc nào cũng có sẵn một em ${p2} siêu cấp đáng yêu! 🥰`,
    `Menu hôm nay có gì? Có bánh ngọt, trà sữa và nụ cười ngọt lịm của ${p2}! ✨`,
    `Người ta bảo nghiện trà sữa khó bỏ, chứ ${p1} thấy nghiện ${p2} còn khó bỏ hơn gấp vạn lần.`,
    `Chụp ảnh với ai cũng thấy bình thường, chụp với ${p2} tự dưng thấy mình đẹp đôi lạ lùng. 🌸`,
    `Mọi người hỏi ${p1} thích ăn gì nhất? Thích ăn mừng vì có ${p2} trong đời!`,
    `Trời hôm nay nhiều mây xám, nhưng nhìn sang bên cạnh thấy ${p2} là nắng bừng cả tim. ☀️`,
    `Bao nhiêu kẹo ngọt trên đời cũng chẳng bằng một giây ${p2} tựa đầu vào vai ${p1}.`,
    `Đi đâu không quan trọng, quan trọng là túi áo ấm của ${p1} luôn dành riêng cho tay ${p2} nhé! 💕`,
    `Em ${p2} nhỏ xíu như hạt đậu thế này thôi mà chiếm trọn vẹn cả trái tim ${p1} rồi.`
  ];

  // 4. KHO NHẸ NHÀNG BÌNH YÊN (PEACEFUL)
  const peacefulPool: string[] = [
    `Bình yên là một buổi chiều gió nhẹ, một tách trà thơm và được nghe ${p2} kể những câu chuyện linh tinh không đầu không cuối.`,
    `Góc nhỏ bình yên nơi ${p1} và ${p2} cùng nhau gác lại muộn phiền ngoài ngưỡng cửa, chỉ giữ lại ấm áp và chở che.`,
    `Hạnh phúc đôi khi giản đơn lắm: là cùng nhau đi chợ, nấu một bữa cơm nóng và ăn cùng người mình thương.`,
    `Đi qua bao nhiêu ồn ào vội vã của phố xá, chốn dừng chân an lòng nhất vẫn luôn là vòng tay ${p2}.`,
    `Không cần hứa hẹn non hẹn biển, chỉ mong ngày qua ngày hai đứa mình cứ nhẹ nhàng nắm tay nhau như thế.`,
    `Hôm nay trời xanh dịu dàng như nụ cười của ${p2} vậy. Mong hai đứa mình mãi an yên qua từng mùa nắng mưa.`,
    `Có những khoảnh khắc tĩnh lặng đến mức chỉ nghe thấy tiếng gió, nhưng lòng lại thấy đủ đầy vì có ${p2} kề bên.`,
    `Năm tháng trôi đi chẳng chờ đợi ai, nhưng tình cảm này dành cho ${p2} thì luôn vẹn nguyên như ngày đầu.`
  ];

  // 5. KHO HÀI HƯỚC DÍ DỎM (FUNNY)
  const funnyPool: string[] = [
    `Ra đường là cá mập hung dữ, về bên ${p2} tự động hóa thành cá con ngoan ngoãn. 🦈❤️`,
    `Ai bảo tình yêu là màu hồng? Với ${p1} tình yêu là màu của những món ăn mà ${p2} đòi ăn lúc 11h đêm! 🍜`,
    `Chụp 100 tấm ảnh thì 99 tấm chụp ${p2}, còn 1 tấm duy nhất của ${p1} thì bị... mờ nét. 😂`,
    `Ưu điểm: yêu ${p2}. Nhược điểm: quá yêu ${p2} nên hay bị bắt nạt. 😜`,
    `Trời sinh ${p1} tính hiền lành, ai ngờ gặp phải ${p2} 'đành hanh' nhưng mà yêu!`,
    `Nói nhỏ nghe nè: người đứng cạnh ${p1} trong ảnh này nhìn thì đáng yêu chứ tính tình thì... y hệt 'nóc nhà'! 🏠`,
    `Ví tiền có thể xẹp đi vì dắt ${p2} đi ăn, nhưng tình yêu thì lúc nào cũng đầy ắp.`,
    `Cãi nhau với ${p2} thì ${p1} luôn là người thắng... trong suy nghĩ, còn thực tế thì xin lỗi trước cho lành!`
  ];

  // 6. KHO STORY NGẮN GỌN (SHORT)
  const shortPool: string[] = [
    `Bình yên cạnh ${p2}. ✨`,
    `Ngày nắng đẹp cùng ${p2} ${locPhrase}. ☀️`,
    `My favorite person. ❤️`,
    `Ở bên ${p2}, mọi thứ đều hóa dịu dàng.`,
    `Khoảnh khắc này, cùng ${p2}. 🍃`,
    `Trọn vẹn một ngày bên người thương.`,
    `Hạnh phúc là đây chẳng tìm đâu xa.`,
    `Cùng ${p2} đi qua những ngày thanh xuân. 🌸`,
    `Một góc nhỏ chỉ có hai đứa mình.`
  ];

  // 7. NẾU CÓ CHI TIẾT ĐỊA ĐIỂM HOẶC KEYWORDS DO NGƯỜI DÙNG NHẬP
  const contextSpecificPool: string[] = [];
  if (loc) {
    contextSpecificPool.push(
      `${locIntro}nắng chiếu nghiêng qua hàng cây, chỉ mong thời gian ngừng lại ở giây phút này bên ${p2}.`,
      `Đánh dấu thêm một kỷ niệm ngọt ngào tại ${loc} cùng người thương yêu nhất.`,
      `${loc} hôm nay đẹp lạ kỳ, có lẽ vì trong mắt ${p1} đang có bóng hình ${p2}.`
    );
  }

  if (kw) {
    contextSpecificPool.push(
      `Một ngày thật đặc biệt với ${kw}, nhưng ý nghĩa nhất vẫn là vì được cùng ${p2} trải qua.`,
      `Gom chút dư vị của ${kw} và nụ cười em vào góc nhỏ kỷ niệm của hai đứa mình.`,
      `Có ${p2} bên cạnh, chuyện ${kw} giản dị thường ngày cũng hóa thành niềm vui lấp lánh.`
    );
  }

  // Thuật toán chọn lọc đa dạng theo tone được chọn + đan xen các phong cách khác
  let primaryPool: string[] = [];
  let primaryBadge = 'Lãng mạn';

  switch (params.tone) {
    case 'cute':
      primaryPool = cutePool;
      primaryBadge = 'Ngọt ngào';
      break;
    case 'peaceful':
      primaryPool = peacefulPool;
      primaryBadge = 'Bình yên';
      break;
    case 'funny':
      primaryPool = funnyPool;
      primaryBadge = 'Dí dỏm';
      break;
    case 'poem':
      primaryPool = poemPool;
      primaryBadge = 'Thơ tình';
      break;
    case 'short':
      primaryPool = shortPool;
      primaryBadge = 'Story ngắn';
      break;
    case 'romantic':
    default:
      primaryPool = romanticPool;
      primaryBadge = 'Sâu lắng';
      break;
  }

  // Trộn mảng ngẫu nhiên (Fisher-Yates Shuffle)
  const shuffle = <T>(arr: T[]): T[] => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const shuffledPrimary = shuffle(primaryPool);
  const shuffledPoems = shuffle(poemPool);
  const shuffledShorts = shuffle(shortPool);
  const shuffledRomantic = shuffle(romanticPool);
  const shuffledCute = shuffle(cutePool);
  const shuffledContext = shuffle(contextSpecificPool);

  const results: CaptionSuggestion[] = [];

  // Câu 1: Phong cách chính theo Tone được chọn
  if (shuffledPrimary.length > 0) {
    results.push({
      text: shuffledPrimary[0],
      badge: primaryBadge
    });
  }

  // Câu 2: Nếu có ngữ cảnh địa điểm/từ khóa, ưu tiên câu gắn liền với ngữ cảnh
  if (shuffledContext.length > 0) {
    results.push({
      text: shuffledContext[0],
      badge: loc ? `Gắn với ${loc}` : 'Chi tiết kỷ niệm'
    });
  } else if (shuffledPrimary.length > 1) {
    results.push({
      text: shuffledPrimary[1],
      badge: primaryBadge
    });
  }

  // Câu 3: Thơ tình ngọt ngào (hoặc câu sâu lắng nếu tone đang là thơ)
  if (params.tone !== 'poem' && shuffledPoems.length > 0) {
    results.push({
      text: shuffledPoems[0],
      badge: 'Thơ tình ngắn'
    });
  } else if (shuffledRomantic.length > 0) {
    results.push({
      text: shuffledRomantic[0],
      badge: 'Sâu lắng'
    });
  }

  // Câu 4: Một câu Story ngắn gọn tinh tế
  if (params.tone !== 'short' && shuffledShorts.length > 0) {
    results.push({
      text: shuffledShorts[0],
      badge: 'Story ngắn'
    });
  } else if (shuffledCute.length > 0) {
    results.push({
      text: shuffledCute[0],
      badge: 'Dễ thương'
    });
  }

  // Câu 5: Một câu dí dỏm hoặc đáng yêu để thêm gia vị tình yêu
  if (params.tone !== 'funny' && shuffledCute.length > 1) {
    results.push({
      text: shuffledCute[1],
      badge: 'Ngọt ngào'
    });
  } else if (shuffledPrimary.length > 2) {
    results.push({
      text: shuffledPrimary[2],
      badge: primaryBadge
    });
  }

  // Đảm bảo không trùng lặp các câu trong danh sách kết quả
  const uniqueResults: CaptionSuggestion[] = [];
  const seenTexts = new Set<string>();

  for (const item of results) {
    if (!seenTexts.has(item.text)) {
      seenTexts.add(item.text);
      uniqueResults.push(item);
    }
  }

  return uniqueResults.slice(0, 5);
}
