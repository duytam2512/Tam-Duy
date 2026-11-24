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

export const MILESTONE_FIREWORKS_DURATION_MS = 5200;

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Kịch bản bắn pháo hoa rực rỡ toàn màn hình bằng canvas-confetti cho các cột mốc tình yêu
 * (100 ngày, 200 ngày, 1 năm, 500 ngày, 1.000 ngày...)
 * Trả về hàm cleanup để dừng hiệu ứng và dọn dẹp canvas/timer an toàn.
 */
export function launchMilestoneFireworks(tier: LoveMilestone['tier'] = 'rose'): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }

  const palettes: Record<LoveMilestone['tier'], string[][]> = {
    gold: [
      ['#F59E0B', '#FDE68A', '#FBBF24', '#FFFBEB'],
      ['#FB7185', '#FDE68A', '#F59E0B', '#FFFDF9'],
      ['#E8A598', '#FBBF24', '#F43F5E', '#FEF3C7'],
      ['#F472B6', '#FDE68A', '#F59E0B', '#FFFFFF']
    ],
    rose: [
      ['#F43F5E', '#FB7185', '#FDA4AF', '#FFFDF9'],
      ['#E8A598', '#FBBF24', '#F472B6', '#FEF3C7'],
      ['#FB7185', '#FDE68A', '#E11D48', '#FFF1F2'],
      ['#F472B6', '#F59E0B', '#E8A598', '#FFFFFF']
    ],
    classic: [
      ['#E8A598', '#D98A76', '#F9DCC4', '#FFFDF9'],
      ['#FBBF24', '#FB7185', '#FDE68A', '#FFFBEB'],
      ['#F472B6', '#E8A598', '#F9DCC4', '#FFFFFF'],
      ['#FB7185', '#D98A76', '#FDE68A', '#FFFDF9']
    ]
  };

  const tierPalettes = palettes[tier];
  const allColors = Array.from(new Set(tierPalettes.flat()));
  const pickBurstColors = () =>
    tierPalettes[Math.floor(Math.random() * tierPalettes.length)] || allColors;

  // Tạo canvas phủ toàn màn hình riêng biệt để hiệu ứng pháo hoa luôn nổi rõ và dọn sạch sau khi kết thúc
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.className = 'fixed inset-0 w-screen h-screen pointer-events-none z-[120]';
  document.body.appendChild(canvas);

  let fire: ReturnType<typeof confetti.create> | null = null;
  try {
    // useWorker: false giúp tương thích mượt mà trên iPhone Safari & tránh lỗi OffscreenCanvas/CSP
    fire = confetti.create(canvas, { resize: true, useWorker: false });
  } catch {
    canvas.remove();
    return () => {};
  }

  const isCompactScreen = window.innerWidth < 640;
  const densityScale = isCompactScreen ? 0.72 : 1;
  const scaleCount = (count: number) => Math.max(12, Math.round(count * densityScale));

  const timers: number[] = [];
  const intervals: number[] = [];
  let cleanedUp = false;

  const safeFire = (options: confetti.Options) => {
    if (cleanedUp || !fire) return;
    try {
      fire({
        disableForReducedMotion: true,
        ...options
      });
    } catch {
      // Bỏ qua nếu trình duyệt tạm ngưng context canvas
    }
  };

  const schedule = (delayMs: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      if (!cleanedUp) fn();
    }, delayMs);
    timers.push(id);
  };

  // Bắn 1 quả pháo hoa nở 2 tầng (vòng hoa ngoài + lõi sao lấp lánh bên trong) tại vị trí (x, y)
  const launchSkyShell = (x: number, y: number, scale = 1) => {
    const shellColors = pickBurstColors();
    safeFire({
      particleCount: scaleCount(64 * scale),
      spread: 360,
      startVelocity: randomInRange(26, 36) * Math.min(1.15, scale),
      decay: 0.91,
      gravity: 0.72,
      ticks: 115,
      scalar: randomInRange(0.95, 1.18),
      shapes: ['circle', 'star'],
      colors: shellColors,
      origin: { x, y }
    });
    safeFire({
      particleCount: scaleCount(24 * scale),
      spread: 360,
      startVelocity: randomInRange(14, 21),
      decay: 0.93,
      gravity: 0.58,
      ticks: 95,
      scalar: 0.85,
      shapes: ['star'],
      colors: ['#FFFDF9', '#FDE68A', shellColors[0]],
      origin: { x, y }
    });
  };

  // MÀN 1: Khai màn với 2 loạt pháo đại bác từ 2 góc dưới bắn vồng lên bầu trời
  schedule(0, () => {
    safeFire({
      particleCount: scaleCount(58),
      angle: 62,
      spread: 58,
      startVelocity: 62,
      decay: 0.91,
      gravity: 0.88,
      ticks: 120,
      colors: allColors,
      origin: { x: 0.03, y: 0.86 }
    });
    safeFire({
      particleCount: scaleCount(58),
      angle: 118,
      spread: 58,
      startVelocity: 62,
      decay: 0.91,
      gravity: 0.88,
      ticks: 120,
      colors: allColors,
      origin: { x: 0.97, y: 0.86 }
    });
  });

  schedule(260, () => {
    safeFire({
      particleCount: scaleCount(44),
      angle: 68,
      spread: 52,
      startVelocity: 58,
      shapes: ['star', 'circle'],
      colors: pickBurstColors(),
      origin: { x: 0.08, y: 0.8 }
    });
    safeFire({
      particleCount: scaleCount(44),
      angle: 112,
      spread: 52,
      startVelocity: 58,
      shapes: ['star', 'circle'],
      colors: pickBurstColors(),
      origin: { x: 0.92, y: 0.8 }
    });
  });

  // Quả pháo trung tâm mở màn rực rỡ trên đỉnh màn hình
  schedule(440, () => {
    launchSkyShell(0.5, 0.24, 1.15);
  });

  // MÀN 2: Bắn pháo hoa liên hoàn phủ khắp chiều rộng màn hình (trái - giữa - phải luân phiên)
  const skyBands: Array<[number, number]> = [
    [0.14, 0.34],
    [0.66, 0.86],
    [0.36, 0.64],
    [0.18, 0.42],
    [0.58, 0.82]
  ];

  schedule(760, () => {
    let shellIndex = 0;
    const maxShells = 10;

    const fireNextShell = () => {
      if (cleanedUp || shellIndex >= maxShells) return;
      const [minX, maxX] = skyBands[shellIndex % skyBands.length];
      const x = randomInRange(minX, maxX);
      const y = randomInRange(0.14, 0.48);
      launchSkyShell(x, y, randomInRange(0.9, 1.1));

      // Mỗi 3 nhịp thêm cặp pháo sao nhỏ đối xứng hai bên cho dày bầu trời
      if (shellIndex % 3 === 1) {
        safeFire({
          particleCount: scaleCount(22),
          spread: 360,
          startVelocity: 22,
          gravity: 0.65,
          ticks: 90,
          shapes: ['star'],
          colors: pickBurstColors(),
          origin: { x: 1 - x, y: randomInRange(0.18, 0.44) }
        });
      }
      shellIndex += 1;
    };

    fireNextShell();
    const intervalId = window.setInterval(() => {
      if (cleanedUp || shellIndex >= maxShells) {
        window.clearInterval(intervalId);
        return;
      }
      fireNextShell();
    }, 310);
    intervals.push(intervalId);
  });

  // MÀN 3: Đại tiệc kết màn toàn màn hình — 3 quả pháo lớn đồng loạt + 2 pháo góc + mưa sao lấp lánh
  schedule(4100, () => {
    launchSkyShell(0.22, 0.24, 1.1);
    launchSkyShell(0.5, 0.17, 1.25);
    launchSkyShell(0.78, 0.24, 1.1);
  });

  schedule(4520, () => {
    safeFire({
      particleCount: scaleCount(70),
      angle: 60,
      spread: 68,
      startVelocity: 66,
      decay: 0.91,
      ticks: 130,
      shapes: ['circle', 'star'],
      colors: allColors,
      origin: { x: 0.04, y: 0.88 }
    });
    safeFire({
      particleCount: scaleCount(70),
      angle: 120,
      spread: 68,
      startVelocity: 66,
      decay: 0.91,
      ticks: 130,
      shapes: ['circle', 'star'],
      colors: allColors,
      origin: { x: 0.96, y: 0.88 }
    });
  });

  schedule(4850, () => {
    const showerOrigins = [0.2, 0.5, 0.8];
    for (const ox of showerOrigins) {
      safeFire({
        particleCount: scaleCount(26),
        spread: 110,
        startVelocity: 24,
        gravity: 0.56,
        ticks: 135,
        scalar: 1.05,
        shapes: ['star'],
        colors: ['#FDE68A', '#FBBF24', '#FB7185', '#FFFDF9'],
        origin: { x: ox, y: 0.08 }
      });
    }
  });

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    for (const id of timers) {
      window.clearTimeout(id);
    }
    for (const id of intervals) {
      window.clearInterval(id);
    }
    try {
      fire?.reset();
    } catch {
      // Ignore
    }
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  };

  // Tự động gỡ canvas sau khi toàn bộ hạt pháo hoa rơi hết
  schedule(MILESTONE_FIREWORKS_DURATION_MS + 2800, cleanup);

  return cleanup;
}

