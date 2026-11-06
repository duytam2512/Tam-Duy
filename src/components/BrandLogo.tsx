import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = "w-8 h-8", size = 32 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-label="Logo Góc Nhỏ Bình Yên - Mái nhà & Trái tim"
    >
      {/* 1. Trái tim bao bọc bên ngoài */}
      <path
        d="M50 28 C32 10, 8 26, 22 52 C34 74, 50 88, 50 88 C50 88, 66 74, 78 52 C92 26, 68 10, 50 28 Z"
        fill="none"
        stroke="#C87D55"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 2. Mái nhà ấm cúng bên trong */}
      <path
        d="M35 56 L50 43 L65 56 V72 H35 Z"
        fill="#FFFDF9"
        stroke="#C87D55"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 3. Cánh cửa nhỏ bình yên */}
      <path
        d="M44 72 V60 H56 V72"
        fill="none"
        stroke="#C87D55"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 4. Ống khói gia đình */}
      <path
        d="M58 45 V38 H64 V50"
        fill="none"
        stroke="#C87D55"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
