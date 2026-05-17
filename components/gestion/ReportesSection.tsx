import React, { useState, useEffect } from 'react';
import CMNLHeader from '../CMNLHeader';
import { User, FP02Report, ProgramFicha, ConsolidatedPayment, ProgramCatalog, WorkLog } from '../../types';
import { ReportesAdmin } from './ReportesAdmin';
import { ReportesTrabajador } from './ReportesTrabajador';

interface Props {
  onBack: () => void;
  onMenuClick?: () => void;
  currentUser: User | null;
  fichas: ProgramFicha[];
  equipoData: any[]; 
  isCoordinatorWithAccess: boolean; 
  isGlobalAdmin: boolean;
  catalogo: ProgramCatalog[];
  consolidatedPayments: ConsolidatedPayment[];
  setConsolidatedPayments: React.Dispatch<React.SetStateAction<ConsolidatedPayment[]>>;
  getProgramRate: (name: string, role: string, level: string) => number;
  calculateTax: (amount: number) => number;
  workLogs: WorkLog[];
  setWorkLogs: React.Dispatch<React.SetStateAction<WorkLog[]>>;
  workLogDate: string;
  setWorkLogDate: React.Dispatch<React.SetStateAction<string>>;
  workLogView: 'daily' | 'weekly' | 'monthly';
  setWorkLogView: React.Dispatch<React.SetStateAction<'daily' | 'weekly' | 'monthly'>>;
}

const normalize = (s: string) => s ? s.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";

const isMatch = (name1: string, name2: string) => {
    const norm1 = normalize(name1);
    const norm2 = normalize(name2);
    if (!norm1 || !norm2) return false;
    if (norm1 === norm2) return true;
    
    if (norm1.length <= 3 || norm2.length <= 3) return norm1 === norm2;

    const getWords = (name: string) => name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(w => w.length > 2);
    const words1 = getWords(name1);
    const words2 = getWords(name2);
    
    if (words1.length === 0 || words2.length === 0) {
        return norm1.includes(norm2) || norm2.includes(norm1);
    }
    
    const [shorter, longer] = words1.length < words2.length ? [words1, words2] : [words2, words1];
    const matches = shorter.filter(w => longer.some(lw => lw === w || lw.includes(w) || w.includes(lw))).length;
    return matches >= Math.ceil(shorter.length * 0.75);
};

const ReportesSection: React.FC<Props> = ({ 
  onBack, onMenuClick, currentUser, fichas, equipoData, isCoordinatorWithAccess, isGlobalAdmin ,
  catalogo, consolidatedPayments, setConsolidatedPayments, getProgramRate, calculateTax,
  workLogs, setWorkLogs, workLogDate, setWorkLogDate, workLogView, setWorkLogView
}) => {
  const [reports, setReports] = useState<FP02Report[]>(() => {
    const saved = localStorage.getItem('rcm_gestion_reportes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('rcm_gestion_reportes', JSON.stringify(reports));
  }, [reports]);

  const canEdit = isGlobalAdmin || isCoordinatorWithAccess;

  return (
    <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
      <CMNLHeader 
          user={currentUser ? { name: currentUser.name, role: currentUser.role } : null}
          sectionTitle="Gestión de Pagos y Reportes"
          onMenuClick={onMenuClick}
          onBack={onBack}
      />
      
      <div className="flex-1 p-6 max-w-6xl mx-auto w-full flex flex-col">
        {canEdit ? (
          <ReportesAdmin 
             currentUser={currentUser}
             equipoData={equipoData}
             fichas={fichas}
             catalogo={catalogo}
             consolidatedPayments={consolidatedPayments}
             setConsolidatedPayments={setConsolidatedPayments}
             getProgramRate={getProgramRate}
             calculateTax={calculateTax}
             reports={reports}
             setReports={setReports}
             isMatch={isMatch}
             normalize={normalize}
          />
        ) : (
          <ReportesTrabajador 
             currentUser={currentUser}
             equipoData={equipoData}
             fichas={fichas}
             catalogo={catalogo}
             consolidatedPayments={consolidatedPayments}
             setConsolidatedPayments={setConsolidatedPayments}
             getProgramRate={getProgramRate}
             calculateTax={calculateTax}
             reports={reports}
             isMatch={isMatch}
             normalize={normalize}
             workLogs={workLogs}
             setWorkLogs={setWorkLogs}
             workLogDate={workLogDate}
             setWorkLogDate={setWorkLogDate}
             workLogView={workLogView}
             setWorkLogView={setWorkLogView}
          />
        )}
      </div>
    </div>
  );
};

export default ReportesSection;
