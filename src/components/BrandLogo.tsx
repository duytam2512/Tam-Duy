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
        d="M50 26 C32 8, 8 24, 22 50 C34 72, 50 86, 50 86 C50 86, 66 72, 78 50 C92 24, 68 8, 50 26 Z"
        fill="none"
        stroke="#C87D55"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 2. Mái nhà ấm cúng bên trong */}
      <path
        d="M35 54 L50 41 L65 54 V70 H35 Z"
        fill="#FAF7F2"
        stroke="#C87D55"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 3. Cánh cửa nhỏ bình yên */}
      <path
        d="M44 70 V58 H56 V70"
        fill="none"
        stroke="#C87D55"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 4. Ống khói gia đình */}
      <path
        d="M58 43 V36 H64 V48"
        fill="none"
        stroke="#C87D55"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
