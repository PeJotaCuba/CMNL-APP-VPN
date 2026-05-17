import React, { useState } from 'react';

const GUIDE_SECTIONS = [
    {
        title: "Explorador de Música",
        icon: "folder_open",
        content: "Navega por las carpetas de música del servidor (Música 1, 2, 3...). Puedes buscar canciones por título, intérprete o nombre de archivo. Toca una canción para ver sus detalles o una carpeta para abrirla."
    },
    {
        title: "Selección de Temas",
        icon: "checklist",
        content: "Mientras navegas, toca el botón '+' para agregar canciones a tu lista de selección. En la pestaña 'Selección', puedes revisar tu lista, agregar temas faltantes manualmente o buscar por lista de deseos."
    },
    {
        title: "Generación de Reportes",
        icon: "description",
        content: "Una vez tengas tu selección lista, ve a 'Exportar'. El Director puede generar un reporte PDF oficial que se guardará automáticamente en su sesión. Los usuarios pueden exportar a TXT o compartir por WhatsApp."
    },
    {
        title: "Lista de Deseos",
        icon: "list_alt",
        content: "Si tienes una lista de temas en texto (ej. bloc de notas), puedes copiarla y pegarla en la 'Lista de Deseos' dentro de la sección Selección para buscar todos los temas automáticamente."
    },
    {
        title: "Sincronización",
        icon: "sync",
        content: "Usa el botón de actualizar en la parte superior derecha para obtener los últimos cambios en la base de datos de usuarios y la versión de la aplicación."
    }
];

const Guide: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <div className="flex flex-col h-full bg-[#1A100C] p-6 overflow-y-auto pb-24">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#9E7649]">help</span>
                Guía de Usuario
            </h2>
            <div className="space-y-4">
                {GUIDE_SECTIONS.map((section, idx) => (
                    <div key={idx} className="bg-[#2C1B15] rounded-xl border border-[#9E7649]/20 overflow-hidden shadow-sm">
                        <button 
                            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                            className="w-full flex items-center justify-between p-4 bg-[#2C1B15] hover:bg-[#3E1E16] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-[#9E7649]">{section.icon}</span>
                                <span className="font-bold text-white text-sm text-left">{section.title}</span>
                            </div>
                            <span className="material-symbols-outlined text-[#E8DCCF]/60 text-sm transition-transform duration-300" style={{ transform: openIndex === idx ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                        </button>
                        {openIndex === idx && (
                            <div className="p-4 text-sm text-[#E8DCCF]/80 leading-relaxed border-t border-[#9E7649]/20 bg-[#1A100C] animate-fade-in">
                                {section.content}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            <div className="mt-8 p-4 bg-[#9E7649]/10 rounded-xl border border-[#9E7649]/30">
                <p className="text-xs text-[#9E7649] text-center">
                    <strong>Radio Ciudad Monumento</strong><br/>
                    Sistema de Gestión Musical v2.0
                </p>
            </div>
        </div>
    );
};

export default Guide;
