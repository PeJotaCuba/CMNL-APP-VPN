import React, { useState } from 'react';
import CMNLHeader from '../CMNLHeader';
import { ProgramFicha } from '../../types';
import { openWhatsApp } from '../../utils/whatsappUtils';
import { Edit2, Upload, Save, X, Trash2, Plus, Share2, Download, Eraser } from 'lucide-react';
import { Document, Packer, Paragraph, Table as DocTable, TableRow as DocRow, TableCell as DocCell, TextRun, AlignmentType, WidthType } from 'docx';
import { saveAs } from 'file-saver';

interface Props {
  onBack: () => void;
  onMenuClick?: () => void;
  currentUser: any;
  fichas: ProgramFicha[];
  setFichas: React.Dispatch<React.SetStateAction<ProgramFicha[]>>;
}

const FichasSection: React.FC<Props> = ({ onBack, onMenuClick, currentUser, fichas, setFichas }) => {
  const [selectedFicha, setSelectedFicha] = useState<ProgramFicha | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ProgramFicha | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = currentUser?.classification === 'Administrador' || (currentUser?.role === 'admin' && currentUser?.classification !== 'Coordinador');

  const exportFichaDoc = async (ficha: ProgramFicha) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ text: `FICHA TÉCNICA: ${ficha.name.toUpperCase()}`, alignment: AlignmentType.CENTER, heading: "Heading1" }),
          new Paragraph({ text: "" }),
          new DocTable({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              ...Object.entries(ficha).map(([key, value]) => {
                if (key === 'sections' || key === 'times') return null;
                return new DocRow({
                  children: [
                    new DocCell({ children: [new Paragraph({ children: [new TextRun({ text: key.charAt(0).toUpperCase() + key.slice(1), bold: true })] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                    new DocCell({ children: [new Paragraph(String(value || 'N/A'))], width: { size: 70, type: WidthType.PERCENTAGE } }),
                  ]
                });
              }).filter(row => row !== null) as DocRow[]
            ]
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "TIEMPOS", alignment: AlignmentType.LEFT, heading: "Heading2" }),
          new DocTable({
             width: { size: 100, type: WidthType.PERCENTAGE },
             rows: [
                 new DocRow({
                     children: [
                         new DocCell({ children: [new Paragraph({ children: [new TextRun({ text: "Música", bold: true })] })] }),
                         new DocCell({ children: [new Paragraph({ children: [new TextRun({ text: "Información", bold: true })] })] }),
                         new DocCell({ children: [new Paragraph({ children: [new TextRun({ text: "Propaganda", bold: true })] })] }),
                     ]
                 }),
                 new DocRow({
                     children: [
                         new DocCell({ children: [new Paragraph(ficha.times?.music || '0:00')] }),
                         new DocCell({ children: [new Paragraph(ficha.times?.info || '0:00')] }),
                         new DocCell({ children: [new Paragraph(ficha.times?.propaganda || '0:00')] }),
                     ]
                 })
             ]
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "SECCIONES", alignment: AlignmentType.LEFT, heading: "Heading2" }),
          ...(ficha.sections || []).map(sec => new Paragraph({
            children: [
                new TextRun({ text: `${sec.name}: `, bold: true }),
                new TextRun({ text: `${sec.description || ''} ${sec.schedule ? `(${sec.schedule})` : ''}` })
            ],
            spacing: { before: 200 }
          }))
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ficha_${ficha.name.replace(/\s+/g, '_')}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleEdit = () => {
      if (selectedFicha) {
          setEditForm({ ...selectedFicha });
          setIsEditing(true);
      }
  };

  const handleNestedInputChange = (parent: 'times', field: string, value: string) => {
      if (editForm) {
          setEditForm({
              ...editForm,
              [parent]: {
                  ...editForm[parent],
                  [field]: value
              }
          });
      }
  };

  const handleSectionChange = (index: number, field: string, value: string) => {
      if (editForm && editForm.sections) {
          const updatedSections = [...editForm.sections];
          // @ts-ignore
          updatedSections[index] = { ...updatedSections[index], [field]: value };
          setEditForm({ ...editForm, sections: updatedSections });
      }
  };

  const handleRemoveSection = (index: number) => {
      if (editForm && editForm.sections) {
          const updatedSections = editForm.sections.filter((_, i) => i !== index);
          setEditForm({ ...editForm, sections: updatedSections });
      }
  };

  const handleSaveEdit = () => {
      if (editForm && selectedFicha) {
          const updatedFichas = fichas.map(f => f.name === selectedFicha.name ? editForm : f);
          setFichas(updatedFichas);
          localStorage.setItem('rcm_data_fichas', JSON.stringify(updatedFichas));
          setSelectedFicha(editForm);
          setIsEditing(false);
          setEditForm(null);
      }
  };

  const parseAndImportFichas = (text: string) => {
    const programs: ProgramFicha[] = [];
    const blocks = text.split(/_{10,}/); 
    
    blocks.forEach(block => {
        if(!block.trim()) return;
        
        const getValue = (key: string) => {
            const regex = new RegExp(`${key}:\\s*(.*)`);
            const match = block.match(regex);
            return match ? match[1].trim() : '';
        };

        const getMultiLineValue = (key: string, endKey: string) => {
             const start = block.indexOf(key);
             if (start === -1) return '';
             let end = block.indexOf(endKey, start);
             if (end === -1) end = block.length;
             return block.substring(start + key.length, end).trim();
        };

        const name = getValue('Programa');
        if(!name) return;

        const sections: any[] = [];
        const sectionsText = getMultiLineValue('Secciones:', '________________________________________________________');
        if(sectionsText && !sectionsText.includes('No especifica')) {
            const sectionLines = sectionsText.split('\n').filter(l => l.trim().length > 0);
            sectionLines.forEach(line => {
                 const parts = line.split(':');
                 if(parts.length >= 2) {
                     sections.push({
                         name: parts[0].trim(),
                         description: parts.slice(1).join(':').trim(),
                         schedule: '',
                         duration: ''
                     });
                 }
            });
        }

        programs.push({
            name: name,
            schedule: getValue('Horario'),
            duration: getValue('Tiempo'),
            frequency: getValue('Frecuencia'),
            func: getValue('Función'),
            music_cuban: getValue('Música Cubana'),
            music_foreign: getValue('Música Extranjera'),
            group: getValue('Grupo'),
            form: getValue('Forma'),
            complexity: getValue('Complejidad'),
            theme: getValue('Tema'),
            target: getValue('Intencionalidad de Destinatario'),
            times: {
                music: getValue('Música'),
                info: getValue('Información'),
                propaganda: getValue('Propaganda')
            },
            startDate: getValue('Fecha de inicio'),
            emissionType: getValue('Tipo de emisión'),
            literarySupport: getMultiLineValue('Clasificación del soporte literario:', 'Objetivo Principal:'),
            objective: getMultiLineValue('Objetivo Principal:', 'Perfil:'),
            profile: getMultiLineValue('Perfil:', 'Secciones:'),
            sections: sections
        });
    });

    if(programs.length > 0) {
        setFichas(prev => {
            const newFichas = [...prev];
            programs.forEach(newProg => {
                const existingIndex = newFichas.findIndex(p => p.name === newProg.name);
                if (existingIndex >= 0) {
                    newFichas[existingIndex] = newProg;
                } else {
                    newFichas.push(newProg);
                }
            });
            localStorage.setItem('rcm_data_fichas', JSON.stringify(newFichas));
            return newFichas;
        });
        alert(`Se han importado/actualizado ${programs.length} fichas de programas.`);
    } else {
        alert('No se pudieron encontrar programas en el archivo de texto.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        parseAndImportFichas(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#1A100C] text-[#E8DCCF] font-display flex flex-col">
      <CMNLHeader 
          user={currentUser ? { name: currentUser?.name, role: currentUser?.role } : null}
          sectionTitle="Fichas de Programas"
          onMenuClick={onMenuClick}
          onBack={onBack}
      />
      <div className="flex-1 p-6 overflow-y-auto max-w-6xl mx-auto w-full">
         
         <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
             <div className="relative w-full md:w-96">
                 <input 
                    type="text"
                    placeholder="Buscar ficha de programa..."
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
                         <span>Importar Fichas (TXT)</span>
                         <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
                     </label>
                     <button 
                         onClick={() => {
                             if(confirm('¿Seguro que desea eliminar todas las fichas? Esta acción es irreversible.')) {
                                 setFichas([]);
                                 localStorage.setItem('rcm_data_fichas', JSON.stringify([]));
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
            {fichas
                .filter(f => !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(ficha => (
                <div key={ficha.name} className="bg-[#2C1B15] border border-[#9E7649]/20 p-4 rounded-xl shadow-lg cursor-pointer hover:border-[#9E7649]/50 transition-colors" onClick={() => setSelectedFicha(ficha)}>
                    <h3 className="font-bold text-white text-lg mb-2">{ficha.name}</h3>
                    <p className="text-sm text-[#9E7649]">Frecuencia: {ficha.frequency}</p>
                    <p className="text-sm text-[#9E7649]">Horario: {ficha.schedule}</p>
                </div>
            ))}
         </div>
      </div>
      
      {selectedFicha && !isEditing && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedFicha(null)}>
              <div className="bg-[#1A100C] border border-[#9E7649]/40 p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-start mb-6">
                      <h2 className="text-2xl font-bold text-white">{selectedFicha.name}</h2>
                      <div className="flex flex-wrap gap-2 justify-end">
                          {isAdmin ? (
                              <>
                                  <button onClick={handleEdit} className="p-2 bg-blue-900/40 text-blue-400 rounded-lg hover:bg-blue-900/60 transition-colors shadow-lg" title="Editar">
                                      <Edit2 size={20} />
                                  </button>
                                  <button 
                                      onClick={() => {
                                          const text = `Ficha Técnica: ${selectedFicha.name}\nFrecuencia: ${selectedFicha.frequency}\nHorario: ${selectedFicha.schedule}\nPerfil: ${selectedFicha.profile}`;
                                          openWhatsApp(text);
                                      }}
                                      className="p-2 bg-green-900/40 text-green-400 rounded-lg hover:bg-green-900/60 transition-colors shadow-lg" title="Compartir WhatsApp"
                                  >
                                      <Share2 size={20} />
                                  </button>
                                  <button onClick={() => exportFichaDoc(selectedFicha)} className="p-2 bg-amber-900/40 text-amber-400 rounded-lg hover:bg-amber-900/60 transition-colors shadow-lg" title="Descargar .docx">
                                      <Download size={20} />
                                  </button>
                                  <button 
                                      onClick={() => {
                                          if(confirm('¿Eliminar esta ficha?')) {
                                              const updated = fichas.filter(f => f.name !== selectedFicha.name);
                                              setFichas(updated);
                                              localStorage.setItem('rcm_data_fichas', JSON.stringify(updated));
                                              setSelectedFicha(null);
                                          }
                                      }}
                                      className="p-2 bg-red-900/40 text-red-400 rounded-lg hover:bg-red-900/60 transition-colors shadow-lg" title="Eliminar"
                                  >
                                      <Trash2 size={20} />
                                  </button>
                              </>
                          ) : (
                              <>
                                  <button 
                                      onClick={() => {
                                          const text = `Ficha Técnica: ${selectedFicha.name}\nFrecuencia: ${selectedFicha.frequency}\nHorario: ${selectedFicha.schedule}\nPerfil: ${selectedFicha.profile}`;
                                          openWhatsApp(text);
                                      }}
                                      className="p-2 bg-green-900/40 text-green-400 rounded-lg hover:bg-green-900/60 transition-colors shadow-lg" title="Compartir WhatsApp"
                                  >
                                      <Share2 size={20} />
                                  </button>
                                  <button onClick={() => exportFichaDoc(selectedFicha)} className="p-2 bg-amber-900/40 text-amber-400 rounded-lg hover:bg-amber-900/60 transition-colors shadow-lg" title="Descargar .docx">
                                      <Download size={20} />
                                  </button>
                              </>
                          )}
                      </div>
                  </div>
                  <div className="space-y-4">
                      {Object.keys(selectedFicha).map(k => {
                          if (k === 'sections' || k === 'times') return null;
                          return (
                              <div key={k} className="border-b border-[#9E7649]/20 pb-2">
                                  <span className="block text-xs uppercase text-[#9E7649] tracking-widest">{k}</span>
                                  <span className="text-white whitespace-pre-line">{(selectedFicha as any)[k]}</span>
                              </div>
                          );
                      })}
                      
                      {selectedFicha.times && (
                          <div className="border-b border-[#9E7649]/20 pb-2">
                              <span className="block text-xs uppercase text-[#9E7649] tracking-widest mb-2">Tiempos</span>
                              <div className="grid grid-cols-3 gap-4">
                                  <div><span className="text-[#9E7649] text-xs">Música:</span> <span className="text-white">{selectedFicha.times.music}</span></div>
                                  <div><span className="text-[#9E7649] text-xs">Información:</span> <span className="text-white">{selectedFicha.times.info}</span></div>
                                  <div><span className="text-[#9E7649] text-xs">Propaganda:</span> <span className="text-white">{selectedFicha.times.propaganda}</span></div>
                              </div>
                          </div>
                      )}

                      {selectedFicha.sections && selectedFicha.sections.length > 0 && (
                          <div className="border-b border-[#9E7649]/20 pb-2">
                              <span className="block text-xs uppercase text-[#9E7649] tracking-widest mb-2">Secciones</span>
                              <div className="space-y-3">
                                  {selectedFicha.sections.map((sec, idx) => (
                                      <div key={idx} className="bg-[#2C1B15] p-3 rounded-lg border border-[#9E7649]/20">
                                          <p className="font-bold text-white text-sm">{sec.name}</p>
                                          {sec.description && <p className="text-sm text-[#E8DCCF]/80 mt-1">{sec.description}</p>}
                                          {(sec.schedule || sec.duration) && (
                                              <p className="text-xs text-[#9E7649] mt-2">
                                                  {sec.schedule && <span>Horario: {sec.schedule}</span>}
                                                  {sec.schedule && sec.duration && <span> | </span>}
                                                  {sec.duration && <span>Duración: {sec.duration}</span>}
                                              </p>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {selectedFicha && isEditing && editForm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-[#1A100C] border border-[#9E7649]/40 p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl font-bold text-white mb-6">Editar Ficha de Programa</h2>
                  <div className="space-y-4">
                      {Object.keys(editForm).map(k => {
                          if (k === 'sections' || k === 'times') return null;
                          return (
                              <div key={k}>
                                  <label className="block text-xs uppercase text-[#9E7649] tracking-widest mb-1">{k}</label>
                                  {['objective', 'profile', 'literarySupport'].includes(k) ? (
                                      <textarea 
                                          className="w-full bg-[#2C1B15] border border-[#9E7649]/20 rounded-lg p-3 text-white h-24"
                                          value={(editForm as any)[k] as string}
                                          onChange={e => setEditForm({ ...editForm, [k]: e.target.value })}
                                      />
                                  ) : (
                                      <input 
                                          className="w-full bg-[#2C1B15] border border-[#9E7649]/20 rounded-lg p-3 text-white"
                                          type="text" 
                                          value={(editForm as any)[k] as string}
                                          onChange={e => setEditForm({ ...editForm, [k]: e.target.value })}
                                      />
                                  )}
                              </div>
                          );
                      })}
                      
                      {editForm.times && (
                          <div>
                              <h3 className="text-[#9E7649] font-bold mb-2 uppercase tracking-widest text-sm">Tiempos</h3>
                              <div className="grid grid-cols-3 gap-4">
                                  <div>
                                      <label className="block text-xs uppercase text-[#E8DCCF]/70 mb-1">Música</label>
                                      <input 
                                          className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded p-2 text-white text-sm"
                                          type="text" 
                                          value={editForm.times.music}
                                          onChange={e => handleNestedInputChange('times', 'music', e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs uppercase text-[#E8DCCF]/70 mb-1">Información</label>
                                      <input 
                                          className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded p-2 text-white text-sm"
                                          type="text" 
                                          value={editForm.times.info}
                                          onChange={e => handleNestedInputChange('times', 'info', e.target.value)}
                                      />
                                  </div>
                                  <div>
                                      <label className="block text-xs uppercase text-[#E8DCCF]/70 mb-1">Propaganda</label>
                                      <input 
                                          className="w-full bg-[#1A100C] border border-[#9E7649]/20 rounded p-2 text-white text-sm"
                                          type="text" 
                                          value={editForm.times.propaganda}
                                          onChange={e => handleNestedInputChange('times', 'propaganda', e.target.value)}
                                      />
                                  </div>
                              </div>
                          </div>
                      )}

                      <div className="mt-4">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="text-[#9E7649] font-bold uppercase tracking-widest text-sm">Secciones</h3>
                              <button 
                                  onClick={() => {
                                      const newSections = editForm.sections ? [...editForm.sections] : [];
                                      newSections.push({ name: 'Nueva Sección', description: '', schedule: '', duration: '' });
                                      setEditForm({ ...editForm, sections: newSections });
                                  }}
                                  className="text-xs bg-[#9E7649] text-white px-3 py-1 rounded hover:bg-[#8B653D]"
                              >
                                  + Añadir Sección
                              </button>
                          </div>
                          <div className="space-y-4">
                              {editForm.sections && editForm.sections.map((sec, idx) => (
                                  <div key={idx} className="bg-[#1A100C] p-4 rounded-lg border border-[#9E7649]/30 relative">
                                      <button 
                                          onClick={() => handleRemoveSection(idx)}
                                          className="absolute top-2 right-2 text-red-500 hover:text-red-400"
                                      >
                                          <X size={16} />
                                      </button>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                              <label className="block text-xs uppercase text-[#E8DCCF]/70 mb-1">Nombre</label>
                                              <input 
                                                  className="w-full bg-[#2C1B15] border border-[#9E7649]/20 rounded p-2 text-white text-sm"
                                                  type="text" 
                                                  value={sec.name}
                                                  onChange={e => handleSectionChange(idx, 'name', e.target.value)}
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-xs uppercase text-[#E8DCCF]/70 mb-1">Duración</label>
                                              <input 
                                                  className="w-full bg-[#2C1B15] border border-[#9E7649]/20 rounded p-2 text-white text-sm"
                                                  type="text" 
                                                  value={sec.duration || ''}
                                                  onChange={e => handleSectionChange(idx, 'duration', e.target.value)}
                                              />
                                          </div>
                                          <div className="md:col-span-2">
                                              <label className="block text-xs uppercase text-[#E8DCCF]/70 mb-1">Descripción</label>
                                              <textarea 
                                                  className="w-full bg-[#2C1B15] border border-[#9E7649]/20 rounded p-2 text-white text-sm h-16"
                                                  value={sec.description || ''}
                                                  onChange={e => handleSectionChange(idx, 'description', e.target.value)}
                                              />
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                  </div>
                  <div className="mt-8 flex justify-end gap-3">
                      <button onClick={() => setIsEditing(false)} className="px-6 py-3 bg-[#2C1B15] text-white rounded-xl font-bold">Cancelar</button>
                      <button onClick={handleSaveEdit} className="px-6 py-3 bg-green-900/40 text-green-400 border border-green-500/30 rounded-xl font-bold flex items-center gap-2">
                          <Save size={20} /> Guardar Cambios
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default FichasSection;
