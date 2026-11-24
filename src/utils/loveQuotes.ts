export interface LoveQuote {
  id: string;
  text: string;
  mood: string;
}

const LAST_QUOTE_STORAGE_KEY = 'goc_nho_last_love_quote_id_v1';

const RAW_LOVE_QUOTES: LoveQuote[] = [
  {
    id: 'q1',
    text: 'Bình yên không phải là nơi không có gió mưa, mà là khi về đến nhà luôn có {personTwo} và {personOne} ngồi cạnh nhau uống một tách trà ấm.',
    mood: 'Bình yên'
  },
  {
    id: 'q2',
    text: 'Thế giới ngoài kia rộng lớn và vội vã bao nhiêu, chỉ cần nắm tay nhau bước chậm lại, mọi muộn phiền tự khắc tan biến.',
    mood: 'Dịu dàng'
  },
  {
    id: 'q3',
    text: 'Có những ngày chẳng cần đi đâu xa, chỉ cần nghe tiếng cười quen thuộc của người bên cạnh là đủ thấy cả bầu trời dịu nắng.',
    mood: 'Ngọt ngào'
  },
  {
    id: 'q4',
    text: 'Mong rằng dù thêm bao nhiêu mùa mưa nắng nữa, {personOne} và {personTwo} vẫn luôn nhìn nhau bằng ánh mắt dịu dàng như thuở ban đầu.',
    mood: 'Hứa hẹn'
  },
  {
    id: 'q5',
    text: 'Yêu một người là khi nhìn thấy một áng mây đẹp hay quán cà phê nhỏ bên đường, người đầu tiên nghĩ tới luôn là đối phương.',
    mood: 'Thương nhớ'
  },
  {
    id: 'q6',
    text: 'Hạnh phúc đôi khi thật giản đơn: một bữa cơm tối ấm nóng, vài câu chuyện vụn vặt cuối ngày, và cái ôm thật chặt trước khi ngủ.',
    mood: 'Bình yên'
  },
  {
    id: 'q7',
    text: 'Cảm ơn vì đã xuất hiện đúng lúc, kiên nhẫn lắng nghe những điều nhỏ bé nhất và biến mỗi ngày bình thường thành một kỷ niệm đáng nhớ.',
    mood: 'Biết ơn'
  },
  {
    id: 'q8',
    text: 'Giữa muôn vàn ngã rẽ của thanh xuân, thật may mắn vì {personOne} và {personTwo} đã chọn đi chung một con đường.',
    mood: 'Duyên phận'
  },
  {
    id: 'q9',
    text: 'Không cần những lời hứa hẹn thật to tát, chỉ cần mỗi sáng thức dậy vẫn thấy thương nhau thêm một chút là đủ trọn vẹn.',
    mood: 'Dịu dàng'
  },
  {
    id: 'q10',
    text: 'Tình yêu đẹp nhất không phải là không bao giờ giận hờn, mà là sau tất cả, hai đứa vẫn luôn chọn nắm tay và ở lại bên nhau.',
    mood: 'Thấu hiểu'
  },
  {
    id: 'q11',
    text: 'Mỗi bức ảnh lưu lại trong góc nhỏ này đều là một mảnh ghép của hạnh phúc mà sau này nhìn lại, chúng mình vẫn sẽ mỉm cười.',
    mood: 'Kỷ niệm'
  },
  {
    id: 'q12',
    text: 'Trời có thể trở lạnh vào cuối thu, nhưng chỉ cần đi bên cạnh nhau, bàn tay đan chặt lúc nào cũng thấy ấm áp.',
    mood: 'Ấm áp'
  },
  {
    id: 'q13',
    text: 'Chẳng cần tìm kiếm phép màu ở đâu xa, vì việc hai trái tim xa lạ tìm thấy nhau và cùng chung nhịp đập đã là điều kỳ diệu nhất.',
    mood: 'Ngọt ngào'
  },
  {
    id: 'q14',
    text: 'Ước gì thời gian trôi thật chậm những lúc hai đứa tựa vai ngắm hoàng hôn, để giữ mãi khoảnh khắc êm đềm này.',
    mood: 'Lãng mạn'
  },
  {
    id: 'q15',
    text: 'Dù hôm nay ngoài kia có mệt mỏi đến đâu, nhớ rằng luôn có một vòng tay dịu dàng sẵn sàng ôm lấy bạn vào cuối ngày.',
    mood: 'Sẻ chia'
  },
  {
    id: 'q16',
    text: 'Yêu nhau không chỉ là nhìn vào mắt nhau, mà là cùng nhau nhìn về một hướng và vun đắp từng ngày bình yên.',
    mood: 'Đồng hành'
  },
  {
    id: 'q17',
    text: 'Nụ cười của người thương chính là liều thuốc chữa lành dịu dàng nhất cho mọi áp lực của cuộc sống thường nhật.',
    mood: 'Ngọt ngào'
  },
  {
    id: 'q18',
    text: 'Thương {personTwo}, thương {personOne}, thương cả những điều vụng về đáng yêu mà chỉ khi ở bên nhau mới dám bộc lộ.',
    mood: 'Chân thành'
  },
  {
    id: 'q19',
    text: 'Một cuốn phim hay có thể kết thúc sau hai giờ, còn câu chuyện của hai đứa mình sẽ được viết tiếp qua từng năm tháng.',
    mood: 'Hứa hẹn'
  },
  {
    id: 'q20',
    text: 'Có những buổi chiều mưa rả rích bỗng hóa thành lãng mạn, chỉ vì được ngồi cùng nhau nghe một bản nhạc cũ quen tai.',
    mood: 'Lãng mạn'
  },
  {
    id: 'q21',
    text: 'Điều quý giá nhất trên đời không phải là đi thật nhiều nơi, mà là dù đi bất cứ đâu cũng có người ấy sánh bước bên cạnh.',
    mood: 'Đồng hành'
  },
  {
    id: 'q22',
    text: 'Chỉ cần còn thương nhau thật lòng, mỗi ngày trôi qua dù giản dị đến mấy cũng đều là một ngày đáng để ghi nhớ.',
    mood: 'Bình yên'
  },
  {
    id: 'q23',
    text: 'Gửi tặng nhau một chút dịu dàng cho hôm nay: nhớ ăn uống đầy đủ, đừng thức khuya quá và luôn giữ nụ cười trên môi nhé.',
    mood: 'Quan tâm'
  },
  {
    id: 'q24',
    text: 'Nếu hạnh phúc có hình hài, chắc chắn nó mang dáng dấp của hai cái bóng song hành dưới ánh đèn phố dịu nhẹ mỗi tối.',
    mood: 'Ấm áp'
  },
  {
    id: 'q25',
    text: 'Cảm ơn vì luôn là chốn bình yên để quay về, là người đầu tiên lắng nghe niềm vui và cũng là người ở lại sau cùng khi giông gió.',
    mood: 'Biết ơn'
  },
  {
    id: 'q26',
    text: 'Thật thích cảm giác chẳng cần phải nói gì nhiều, chỉ cần ở chung một không gian yên tĩnh mà trái tim vẫn thấy thật đủ đầy.',
    mood: 'Bình yên'
  },
  {
    id: 'q27',
    text: 'Chúc cho hành trình của {personOne} và {personTwo} luôn ngập tràn ánh nắng dịu nhẹ, tiếng cười giòn tan và thật nhiều chuyến đi đáng nhớ.',
    mood: 'Lời chúc'
  },
  {
    id: 'q28',
    text: 'Mỗi lần mở lại Góc Nhỏ Bình Yên là một lần nhắc nhớ rằng: chúng mình đã từng, đang và sẽ luôn là điều tuyệt vời nhất của nhau.',
    mood: 'Kỷ niệm'
  }
];

