import React from 'react';
import { ShieldCheck, Download, X, AlertTriangle } from 'lucide-react';

interface BackupDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onBackup: () => void;
    isLogoutTrigger?: boolean;
}

const BackupDialog: React.FC<BackupDialogProps> = ({ isOpen, onClose, onBackup, isLogoutTrigger = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-[#2C1B15] rounded-3xl shadow-2xl overflow-hidden border border-[#9E7649]/30 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-[#3E1E16] px-6 py-8 text-center relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full text-[#E8DCCF]/50 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#9E7649]/20 text-[#9E7649] mb-4">
                        <ShieldCheck size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">
                        {isLogoutTrigger ? 'Respaldo de Seguridad' : 'Recordatorio de Respaldo'}
                    </h3>
                    <p className="text-sm text-[#E8DCCF]/60">
                        Asegura la integridad de tus datos antes de continuar.
                    </p>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="space-y-4 mb-8">
                        <div className="flex gap-4 p-4 rounded-2xl bg-black/20 border border-white/5">
                            <div className="w-10 h-10 rounded-xl bg-[#9E7649]/10 flex items-center justify-center text-[#9E7649] shrink-0">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white mb-1">¿Por qué respaldar?</h4>
                                <p className="text-xs text-[#E8DCCF]/70 leading-relaxed">
                                    El respaldo consolidará tus gestiones de pagos, selecciones musicales y reportes generados en un archivo seguro.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                                <p className="text-[10px] uppercase tracking-wider text-[#9E7649] font-bold mb-1">Pagos</p>
                                <p className="text-[10px] text-[#E8DCCF]/50">Manuales y Habituales</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-center">
                                <p className="text-[10px] uppercase tracking-wider text-[#9E7649] font-bold mb-1">Música</p>
                                <p className="text-[10px] text-[#E8DCCF]/50">Listas y Reportes</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={onBackup}
                            className="w-full py-4 bg-[#9E7649] hover:bg-[#8B653D] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98]"
                        >
                            <Download size={20} />
                            Generar Archivo de Respaldo
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-full py-4 bg-transparent hover:bg-white/5 text-[#E8DCCF]/50 hover:text-white rounded-2xl font-bold transition-all"
                        >
                            {isLogoutTrigger ? 'No, cerrar sesión ahora' : 'Recordar más tarde'}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-black/20 px-8 py-4 border-t border-white/5">
                    <p className="text-[10px] text-center text-[#E8DCCF]/30 italic">
                        El archivo .json descargado podrá ser utilizado para restaurar tu información en cualquier momento.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BackupDialog;
