import confetti from 'canvas-confetti';

export interface LoveMilestone {
  days: number;
  title: string;
  subtitle: string;
  tier: 'gold' | 'rose' | 'classic';
}

export interface MilestoneStatus {
  exactMilestone: LoveMilestone | null;
  latestAchieved: LoveMilestone | null;
  nextMilestone: LoveMilestone;
  daysUntilNext: number;
  progressPercent: number;
}

const CORE_MILESTONES: LoveMilestone[] = [
  {
    days: 30,
    title: 'Tròn 1 Tháng Yêu Nhau',
    subtitle: 'Khởi đầu thật dịu dàng cho hành trình dài phía trước.',
    tier: 'classic'
  },
  {
    days: 50,
    title: '50 Ngày Bên Nhau',
    subtitle: 'Năm mươi ngày đầy ắp tiếng cười và những rung động đầu tiên.',
    tier: 'classic'
  },
  {
    days: 100,
    title: '100 Ngày Yêu Nhau',
    subtitle: 'Một trăm ngày ấm áp — cột mốc tình yêu đáng nhớ đầu tiên của hai đứa.',
    tier: 'rose'
  },
  {
    days: 180,
    title: 'Nửa Năm Đồng Hành',
    subtitle: 'Sáu tháng trôi qua thật nhanh khi có nhau ở bên mỗi ngày.',
    tier: 'classic'
  },
  {
    days: 200,
    title: '200 Ngày Hạnh Phúc',
    subtitle: 'Hai trăm ngày lưu giữ biết bao kỷ niệm bình yên và ngọt ngào.',
    tier: 'rose'
  },
  {
    days: 300,
    title: '300 Ngày Bình Yên',
    subtitle: 'Ba trăm ngày thương nhau chân thành và ngày càng thấu hiểu.',
    tier: 'rose'
  },
  {
    days: 365,
    title: 'Kỷ Niệm 1 Năm Yêu Nhau',
    subtitle: 'Tròn bốn mùa xuân hạ thu đông luôn nắm chặt tay nhau.',
    tier: 'gold'
  },
  {
    days: 500,
    title: '500 Ngày Yêu Thương',
    subtitle: 'Năm trăm ngày bình yên viết nên câu chuyện đẹp nhất của riêng hai ta.',
    tier: 'gold'
  },
  {
    days: 730,
    title: 'Kỷ Niệm 2 Năm Yêu Nhau',
    subtitle: 'Hai năm đồng hành qua mọi buồn vui — thương nhau nhiều hơn mỗi ngày.',
    tier: 'gold'
  },
  {
    days: 1000,
    title: '1.000 Ngày Bên Nhau',
    subtitle: 'Một nghìn ngày kỳ diệu — tình yêu đã trở thành ngôi nhà bình yên nhất.',
    tier: 'gold'
  }
];

function buildMilestoneList(currentDays: number): LoveMilestone[] {
  const map = new Map<number, LoveMilestone>();
  for (const m of CORE_MILESTONES) {
    map.set(m.days, m);
  }

  // Thêm các mốc tròn mỗi 100 ngày (400, 600, 700, 800, 900, 1100...) và mốc tròn năm (3 năm, 4 năm, 5 năm...)
  const horizon = Math.max(1200, currentDays + 400);
  for (let d = 400; d <= horizon; d += 100) {
    if (!map.has(d)) {
      map.set(d, {
        days: d,
        title: `${d.toLocaleString('vi-VN')} Ngày Yêu Nhau`,
        subtitle: `Chúc mừng hai bạn đã cùng nhau đi qua ${d.toLocaleString('vi-VN')} ngày thật dịu dàng và trọn vẹn.`,
        tier: d % 500 === 0 ? 'gold' : 'rose'
      });
    }
  }

  const maxYears = Math.max(5, Math.ceil(horizon / 365) + 1);
  for (let y = 3; y <= maxYears; y++) {
    const approxDays = Math.round(y * 365.25);
    if (!map.has(approxDays)) {
      map.set(approxDays, {
        days: approxDays,
        title: `Kỷ Niệm ${y} Năm Yêu Nhau`,
        subtitle: `Tròn ${y} năm đồng hành — chúc hai bạn mãi giữ trọn vẹn sự ấm áp như ngày đầu.`,
        tier: 'gold'
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.days - b.days);
}

/**
 * Kiểm tra xem hôm nay có đúng ngày kỷ niệm tròn năm (trùng ngày/tháng với startDate) không
 */
function checkCalendarAnniversary(startDateStr: string, currentDays: number): LoveMilestone | null {
  if (!startDateStr || currentDays < 360) return null;
  const parts = startDateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;

  const [startYear, startMonth, startDay] = parts;
  const now = new Date();
  const years = now.getFullYear() - startYear;
  if (years >= 1 && now.getMonth() + 1 === startMonth && now.getDate() === startDay) {
    return {
      days: currentDays,
      title: `Kỷ Niệm ${years} Năm Yêu Nhau`,
      subtitle: `Hôm nay tròn đúng ${years} năm ngày hai bạn bắt đầu câu chuyện tình yêu này!`,
      tier: 'gold'
    };
  }
  return null;
}

export function getLoveMilestoneStatus(currentDays: number, startDateStr: string): MilestoneStatus {
  const safeDays = Math.max(0, Math.floor(currentDays));
  const list = buildMilestoneList(safeDays);

  const calendarAnniv = checkCalendarAnniversary(startDateStr, safeDays);
  const exactByDay = list.find((m) => m.days === safeDays) || null;
  const exactMilestone = calendarAnniv || exactByDay;

  let latestAchieved: LoveMilestone | null = exactMilestone;
  if (!latestAchieved) {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].days <= safeDays) {
        latestAchieved = list[i];
        break;
      }
    }
  }

  const nextMilestone =
    list.find((m) => m.days > safeDays) || {
      days: Math.ceil((safeDays + 1) / 100) * 100,
      title: `${(Math.ceil((safeDays + 1) / 100) * 100).toLocaleString('vi-VN')} Ngày Yêu Nhau`,
      subtitle: 'Chặng đường hạnh phúc tiếp theo của hai bạn.',
      tier: 'rose' as const
    };

  const prevDays = latestAchieved ? latestAchieved.days : 0;
  const span = Math.max(1, nextMilestone.days - prevDays);
  const progressPercent = Math.min(100, Math.max(0, Math.round(((safeDays - prevDays) / span) * 100)));

  return {
    exactMilestone,
    latestAchieved,
    nextMilestone,
    daysUntilNext: Math.max(1, nextMilestone.days - safeDays),
    progressPercent
  };
}

