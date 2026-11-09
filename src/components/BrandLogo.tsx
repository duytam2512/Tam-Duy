import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
  showHeartBadge?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = "w-8 h-8",
  size = 32,
  showHeartBadge = false
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative shrink-0 rounded-full select-none ${className}`}
      title="Góc Nhỏ Bình Yên"
    >
      <div className="w-full h-full rounded-full overflow-hidden shadow-xs ring-2 ring-[#C87D55]/35 bg-[#FAF7F2] transition-transform duration-300 hover:scale-105">
        <img
          src="/app-logo.png"
          alt="Logo Góc Nhỏ Bình Yên"
          className="w-full h-full object-cover rounded-full"
          loading="eager"
        />
      </div>
      {showHeartBadge && (
        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#E8A598] text-white flex items-center justify-center text-[9px] shadow-xs ring-1 ring-white">
          ❤️
        </span>
      )}
    </div>
  );
};

