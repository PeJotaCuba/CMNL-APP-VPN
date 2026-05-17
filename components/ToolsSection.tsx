import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Wrench, 
  FileText, 
  BookOpen, 
  Megaphone, 
  Settings,
  ChevronRight,
  Sparkles,
  Database
} from 'lucide-react';
import CMNLHeader from './CMNLHeader';
import DataExtractionTool from './DataExtractionTool';

interface ToolsSectionProps {
  onBack: () => void;
  onMenuClick: () => void;
  currentUser: any;
}

const ToolsSection: React.FC<ToolsSectionProps> = ({ onBack, onMenuClick, currentUser }) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const allTools = [
    {
      id: 'script-format',
      title: 'Formato de Guion',
      description: 'Plantillas y herramientas para la creación de guiones radiales.',
      icon: FileText,
      color: 'from-blue-500/20 to-blue-600/20',
      textColor: 'text-blue-400',
      borderColor: 'border-blue-500/30'
    },
    {
      id: 'data-extraction',
      title: 'Extracción de Datos',
      description: 'Automatiza la extracción de propiedades de archivos de texto y audio mediante PowerShell.',
      icon: Database,
      color: 'from-cyan-500/20 to-cyan-600/20',
      textColor: 'text-cyan-400',
      borderColor: 'border-cyan-500/30'
    },
    {
      id: 'inst-docs',
      title: 'Documentos Institucionales',
      description: 'Acceso a normativas, reglamentos y documentos oficiales.',
      icon: BookOpen,
      color: 'from-emerald-500/20 to-emerald-600/20',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30'
    },
    {
      id: 'inst-comm',
      title: 'Comunicación Institucional',
      description: 'Herramientas de difusión y comunicación interna.',
      icon: Megaphone,
      color: 'from-purple-500/20 to-purple-600/20',
      textColor: 'text-purple-400',
      borderColor: 'border-purple-500/30'
    },
    {
      id: 'maintenance',
      title: 'Mantenimiento',
      description: 'Reporte y seguimiento de incidencias técnicas.',
      icon: Settings,
      color: 'from-amber-500/20 to-amber-600/20',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/30'
    }
  ];

  const userTools = currentUser?.tools || [];
  const isAdmin = currentUser?.role === 'admin' || currentUser?.classification === 'Administrador';
  
  // Admins see all tools, workers see assigned tools
  const tools = isAdmin ? allTools : allTools.filter(t => userTools.includes(t.id));

  // If a tool is active, render it instead of the list
  if (activeTool === 'data-extraction') {
    return (
      <div className="min-h-screen bg-[#1A0F0A] text-[#E8DCCF] font-sans pb-20">
        <CMNLHeader 
          title="Extracción de Datos" 
          subtitle="Herramientas PowerShell" 
          onBack={() => setActiveTool(null)}
          onMenuClick={onMenuClick}
        />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <DataExtractionTool onBack={() => setActiveTool(null)} isAdmin={isAdmin} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A0F0A] text-[#E8DCCF] font-sans pb-20">
      <CMNLHeader 
        title="Mis Herramientas" 
        subtitle="Recursos especializados" 
        onBack={onBack}
        onMenuClick={onMenuClick}
      />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-[#2A1810] to-[#1A0F0A] border border-stone-700/50 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <Wrench className="text-amber-500" />
              Módulo Especializado
            </h2>
            <p className="text-stone-400 max-w-2xl">
              Bienvenido a tu panel de herramientas. Aquí encontrarás recursos diseñados específicamente para tu especialización dentro de Radio Ciudad Monumento.
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {tools.map((tool, index) => (
            <motion.button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`group flex items-start gap-4 p-5 rounded-xl bg-gradient-to-br ${tool.color} border ${tool.borderColor} text-left transition-all hover:shadow-lg hover:shadow-black/40`}
            >
              <div className={`p-3 rounded-lg bg-black/40 ${tool.textColor}`}>
                <tool.icon size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white group-hover:text-amber-500 transition-colors uppercase tracking-tight">
                  {tool.title}
                </h3>
                <p className="text-sm text-stone-300 mt-1 line-clamp-2 leading-relaxed font-mono">
                  {tool.description}
                </p>
              </div>
              <div className="pt-2 text-stone-500 group-hover:text-amber-500 transition-colors">
                <ChevronRight size={20} />
              </div>
            </motion.button>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 p-8 rounded-2xl border-2 border-dashed border-stone-800 flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 rounded-full bg-stone-900 flex items-center justify-center mb-4 border border-stone-700">
            <Sparkles className="text-stone-500" />
          </div>
          <h3 className="text-lg font-medium text-stone-400">Más herramientas próximamente</h3>
          <p className="text-stone-600 text-sm mt-2 max-w-sm">
            Estamos trabajando para incorporar nuevas funcionalidades adaptadas a cada perfil del equipo CMNL.
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default ToolsSection;
