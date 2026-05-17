import React, { useState } from 'react';
import CMNLHeader from '../CMNLHeader';
import { ProgramCatalog, RolePaymentInfo } from '../../types';
import { openWhatsApp } from '../../utils/whatsappUtils';
import { Edit2, Upload, Save, X, Share2, Download, Eraser, Trash2 } from 'lucide-react';
import { Document, Packer, Paragraph, Table as DocTable, TableRow as DocRow, TableCell as DocCell, TextRun, AlignmentType, WidthType } from 'docx';
import { saveAs } from 'file-saver';

interface Props {
  onBack: () => void;
  onMenuClick?: () => void;
  currentUser: any;
  catalogo: ProgramCatalog[];
  setCatalogo: React.Dispatch<React.SetStateAction<ProgramCatalog[]>>;
}

const CatalogoSection: React.FC<Props> = ({ onBack, onMenuClick, currentUser, catalogo, setCatalogo }) => {
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<ProgramCatalog | null>(null);
  const [isEditingCatalogo, setIsEditingCatalogo] = useState(false);
  const [editingProg, setEditingProg] = useState<ProgramCatalog | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = currentUser?.classification === 'Administrador' || (currentUser?.role === 'admin' && currentUser?.classification !== 'Coordinador');

  const exportCatalogoDoc = async (prog: ProgramCatalog) => {
      const doc = new Document({
          sections: [{
              children: [
                  new Paragraph({ text: `CATÁLOGO DE PAGO: ${prog.name.toUpperCase()}`, alignment: AlignmentType.CENTER, heading: "Heading1" }),
                  new Paragraph({ text: "" }),
                  ...prog.roles.map(r => {
                      return [
                          new Paragraph({ children: [new TextRun({ text: r.role.toUpperCase(), bold: true, size: 24 })], spacing: { before: 400 } }),
                          new Paragraph({ children: [new TextRun({ text: `Porcentaje: ${r.percentage || 'N/A'}` })] }),
                          new Paragraph({ children: [new TextRun({ text: `T/R: ${r.tr || 'N/A'}` })] }),
                          new Paragraph({ text: "Salarios:", spacing: { before: 200 } }),
                          new DocTable({
                              width: { size: 100, type: WidthType.PERCENTAGE },
                              rows: r.salaries.map(s => new DocRow({
                                  children: [
                                      new DocCell({ children: [new Paragraph(s.level)] }),
                                      new DocCell({ children: [new Paragraph(`$${s.amount}`)] }),
                                  ]
                              }))
                          }),
                          new Paragraph({ text: "Tasas:", spacing: { before: 200 } }),
                          new DocTable({
                              width: { size: 100, type: WidthType.PERCENTAGE },
                              rows: r.rates.map(rate => new DocRow({
                                  children: [
                                      new DocCell({ children: [new Paragraph(rate.level)] }),
                                      new DocCell({ children: [new Paragraph(`$${rate.amount}`)] }),
                                  ]
                              }))
                          }),
                      ];
                  }).flat()
              ]
          }]
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Catalogo_${prog.name.replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
  };

  const handleEditCatalogo = (prog: ProgramCatalog) => {
      setEditingProg(JSON.parse(JSON.stringify(prog))); // Deep clone
      setIsEditingCatalogo(true);
  };

  const handleSaveEditCatalogo = () => {
      if (editingProg) {
          const updatedCatalogo = catalogo.map(c => c.name === editingProg.name ? editingProg : c);
          setCatalogo(updatedCatalogo);
          localStorage.setItem('rcm_data_catalogo', JSON.stringify(updatedCatalogo));
          setIsEditingCatalogo(false);
          setEditingProg(null);
      }
  };

  const handleRoleChange = (roleIndex: number, field: keyof RolePaymentInfo, value: any) => {
      if (!editingProg) return;
      const newRoles = [...editingProg.roles];
      newRoles[roleIndex] = { ...newRoles[roleIndex], [field]: value };
      setEditingProg({ ...editingProg, roles: newRoles });
  };

  const handleLevelAmountChange = (roleIndex: number, type: 'salaries' | 'rates', levelIndex: number, value: string) => {
      if (!editingProg) return;
      const newRoles = [...editingProg.roles];
      const items = [...newRoles[roleIndex][type]];
      items[levelIndex] = { ...items[levelIndex], amount: value };
      newRoles[roleIndex] = { ...newRoles[roleIndex], [type]: items };
      setEditingProg({ ...editingProg, roles: newRoles });
  };

  const parseAndImportCatalogo = (text: string) => {
      const programs: ProgramCatalog[] = [];
      const blocks = text.split(/_{10,}/); 

      blocks.forEach(block => {
          if (!block.trim()) return;

          const nameMatch = block.match(/Programa:\s*(.+)/);
          if (!nameMatch) return;
          const name = nameMatch[1].trim();

          const roles: RolePaymentInfo[] = [];
          
          const lines = block.split('\n').map(l => l.trim()).filter(l => l);
          let currentRole: RolePaymentInfo | null = null;
          let currentSection: 'salaries' | 'rates' | null = null;

          for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              if (line.startsWith('Programa:')) continue;

              const isKeyValue = line.includes(':') && !line.endsWith(':');
              const isSectionHeader = line.includes('Salarios por niveles') || line.includes('Tasas por niveles');
              
              if (!isKeyValue && !isSectionHeader && !line.match(/^[IVX]+:/) && !line.match(/^SR:/)) {
                  if (currentRole) roles.push(currentRole);
                  currentRole = { role: line, percentage: '', tr: '', salaries: [], rates: [] };
                  currentSection = null;
                  continue;
              }

              if (!currentRole) continue;

              if (line.toLowerCase().includes('porcentaje:')) {
                  currentRole.percentage = line.split(':')[1].trim();
              } else if (line.toLowerCase().includes('t/r:')) {
                  currentRole.tr = line.split(':')[1].trim();
              } else if (line.toLowerCase().includes('salarios por niveles')) {
                  currentSection = 'salaries';
              } else if (line.toLowerCase().includes('tasas por niveles')) {
                  currentSection = 'rates';
              } else if (currentSection && (line.match(/^[IVX]+:/) || line.match(/^SR:/) || line.match(/^- [IVX]+:/) || line.match(/^- SR:/))) {
                  const cleanLine = line.replace(/^- /, '');
                  const [level, amount] = cleanLine.split(':');
                  if (level && amount) {
                      if (currentSection === 'salaries') currentRole.salaries.push({ level: level.trim(), amount: amount.trim() });
                      else currentRole.rates.push({ level: level.trim(), amount: amount.trim() });
                  }
              }
          }
          if (currentRole) roles.push(currentRole);

          if (roles.length > 0) programs.push({ name, roles });
      });

      if (programs.length > 0) {
          setCatalogo(prev => {
              const newCatalogo = [...prev];
              programs.forEach(newProg => {
                  const existingIndex = newCatalogo.findIndex(p => p.name === newProg.name);
                  if (existingIndex >= 0) newCatalogo[existingIndex] = newProg;
                  else newCatalogo.push(newProg);
              });
              localStorage.setItem('rcm_data_catalogo', JSON.stringify(newCatalogo));
              return newCatalogo;
          });
          alert(`Se han importado/actualizado ${programs.length} programas en el catálogo.`);
      } else {
          alert('No se pudieron encontrar datos válidos en el archivo.');
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseAndImportCatalogo(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
      <CMNLHeader 
          user={currentUser ? { name: currentUser?.name, role: currentUser?.role } : null}
          sectionTitle="Catálogo de Pagos"
          onMenuClick={onMenuClick}
          onBack={onBack}
      />
      <div className="flex-1 p-6 overflow-y-auto max-w-6xl mx-auto w-full">
         
         <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="relative w-full md:w-96">
                 <input 
                    type="text"
                    placeholder="Buscar programa en el catálogo..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-[#2C1B15] border border-[#9E7649]/30 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-[#9E7649] transition-colors"
                 />
                 <Edit2 className="absolute left-3 top-3.5 text-[#9E7649]" size={18} />
             </div>
             
             {isAdmin && (
                 <div className="flex flex-wrap gap-2 w-full md:w-auto">
                     <label className="cursor-pointer bg-[#9E7649] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#8B653D] transition-colors flex-1 md:flex-none justify-center">
                         <Upload size={20} />
                         <span>Importar Catálogo (TXT)</span>
                         <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
                     </label>
                     <button 
                         onClick={() => {
                             if(confirm('¿Seguro que desea eliminar todo el catálogo mensual? Esta acción es irreversible.')) {
                                 setCatalogo([]);
                                 localStorage.setItem('rcm_data_catalogo', JSON.stringify([]));
                             }
                         }}
                         className="bg-red-900/40 text-red-400 border border-red-500/30 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-900/60 transition-colors flex-1 md:flex-none justify-center"
                     >
                         <Eraser size={20} />
                         <span>Limpiar todo</span>
                     </button>
                 </div>
             )}
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogo
                .filter(p => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(prog => (
                <div key={prog.name} className="bg-[#2C1B15] border border-[#9E7649]/20 p-4 rounded-xl shadow-lg relative group overflow-hidden">
                    <div className="flex justify-between items-start mb-4 pr-2">
                        <h3 className="font-bold text-white text-lg pr-4">{prog.name}</h3>
                        <div className="flex gap-1 flex-shrink-0">
                            {isAdmin ? (
                                <>
                                    <button onClick={() => handleEditCatalogo(prog)} className="p-1.5 bg-blue-900/40 text-blue-400 rounded hover:bg-blue-900/60 transition-all" title="Editar"><Edit2 size={14}/></button>
                                    <button 
                                        onClick={() => {
                                            const text = `Catálogo de Pago: ${prog.name}\nRoles: ${prog.roles.map(r => r.role).join(', ')}`;
                                            openWhatsApp(text);
                                        }}
                                        className="p-1.5 bg-green-900/40 text-green-400 rounded hover:bg-green-900/60 transition-all" title="Compartir WhatsApp"
                                    >
                                        <Share2 size={14}/>
                                    </button>
                                    <button onClick={() => exportCatalogoDoc(prog)} className="p-1.5 bg-amber-900/40 text-amber-400 rounded hover:bg-amber-900/60 transition-all" title="Descargar .docx"><Download size={14}/></button>
                                    <button 
                                        onClick={() => {
                                            if(confirm('¿Eliminar del catálogo?')) {
                                                const updated = catalogo.filter(c => c.name !== prog.name);
                                                setCatalogo(updated);
                                                localStorage.setItem('rcm_data_catalogo', JSON.stringify(updated));
                                            }
                                        }}
                                        className="p-1.5 bg-red-900/40 text-red-400 rounded hover:bg-red-900/60 transition-all" title="Eliminar"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button 
                                        onClick={() => {
                                            const text = `Catálogo de Pago: ${prog.name}\nRoles: ${prog.roles.map(r => r.role).join(', ')}`;
                                            openWhatsApp(text);
                                        }}
                                        className="p-1.5 bg-green-900/40 text-green-400 rounded hover:bg-green-900/60 transition-all" title="Compartir WhatsApp"
                                    >
                                        <Share2 size={14}/>
                                    </button>
                                    <button onClick={() => exportCatalogoDoc(prog)} className="p-1.5 bg-amber-900/40 text-amber-400 rounded hover:bg-amber-900/60 transition-all" title="Descargar .docx"><Download size={14}/></button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        {prog.roles.map((r, i) => (
                            <div key={`${r.role}-${i}`} className="bg-[#1A100C] p-2 rounded">
                                <p className="text-sm font-bold text-[#E8DCCF]">
                                    {r.role} 
                                    {r.percentage && <span className="text-[#9E7649] text-xs font-normal ml-2">({r.percentage})</span>}
                                    {r.tr && <span className="text-[#9E7649] text-xs font-normal ml-2">T/R: {r.tr}</span>}
                                </p>
                                
                                {r.salaries && r.salaries.length > 0 && (
                                    <div className="mt-1 space-y-1">
                                        <p className="text-xs text-[#9E7649] uppercase">Salarios:</p>
                                        {r.salaries.map(sal => (
                                            <div key={`sal-${sal.level}`} className="flex justify-between text-xs pl-2">
                                                <span>{sal.level}</span>
                                                <span className="text-green-400">${sal.amount}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {r.rates && r.rates.length > 0 && (
                                    <div className="mt-1 space-y-1">
                                        <p className="text-xs text-[#9E7649] uppercase">Tasas:</p>
                                        {r.rates.map(rate => (
                                            <div key={`rate-${rate.level}`} className="flex justify-between text-xs pl-2">
                                                <span>{rate.level}</span>
                                                <span className="text-green-400">${rate.amount}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
         </div>
      </div>

      {isEditingCatalogo && editingProg && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-[#1A100C] border border-[#9E7649]/40 p-6 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white">Editar Programa: {editingProg.name}</h2>
                      <button onClick={() => setIsEditingCatalogo(false)} className="text-[#9E7649] hover:text-white">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="space-y-8">
                      {editingProg.roles.map((role, rIdx) => (
                          <div key={rIdx} className="bg-[#2C1B15] p-5 rounded-xl border border-[#9E7649]/20">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div>
                                      <label className="block text-xs uppercase text-[#9E7649] tracking-widest mb-1">Nombre del Rol</label>
                                      <input 
                                          className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2 text-white"
                                          type="text" 
                                          value={role.role}
                                          onChange={e => handleRoleChange(rIdx, 'role', e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs uppercase text-[#9E7649] tracking-widest mb-1">Porcentaje</label>
                                      <input 
                                          className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2 text-white"
                                          type="text" 
                                          value={role.percentage}
                                          onChange={e => handleRoleChange(rIdx, 'percentage', e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs uppercase text-[#9E7649] tracking-widest mb-1">T/R</label>
                                      <input 
                                          className="w-full bg-[#1A100C] border border-[#9E7649]/30 rounded-lg p-2 text-white"
                                          type="text" 
                                          value={role.tr}
                                          onChange={e => handleRoleChange(rIdx, 'tr', e.target.value)}
                                      />
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div>
                                      <h4 className="text-xs font-bold text-[#E8DCCF]/60 uppercase mb-2">Salarios por Niveles</h4>
                                      <div className="space-y-2">
                                          {role.salaries.map((s, sIdx) => (
                                              <div key={sIdx} className="flex items-center gap-3">
                                                  <span className="text-xs text-[#9E7649] w-8">{s.level}:</span>
                                                  <input 
                                                      className="flex-1 bg-[#1A100C] border border-[#9E7649]/20 rounded p-1 text-white text-sm"
                                                      type="text"
                                                      value={s.amount}
                                                      onChange={e => handleLevelAmountChange(rIdx, 'salaries', sIdx, e.target.value)}
                                                  />
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                                  <div>
                                      <h4 className="text-xs font-bold text-[#E8DCCF]/60 uppercase mb-2">Tasas por Niveles</h4>
                                      <div className="space-y-2">
                                          {role.rates.map((r, ltIdx) => (
                                              <div key={ltIdx} className="flex items-center gap-3">
                                                  <span className="text-xs text-[#9E7649] w-8">{r.level}:</span>
                                                  <input 
                                                      className="flex-1 bg-[#1A100C] border border-[#9E7649]/20 rounded p-1 text-white text-sm"
                                                      type="text"
                                                      value={r.amount}
                                                      onChange={e => handleLevelAmountChange(rIdx, 'rates', ltIdx, e.target.value)}
                                                  />
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="mt-8 flex justify-end gap-3">
                      <button onClick={() => setIsEditingCatalogo(false)} className="px-6 py-3 bg-[#2C1B15] text-white rounded-xl font-bold">Cancelar</button>
                      <button onClick={handleSaveEditCatalogo} className="px-6 py-3 bg-green-900/40 text-green-400 border border-green-500/30 rounded-xl font-bold flex items-center gap-2">
                          <Save size={20} /> Guardar Cambios
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CatalogoSection;
