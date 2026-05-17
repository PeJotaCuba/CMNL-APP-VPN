import React from 'react';
import { openWhatsApp } from '../utils/whatsappUtils';
import { Share2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UpdateDetailsModalProps {
    isOpen: boolean;
    details: string;
    isAdmin: boolean;
    onClose: () => void;
}

export const UpdateDetailsModal: React.FC<UpdateDetailsModalProps> = ({
    isOpen,
    details,
    isAdmin,
    onClose
}) => {
    if (!isOpen) return null;

    const handleShare = () => {
        const text = `Actualización de Datos CMNL completada exitosamente.\n\nDetalles:\n${details}\n\nIngresa a la app para ver los cambios.`;
        openWhatsApp(text);
    };

    return (
        <AnimatePresence>
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
                    <div className="bg-[#5D3A24] p-4 text-center">
                        <h2 className="text-xl font-bold text-white">¡Sincronización completada!</h2>
                        <p className="text-[#E8DCCF] text-sm mt-1">Los datos están actualizados.</p>
                    </div>
                    <div className="p-6">
                        <h3 className="font-bold text-[#5D3A24] mb-3 text-sm uppercase tracking-wide">Detalles de la actualización</h3>
                        <div className="bg-[#F5F0EB] p-4 rounded-xl text-sm text-[#3E1E16] whitespace-pre-wrap border border-[#5D3A24]/10 max-h-60 overflow-y-auto">
                            {details}
                        </div>
                        
                        <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <button 
                              onClick={onClose}
                              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-xl transition-colors"
                            >
                                Aceptar
                            </button>
                            {isAdmin && (
                                <button 
                                  onClick={handleShare}
                                  className="flex-1 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Share2 size={18} /> WhatsApp
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

interface UpdateReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
}

export const UpdateReminderModal: React.FC<UpdateReminderModalProps> = ({
    isOpen,
    onClose,
    onUpdate
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative">
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                            <AlertCircle size={32} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Recordatorio de Actualización</h2>
                        <p className="text-gray-600 text-sm mb-6">
                            Han pasado más de 24 horas desde tu última actualización de datos.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button 
                              onClick={() => {
                                  onClose();
                                  onUpdate();
                              }}
                              className="w-full bg-[#5D3A24] hover:bg-[#3E1E16] text-white font-semibold py-3 px-4 rounded-xl transition-colors"
                            >
                                Sí, actualizar ahora
                            </button>
                            <button 
                              onClick={onClose}
                              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl transition-colors"
                            >
                                Omitir por ahora
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
