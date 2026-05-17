
import React, { useState } from 'react';
import { User, HistoricalMonthData } from '../../types';
import { calculateScheduledHours, canConsolidate } from '../services/consolidationService';

interface Props {
  currentUser: User | null;
  onBack: () => void;
}

const HistoryEvolutionView: React.FC<Props> = ({ currentUser, onBack }) => {
  const isAdmin = currentUser?.role === 'admin';
  const [historyData, setHistoryData] = useState<HistoricalMonthData[]>([]); // Mock inicial
  const [newMonth, setNewMonth] = useState({ month: 0, year: 2026, interruptions: 0 });

  const handleConsolidate = (month: number, year: number) => {
    if (!canConsolidate(month, year)) {
      alert("No se puede consolidar un mes que no ha finalizado.");
      return;
    }
    // Lógica de consolidación
  };

  return (
    <div className="p-6 bg-[#F5F5F0] min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Histórico / Evolución</h1>
      
      {isAdmin && (
        <div className="bg-white p-4 rounded-lg mb-6 shadow">
          <h2 className="text-lg font-semibold mb-2">Registrar Mes Anterior</h2>
          <div className="flex gap-4">
            <input type="number" placeholder="Mes (0-11)" onChange={(e) => setNewMonth({...newMonth, month: parseInt(e.target.value)})} />
            <input type="number" placeholder="Año" onChange={(e) => setNewMonth({...newMonth, year: parseInt(e.target.value)})} />
            <input type="number" placeholder="Interrupciones (min)" onChange={(e) => setNewMonth({...newMonth, interruptions: parseInt(e.target.value)})} />
            <button className="bg-[#9E7649] text-white px-4 py-2 rounded" onClick={() => handleConsolidate(newMonth.month, newMonth.year)}>Consolidar</button>
          </div>
        </div>
      )}

      <table className="w-full bg-white rounded-lg shadow">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left">Mes</th>
            <th className="p-3 text-left">Horas Programadas</th>
            <th className="p-3 text-left">Interrupciones</th>
            <th className="p-3 text-left">Horas Reales Transmitidas</th>
          </tr>
        </thead>
        <tbody>
          {historyData.map((data, index) => (
            <tr key={index} className="border-b">
              <td className="p-3">{data.month + 1}/{data.year}</td>
              <td className="p-3">{data.scheduledHours}</td>
              <td className="p-3">{data.interruptionsMinutes / 60}h</td>
              <td className="p-3">{data.scheduledHours - (data.interruptionsMinutes / 60)}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HistoryEvolutionView;
