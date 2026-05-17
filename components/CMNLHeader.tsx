import React from 'react';
import { LOGO_URL } from '../utils/scheduleData';

interface CMNLHeaderProps {
  user: { name: string; role: string; photo?: string } | null;
  sectionTitle: string;
  onMenuClick?: () => void;
  onBack?: () => void;
  children?: React.ReactNode;
}

const CMNLHeader: React.FC<CMNLHeaderProps> = ({ user, sectionTitle, onMenuClick, onBack, children }) => {
  return (
    <div className="flex-none flex flex-col w-full z-50 shadow-xl">
      {/* Top Bar */}
      <div className="bg-[#3E1E16] px-4 py-3 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={onMenuClick} 
            className="text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
             <span className="material-symbols-outlined text-3xl">menu</span>
          </button>
          <div className="flex items-center gap-3">
             {/* Logo SVG */}
             <div className="size-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden p-1.5">
                <img src={LOGO_URL} alt="Logo CMNL" className="w-full h-full object-contain" />
             </div>
             <div>
                <h1 className="text-white font-bold text-lg leading-none tracking-tight">CMNL App</h1>
                <p className="text-[#9E7649] text-[10px] font-bold uppercase tracking-widest mt-0.5">PANEL INTERNO</p>
             </div>
          </div>
        </div>
        
        {/* User Info */}
        <div className="flex items-center gap-4">
          {user && (
              <div className="text-right hidden sm:block">
                  <p className="text-white font-bold text-sm">{user.name}</p>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <div className="size-2 rounded-full bg-green-500 animate-pulse"></div>
                      <p className="text-[#9E7649] text-xs font-medium uppercase tracking-wide">{user.role}</p>
                  </div>
              </div>
          )}
        </div>
      </div>

      {/* Secondary Bar (Section Title) */}
      <div className="bg-[#2C1B15] px-6 py-4 border-b border-[#9E7649]/20 flex items-center justify-between gap-4">
         <div className="flex items-center gap-4">
            {onBack && (
              <button 
                onClick={onBack}
                className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/5"
              >
                <span className="material-symbols-outlined text-2xl">arrow_back</span>
              </button>
            )}
            <h2 className="text-xl text-white/90 font-medium tracking-wide">{sectionTitle}</h2>
         </div>
         {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
};

export default CMNLHeader;
