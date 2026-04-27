import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Logo = ({ className = "", showText = true, size = "lg" }: { className?: string, showText?: boolean, size?: "sm" | "md" | "lg" | "xl" }) => {
  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-16 h-16",
    lg: "w-32 h-32",
    xl: "w-52 h-52",
  };
  
  const iconSizes = {
    sm: 20,
    md: 32,
    lg: 64,
    xl: 100,
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        {/* Modern Minimalist Accent Rings */}
        <div className="absolute inset-0 rounded-full border border-emerald-100/50 scale-110" />
        <div className="absolute inset-0 rounded-full border-2 border-emerald-50 scale-105" />
        
        {/* Main Logo Container */}
        <div className="w-full h-full rounded-[2.5rem] bg-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-200/50 border-4 border-white relative z-10 overflow-hidden">
          {/* Subtle Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
          
          {/* Refined Shield Icon */}
          <ShieldCheck 
            size={iconSizes[size]} 
            className="text-white drop-shadow-lg relative z-20" 
            strokeWidth={1.5}
          />
        </div>

        {/* Floating Decorative Elements */}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow-sm z-30" />
      </div>
      
      {showText && (
        <div className="mt-4 text-center">
          <h2 className={`text-slate-900 font-black tracking-tight leading-none ${size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-5xl'}`}>
            TRUE<span className="text-emerald-600">LABEL</span>
          </h2>
          <p className={`font-black text-slate-400 uppercase tracking-[0.3em] ${size === 'sm' ? 'text-[6px] mt-0.5' : size === 'md' ? 'text-[8px] mt-1' : size === 'lg' ? 'text-[10px] mt-1.5' : 'text-xs mt-2'}`}>
            Digital Health Safety
          </p>
        </div>
      )}
    </div>
  );
};