/**
 * Kịch bản bắn pháo hoa nhiều tầng chúc mừng cột mốc tình yêu (trả về hàm cleanup để dọn timer an toàn)
 */
export function launchMilestoneFireworks(tier: LoveMilestone['tier'] = 'rose'): () => void {
  if (typeof window === 'undefined') return () => {};
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  const palettes: Record<LoveMilestone['tier'], string[]> = {
    gold: ['#F59E0B', '#FDE68A', '#E8A598', '#FB7185', '#FFFDF9', '#D97706'],
    rose: ['#E8A598', '#F43F5E', '#F9DCC4', '#FBBF24', '#FB7185', '#FFFDF9'],
    classic: ['#E8A598', '#D98A76', '#F9DCC4', '#FDE68A', '#F472B6']
  };
  const colors = palettes[tier];
  const timers: number[] = [];

  const fireBurst = (delayMs: number, options: confetti.Options) => {
    const id = window.setTimeout(() => {
      try {
        confetti({
          colors,
          disableForReducedMotion: true,
          zIndex: 80,
          ...options
        });
      } catch {
        // Ignore if canvas cannot be initialized
      }
    }, delayMs);
    timers.push(id);
  };

  // Đợt 1: Hai pháo đại bác từ góc trái & phải bắn vồng lên
  fireBurst(0, {
    particleCount: 55,
    angle: 60,
    spread: 62,
    startVelocity: 52,
    origin: { x: 0.08, y: 0.72 }
  });
  fireBurst(120, {
    particleCount: 55,
    angle: 120,
    spread: 62,
    startVelocity: 52,
    origin: { x: 0.92, y: 0.72 }
  });

  // Đợt 2: Pháo hoa bung tròn nở rộ trên cao (trái, giữa, phải)
  fireBurst(550, {
    particleCount: 70,
    spread: 360,
    startVelocity: 32,
    ticks: 95,
    gravity: 0.75,
    scalar: 1.05,
    origin: { x: 0.28, y: 0.28 }
  });
  fireBurst(950, {
    particleCount: 85,
    spread: 360,
    startVelocity: 36,
    ticks: 105,
    gravity: 0.7,
    scalar: 1.15,
    origin: { x: 0.5, y: 0.22 }
  });
  fireBurst(1350, {
    particleCount: 70,
    spread: 360,
    startVelocity: 32,
    ticks: 95,
    gravity: 0.75,
    scalar: 1.05,
    origin: { x: 0.72, y: 0.3 }
  });

  // Đợt 3: Màn kết lấp lánh rực rỡ ở trung tâm
  fireBurst(1950, {
    particleCount: 95,
    spread: 110,
    startVelocity: 44,
    ticks: 110,
    scalar: 1.1,
    origin: { x: 0.5, y: 0.48 }
  });
  fireBurst(2350, {
    particleCount: 45,
    angle: 65,
    spread: 55,
    startVelocity: 45,
    origin: { x: 0.15, y: 0.68 }
  });
  fireBurst(2450, {
    particleCount: 45,
    angle: 115,
    spread: 55,
    startVelocity: 45,
    origin: { x: 0.85, y: 0.68 }
  });

  return () => {
    for (const id of timers) {
      window.clearTimeout(id);
    }
  };
}
