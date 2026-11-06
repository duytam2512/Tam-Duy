import React, { useEffect, useRef } from 'react';

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  density: number;
  speed: number;
  wind: number;
  alpha: number;
  swaySpeed: number;
  swayOffset: number;
}

interface SnowEffectProps {
  enabled?: boolean;
}

export const SnowEffect: React.FC<SnowEffectProps> = ({ enabled = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Tạo các bông tuyết mềm mại, lãng mạn
    const snowflakeCount = Math.min(Math.floor(width / 22), 65);
    const snowflakes: Snowflake[] = [];

    for (let i = 0; i < snowflakeCount; i++) {
      snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.8 + 1, // Kích thước bông tuyết nhỏ xinh 1-3.8px
        density: Math.random() * snowflakeCount,
        speed: Math.random() * 0.8 + 0.4, // Rơi chậm rãi, êm ái
        wind: Math.random() * 0.6 - 0.3,
        alpha: Math.random() * 0.55 + 0.35, // Độ trong suốt nhẹ nhàng
        swaySpeed: Math.random() * 0.02 + 0.01,
        swayOffset: Math.random() * Math.PI * 2
      });
    }

    let angle = 0;

    const drawSnow = () => {
      ctx.clearRect(0, 0, width, height);

      angle += 0.01;

      for (let i = 0; i < snowflakes.length; i++) {
        const flake = snowflakes[i];

        // Cập nhật vị trí rơi với chuyển động đung đưa theo gió
        flake.y += flake.speed;
        flake.x += Math.sin(angle + flake.swayOffset) * 0.6 + flake.wind;

        // Nếu bông tuyết rơi qua đáy màn hình hoặc trôi ra ngoài mép
        if (flake.y > height) {
          flake.y = -10;
          flake.x = Math.random() * width;
        }
        if (flake.x > width + 10) {
          flake.x = -10;
        } else if (flake.x < -10) {
          flake.x = width + 10;
        }

        // Vẽ bông tuyết với ánh sáng kem trắng mềm ấm
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2, false);

        // Gradient nhẹ cho từng bông tuyết tạo độ mờ ảo nên thơ
        const gradient = ctx.createRadialGradient(
          flake.x,
          flake.y,
          0,
          flake.x,
          flake.y,
          flake.radius
        );
        gradient.addColorStop(0, `rgba(255, 253, 249, ${flake.alpha})`);
        gradient.addColorStop(0.7, `rgba(255, 245, 240, ${flake.alpha * 0.7})`);
        gradient.addColorStop(1, `rgba(232, 165, 152, 0)`);

        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(drawSnow);
    };

    drawSnow();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-20 transition-opacity duration-1000"
      style={{
        opacity: enabled ? 1 : 0
      }}
      aria-hidden="true"
    />
  );
};
