import React from 'react';

export const Logo = ({ className = "", showText = true, size = "lg" }: { className?: string, showText?: boolean, size?: "sm" | "md" | "lg" | "xl" }) => {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-32 h-32",
    xl: "w-48 h-48",
  };
  
  const textSizeClasses = {
    sm: "text-[3px]",
    md: "text-[4.5px]",
    lg: "text-[4.5px]",
    xl: "text-[4.5px]",
  };

  const textScale = {
    sm: "scale-50",
    md: "scale-75",
    lg: "scale-100",
    xl: "scale-150",
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        {/* Curving Text above the logo */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <path id="curve" d="M 15 55 A 35 35 0 1 1 85 55" fill="transparent" />
          <text fontSize="5.5" fill="#4B5563" fontWeight="600" letterSpacing="1.5" className="uppercase font-sans">
            <textPath href="#curve" startOffset="50%" textAnchor="middle">
              True Label • Wellness You Can Trust
            </textPath>
          </text>
        </svg>

        {/* Outer Ring */}
        <div className="w-[60%] h-[60%] rounded-full bg-[#527027] p-[3%] shadow-sm">
          {/* Inner Light Ring */}
          <div className="w-full h-full rounded-full bg-[#f8f9f5] p-[5%]">
            {/* Inner Dark Circle */}
            <div className="w-full h-full rounded-full bg-[#527027] flex items-center justify-center p-[8%]">
              {/* Shield */}
              <div 
                className="w-full h-full bg-[#6a8b34] rounded-t-sm rounded-b-lg flex items-center justify-center shadow-inner"
                style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 70%, 50% 100%, 0% 70%)' }}
              >
                {/* Checkmark */}
                <svg className="w-[60%] h-[60%] text-[#86eda4] drop-shadow-sm mb-[5%]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
      {showText && (
        <h2 className={`text-[#415a1f] font-serif tracking-[0.25em] font-medium mt-1 uppercase text-center ${size === 'sm' ? 'text-[8px] mt-0.5' : size === 'md' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-2xl mt-2'}`}>
          True Label
        </h2>
      )}
    </div>
  );
};