function readLastQuoteId(): string | null {
  try {
    return localStorage.getItem(LAST_QUOTE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveLastQuoteId(id: string): void {
  try {
    localStorage.setItem(LAST_QUOTE_STORAGE_KEY, id);
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

/**
 * Chọn ngẫu nhiên một lời nhắn yêu thương, đảm bảo không lặp lại ngay câu vừa hiển thị ở lần tải trước
 */
export function pickRandomLoveQuote(excludeId?: string | null): LoveQuote {
  const previousId = excludeId ?? readLastQuoteId();
  const candidates =
    previousId && RAW_LOVE_QUOTES.length > 1
      ? RAW_LOVE_QUOTES.filter((q) => q.id !== previousId)
      : RAW_LOVE_QUOTES;

  const chosen = candidates[Math.floor(Math.random() * candidates.length)] || RAW_LOVE_QUOTES[0];
  saveLastQuoteId(chosen.id);
  return chosen;
}

/**
 * Thay thế tên cặp đôi một cách tự nhiên vào nội dung lời nhắn
 */
export function formatLoveQuoteText(
  quote: LoveQuote,
  personOne?: string,
  personTwo?: string
): string {
  const p1 = (personOne || '').trim() || 'Anh';
  const p2 = (personTwo || '').trim() || 'Em';
  return quote.text.replace(/\{personOne\}/g, p1).replace(/\{personTwo\}/g, p2);
}
