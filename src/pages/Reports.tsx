import React, { useState, useEffect } from 'react';
import { FileText, Trash2, Edit } from 'lucide-react';

interface Report {
  id: string;
  title: string;
  content: string; // Base64 or just the data
  date: string;
}

export const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const savedReports = localStorage.getItem('cmnl_reports');
    if (savedReports) {
      setReports(JSON.parse(savedReports));
    }
  }, []);

  const deleteReport = (id: string) => {
    const updatedReports = reports.filter(r => r.id !== id);
    setReports(updatedReports);
    localStorage.setItem('cmnl_reports', JSON.stringify(updatedReports));
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Reportes</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <FileText className="text-blue-500" size={32} />
              <div className="flex gap-2">
                <button onClick={() => alert('Edición individual no implementada aún')} className="p-2 text-gray-400 hover:text-blue-500"><Edit size={20} /></button>
                <button onClick={() => deleteReport(report.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={20} /></button>
              </div>
            </div>
            <h3 className="text-lg font-bold mb-1">{report.title}</h3>
            <p className="text-sm text-gray-500">{report.date}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
