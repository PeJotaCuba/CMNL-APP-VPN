import React, { useEffect, useState } from 'react';
import { Report, User } from './types';
import { loadReportsFromDB, deleteReportFromDB, updateReportStatus, clearReportsDB } from './services/db';
import { openWhatsApp } from '../../utils/whatsappUtils';

interface ReportsViewerProps {
    users?: User[]; 
    onEdit: (report: Report) => void;
    currentUser?: User | null;
    refreshTrigger?: number;
}

const ReportsViewer: React.FC<ReportsViewerProps> = ({ users = [], onEdit, currentUser, refreshTrigger = 0 }) => {
    const [reports, setReports] = useState<Report[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSummary, setShowSummary] = useState(false);
    const [showTutorial, setShowTutorial] = useState(false);

    useEffect(() => {
        const seen = localStorage.getItem('rcm_tut_reports');
        if (!seen) {
            setShowTutorial(true);
        }
        loadData();
    }, [refreshTrigger]);

    const closeTutorial = () => {
        localStorage.setItem('rcm_tut_reports', 'true');
        setShowTutorial(false);
    };

    const loadData = async () => {
        setIsLoading(true);
        const filterUser = currentUser ? currentUser.username : undefined;
        const data = await loadReportsFromDB(filterUser);
        setReports(data);
        setIsLoading(false);
    };

    const handleDownload = async (report: Report) => {
        const datePart = report.date.split('T')[0];
        const safeProgram = report.program.replace(/[^a-zA-Z0-9]/g, '-');
        const downloadName = `PM-${safeProgram}-${datePart}.pdf`;

        const url = URL.createObjectURL(report.pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();

        await updateReportStatus(report.id, { downloaded: true });
        setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: { ...r.status, downloaded: true, sent: r.status?.sent || false } } : r));
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("¿Eliminar este reporte permanentemente?")) {
            await deleteReportFromDB(id);
            loadData();
        }
    };

    const handleClearAll = async () => {
        if (window.confirm("¿Estás seguro de que deseas eliminar TODOS los reportes generados? Esta acción no se puede deshacer.")) {
            await clearReportsDB();
            loadData();
        }
    };

    const summaryData = React.useMemo(() => {
        const stats: Record<string, { total: number, downloaded: number }> = {};
        
        reports.forEach(r => {
            if (!stats[r.program]) {
                stats[r.program] = { total: 0, downloaded: 0 };
            }
            stats[r.program].total++;
            if (r.status?.downloaded) stats[r.program].downloaded++;
        });
        
        return Object.entries(stats).map(([program, data]) => ({ program, ...data }));
    }, [reports]);

    return (
        <div className="flex flex-col h-full bg-[#1A100C] p-6 overflow-y-auto pb-24 relative">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#9E7649]">description</span>
                    Reportes
                </h2>
                <div className="flex gap-2">
                    {reports.length > 0 && (
                        <button 
                            onClick={handleClearAll}
                            className="bg-red-900/20 text-red-400 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-red-900/40 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-sm">delete_sweep</span>
                            Limpiar
                        </button>
                    )}
                    <button 
                        onClick={() => setShowSummary(true)}
                        className="bg-[#9E7649] text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 hover:bg-[#8B653D] shadow-sm"
                    >
                        <span className="material-symbols-outlined text-sm">analytics</span>
                        Resumen
                    </button>
                </div>
            </div>

            {showTutorial && (
                 <div className="bg-[#2C1B15] border border-[#9E7649]/30 p-4 rounded-xl mb-6 flex gap-3 animate-fade-in relative">
                    <span className="material-symbols-outlined text-[#9E7649] text-2xl">info</span>
                    <div className="flex-1">
                        <h4 className="font-bold text-[#9E7649] text-sm mb-1">Tus Reportes Personales</h4>
                        <p className="text-xs text-[#E8DCCF]/80">Aquí se guardan automáticamente los PDFs que generas. Solo tú puedes verlos. Puedes descargarlos, re-editarlos o ver un resumen de tu actividad.</p>
                    </div>
                    <button onClick={closeTutorial} className="absolute top-2 right-2 text-[#E8DCCF]/40 hover:text-white">
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-4 border-[#9E7649] border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-[#E8DCCF]/40">
                    <span className="material-symbols-outlined text-5xl mb-4 opacity-50">folder_off</span>
                    <p>No hay reportes generados.</p>
                    <p className="text-xs mt-2">Los reportes generados en la sección de Selección aparecerán aquí.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reports.map((report) => (
                        <div key={report.id} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 shadow-sm flex flex-col gap-3 group hover:border-[#9E7649]/50 transition-colors relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-2 flex gap-1">
                                {report.status?.sent && <span title="Enviado por WhatsApp" className="size-2 rounded-full bg-[#25D366]"></span>}
                                {report.status?.downloaded && <span title="Descargado" className="size-2 rounded-full bg-blue-500"></span>}
                            </div>

                            <div className="flex items-center gap-4 overflow-hidden">
                                <div className="size-12 rounded-lg bg-red-900/20 text-red-500 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-white truncate text-sm">{report.fileName}</h4>
                                    <div className="flex flex-wrap text-xs text-[#E8DCCF]/60 gap-x-3 gap-y-1 mt-1">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[10px]">calendar_today</span> 
                                            {report.date.includes('-') ? report.date.split('-').reverse().join('/') : new Date(report.date).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[10px]">radio</span> {report.program}</span>
                                    </div>
                                    <p className="text-[10px] text-[#E8DCCF]/40 mt-1 truncate">Generado por: {report.generatedBy}</p>
                                </div>
                            </div>

                            <div className="flex gap-2 justify-end border-t border-[#9E7649]/10 pt-3">
                                 <button 
                                    onClick={() => onEdit(report)}
                                    className="flex-1 bg-[#1A100C] text-[#E8DCCF]/80 text-[10px] font-bold py-2 rounded flex items-center justify-center gap-1 hover:bg-[#3E1E16] transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">edit_document</span> Editar
                                </button>

                                <button 
                                    onClick={async () => {
                                        const adminUser = users.find(u => u.role === 'admin' || u.classification === 'Administrador');
                                        let phone = adminUser?.phone || adminUser?.mobile || '54413935';
                                        
                                        if (!phone) {
                                            alert('No se encontró el número de teléfono del administrador.');
                                            return;
                                        }

                                        if (!phone.startsWith('53')) {
                                            phone = '53' + phone;
                                        }

                                        const datePart = report.date.split('T')[0];
                                        const safeProgram = report.program.replace(/[^a-zA-Z0-9]/g, '-');
                                        const downloadName = `PM-${safeProgram}-${datePart}.pdf`;
                                        const file = new File([report.pdfBlob], downloadName, { type: 'application/pdf' });

                                        // Si el usuario reportó que prefiere ir directo y no le importa el PDF completo en este paso específico,
                                        // o si el navigator.share falla, usamos openWhatsApp con resumen.
                                        // Intentamos el share de archivo primero si es posible.
                                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                            try {
                                                await navigator.share({
                                                    files: [file],
                                                    title: 'Reporte Musical',
                                                    text: `Hola, adjunto el reporte musical del programa *${report.program}* del día *${datePart}*.`
                                                });
                                                await updateReportStatus(report.id, { sent: true });
                                                setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: { ...r.status, sent: true, downloaded: r.status?.downloaded || false } } : r));
                                                return;
                                            } catch (error: any) {
                                                const errorMessage = error?.message || '';
                                                if (error.name === 'AbortError' || errorMessage.includes('cancel')) {
                                                    // Usuario canceló, no hacemos nada más
                                                    return;
                                                }
                                                console.error('Error sharing PDF file:', error);
                                            }
                                        }
                                        
                                        // Texto de respaldo si no se puede enviar el archivo PDF o falla
                                        let text = `Hola, este es el reporte musical del programa *${report.program}* del día *${datePart}*:\n\n`;
                                        if (report.items && report.items.length > 0) {
                                            report.items.forEach((item, index) => {
                                                text += `${index + 1}. ${item.title} - ${item.performer} (${item.author})\n`;
                                            });
                                        }
                                        
                                        openWhatsApp(text, phone);
                                        
                                        await updateReportStatus(report.id, { sent: true });
                                        setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: { ...r.status, sent: true, downloaded: r.status?.downloaded || false } } : r));
                                    }}
                                    className="size-8 rounded-full bg-[#1A100C] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors flex items-center justify-center"
                                    title="Enviar por WhatsApp"
                                >
                                    <span className="material-symbols-outlined text-sm">send</span>
                                </button>

                                <button 
                                    onClick={() => handleDownload(report)}
                                    className="size-8 rounded-full bg-[#1A100C] text-blue-400 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center"
                                    title="Descargar PDF"
                                >
                                    <span className="material-symbols-outlined text-sm">download</span>
                                </button>
                                <button 
                                    onClick={() => handleDelete(report.id)}
                                    className="size-8 rounded-full bg-[#1A100C] text-[#E8DCCF]/40 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center"
                                    title="Eliminar"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowSummary(false)}>
                    <div className="w-full max-w-sm bg-[#2C1B15] rounded-2xl shadow-xl p-6 border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4 border-b border-[#9E7649]/20 pb-2">
                             <h3 className="text-lg font-bold text-white">Resumen Estadístico</h3>
                             <button onClick={() => setShowSummary(false)} className="text-[#E8DCCF]/40 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        
                        <div className="max-h-[60vh] overflow-y-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-[#E8DCCF]/60 text-left border-b border-[#9E7649]/20">
                                        <th className="py-2 font-bold">Programa</th>
                                        <th className="py-2 font-bold text-center">Gen.</th>
                                        <th className="py-2 font-bold text-center">Desc.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryData.map(row => (
                                        <tr key={row.program} className="border-b border-[#9E7649]/10 last:border-0">
                                            <td className="py-2 font-medium text-[#E8DCCF] pr-2">{row.program}</td>
                                            <td className="py-2 text-center text-[#E8DCCF]/60">{row.total}</td>
                                            <td className="py-2 text-center text-blue-400 font-bold">{row.downloaded}</td>
                                        </tr>
                                    ))}
                                    {summaryData.length === 0 && (
                                        <tr><td colSpan={3} className="py-4 text-center text-[#E8DCCF]/40">Sin datos</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsViewer;
