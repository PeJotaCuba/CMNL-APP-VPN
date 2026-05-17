import React, { useState, useEffect } from 'react';
import { Track, User, DEFAULT_PROGRAMS_LIST } from './types';
import { openWhatsApp } from '../../utils/whatsappUtils';
import * as XLSX from 'xlsx';

const PROGRAMS_KEY = 'rcm_programs_list';

interface SettingsProps {
  tracks: Track[];
  users: User[];
  onAddUser: (u: User) => void;
  onEditUser: (u: User, originalUsername?: string) => void;
  onDeleteUser: (username: string) => void;
  onExportUsers: () => void;
  onImportUsers: (users: User[]) => void;
  currentUser?: User | null;
}

const Settings: React.FC<SettingsProps> = ({ tracks, users, onAddUser, onEditUser, onDeleteUser, onExportUsers, onImportUsers, currentUser }) => {
  const [programs, setPrograms] = useState<string[]>(() => {
      const saved = localStorage.getItem(PROGRAMS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PROGRAMS_LIST;
  });
  const [newProgram, setNewProgram] = useState('');

  useEffect(() => {
      localStorage.setItem(PROGRAMS_KEY, JSON.stringify(programs));
  }, [programs]);

  const addProgram = () => {
      if (newProgram && !programs.includes(newProgram)) {
          setPrograms([...programs, newProgram]);
          setNewProgram('');
      }
  };

  const removeProgram = (program: string) => {
      setPrograms(programs.filter(p => p !== program));
  };

  const moveProgram = (index: number, direction: 'up' | 'down') => {
      const newPrograms = [...programs];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < newPrograms.length) {
          [newPrograms[index], newPrograms[targetIndex]] = [newPrograms[targetIndex], newPrograms[index]];
          setPrograms(newPrograms);
      }
  };

  const [formData, setFormData] = useState({
      username: '',
      fullName: '',
      phone: '',
      password: '',
      confirmPassword: '',
      uniqueId: '',
      role: 'user' as 'user' | 'director' | 'admin'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [originalUsername, setOriginalUsername] = useState('');

  const generateUniqueId = (name: string) => {
      const firstName = name ? name.split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase() : 'USR';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const generateBlock = () => {
          let block = '';
          for (let i = 0; i < 4; i++) block += chars.charAt(Math.floor(Math.random() * chars.length));
          return block;
      };
      return `${firstName}-${generateBlock()}-${generateBlock()}-${generateBlock()}`;
  };

  const downloadCreditStats = () => {
      const dataTracks = tracks; 
      if (dataTracks.length === 0) {
          alert("No hay pistas en la base de datos.");
          return;
      }
      const totalTracks = dataTracks.length;
      const countUnique = (field: keyof typeof dataTracks[0]['metadata']) => {
          const s = new Set<string>();
          dataTracks.forEach(t => { if (t.metadata[field] && t.metadata[field] !== 'Desconocido') s.add(t.metadata[field] as string); });
          return s.size;
      };
      const totalAuthors = countUnique('author');
      const totalPerformers = countUnique('performer');
      const getDistribution = (field: keyof typeof dataTracks[0]['metadata']) => {
          const counts: Record<string, number> = {};
          dataTracks.forEach(t => {
              const val = (t.metadata[field] as string) || 'Sin Especificar';
              counts[val] = (counts[val] || 0) + 1;
          });
          return Object.entries(counts).sort((a,b) => b[1] - a[1]);
      };
      const genres = getDistribution('genre');
      const authorCountries = getDistribution('authorCountry');
      const performerCountries = getDistribution('performerCountry');

      const sheet1Rows: any[] = [];
      sheet1Rows.push(["REPORTE GENERAL DE ESTADÍSTICAS RCM"]);
      sheet1Rows.push([""]);
      sheet1Rows.push(["TOTALES"]);
      sheet1Rows.push(["Cantidad de Temas Musicales", totalTracks]);
      sheet1Rows.push(["Cantidad de Autores Únicos", totalAuthors]);
      sheet1Rows.push(["Cantidad de Intérpretes Únicos", totalPerformers]);
      sheet1Rows.push([""]);
      const addSection = (title: string, data: [string, number][], header1: string) => {
          sheet1Rows.push([title]);
          sheet1Rows.push([header1, "Cantidad"]);
          data.forEach(([key, val]) => sheet1Rows.push([key, val]));
          sheet1Rows.push([""]);
      };
      addSection("GÉNEROS MUSICALES", genres, "Género");
      addSection("PAÍSES DE AUTORES", authorCountries, "País");
      addSection("PAÍSES DE INTÉRPRETES", performerCountries, "País");
      const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
      const detailData = dataTracks.map(t => ({ Título: t.metadata.title, Autor: t.metadata.author, Intérprete: t.metadata.performer, Ruta: t.path }));
      const ws2 = XLSX.utils.json_to_sheet(detailData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, ws1, "Estadísticas");
      XLSX.utils.book_append_sheet(workbook, ws2, "Detalle de Temas");
      XLSX.writeFile(workbook, "RCM_Reporte_Completo.xlsx");
  };

  const handleResetForm = () => {
      setFormData({ username: '', fullName: '', phone: '', password: '', confirmPassword: '', uniqueId: '', role: 'user' });
      setIsEditing(false); setShowUserModal(false); setOriginalUsername('');
  };

  const handleOpenCreate = () => { handleResetForm(); setShowUserModal(true); };

  const handleEditClick = (user: User) => {
      setFormData({ username: user.username, fullName: user.fullName || '', phone: user.phone || '', password: user.password || '', confirmPassword: user.password || '', uniqueId: user.uniqueId || '', role: user.role });
      setOriginalUsername(user.username); setIsEditing(true); setShowUserModal(true);
  };

  const handleSubmitUser = () => {
      if (!formData.username || !formData.password || !formData.fullName) { return alert("Todos los campos marcados son obligatorios."); }
      if (formData.password !== formData.confirmPassword) { return alert("Los PINs no coinciden."); }
      if (!/^\d{4}$/.test(formData.password)) { return alert("El PIN debe ser exactamente de 4 dígitos numéricos."); }
      
      if ((!isEditing || formData.username !== originalUsername) && users.some(u => u.username === formData.username)) { return alert("El nombre de usuario ya existe."); }
      const finalUniqueId = formData.uniqueId.trim() || generateUniqueId(formData.fullName);
      const userObj: User = { username: formData.username, password: formData.password, role: formData.role, fullName: formData.fullName, phone: formData.phone, uniqueId: finalUniqueId };
      if (isEditing) { onEditUser(userObj, originalUsername); alert("Usuario actualizado correctamente."); } else { onAddUser(userObj); alert(`Usuario creado correctamente.`); }
      handleResetForm();
  };

  const handleDeleteConfirm = (username: string) => {
      if (window.confirm(`¿ADVERTENCIA: Estás a punto de eliminar al usuario "${username}"?\n\nEsta acción eliminará su acceso y no se puede deshacer.\n¿Continuar?`)) {
          onDeleteUser(username);
      }
  };

  const handleGenerateID = () => { const newId = generateUniqueId(formData.fullName); setFormData({...formData, uniqueId: newId}); };

  const handleTxtUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string; if (!text) return;
          const lines = text.split('\n'); const newUsers: User[] = []; let current: Partial<User> = { role: 'user' };
          const saveCurrent = () => { if (current.username && current.password && current.fullName) { if(!current.phone) current.phone = ''; if(!current.uniqueId) current.uniqueId = generateUniqueId(current.fullName); newUsers.push(current as User); } };
          lines.forEach(line => { const l = line.trim(); if (l.toLowerCase().startsWith('nombre:')) { saveCurrent(); current = { role: 'user', fullName: l.substring(7).trim() }; } else if (l.toLowerCase().startsWith('móvil:') || l.toLowerCase().startsWith('movil:')) { current.phone = l.substring(6).trim(); } else if (l.toLowerCase().startsWith('usuario:')) { current.username = l.substring(8).trim(); } else if (l.toLowerCase().startsWith('contraseña:') || l.toLowerCase().startsWith('contrasena:')) { current.password = l.substring(11).trim(); } });
          saveCurrent();
          if (newUsers.length > 0) { onImportUsers(newUsers); } else { alert("No se encontraron usuarios válidos."); }
          e.target.value = '';
      };
      reader.readAsText(file);
  };

  const handleShareWhatsApp = (u: User) => {
      if (!u.phone) { return alert("Este usuario no tiene número de móvil registrado."); }
      const message = `Saludos. Tus credenciales APP-RCM son\nUsuario: ${u.username}\nPIN: ${u.password}\n\nDisfruta de nuestras apps en los siguientes enlaces:\nAgenda https://rcmagenda.vercel.app/#/home\nMúsica https://rcm-musica.vercel.app/`;
      openWhatsApp(message, u.phone);
  };

  const getRoleLabel = (role: string) => {
      if (role === 'admin') return 'Coordinador';
      if (role === 'director') return 'Director';
      return 'Usuario';
  };

  const canDelete = (u: User) => {
      if (u.username === 'admin') return false;
      if (currentUser && u.username === currentUser.username) return false;
      return true;
  };

  const handlePinInput = (e: React.ChangeEvent<HTMLInputElement>, field: 'password' | 'confirmPassword') => {
      const val = e.target.value;
      if (/^\d{0,4}$/.test(val)) {
          setFormData({...formData, [field]: val});
      }
  };

  return (
    <div className="flex flex-col h-full bg-[#1A100C] p-6 overflow-y-auto pb-24">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#9E7649]">settings</span>
            Ajustes del Sistema
        </h2>

        <div className="mb-8 p-6 bg-[#2C1B15] rounded-2xl shadow-sm border border-[#9E7649]/20">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Base de Datos Musical</h3>
                <span className="bg-[#9E7649]/10 text-[#9E7649] px-3 py-1 rounded-full text-xs font-bold">{tracks.length} Pistas</span>
            </div>
            <button onClick={downloadCreditStats} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors w-full sm:w-auto justify-center">
                <span className="material-symbols-outlined">table_view</span> Descargar Reporte Excel
            </button>
        </div>

        {currentUser?.role === 'admin' && (
        <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#9E7649]">group</span> Gestión de Usuarios
                </h3>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button onClick={handleOpenCreate} className="bg-[#9E7649] hover:bg-[#8B653D] text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm flex-1 sm:flex-none">
                        <span className="material-symbols-outlined text-lg">person_add</span> Nuevo
                    </button>
                    <button onClick={onExportUsers} className="bg-[#1A100C] text-[#E8DCCF]/80 hover:text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm border border-[#9E7649]/20">
                        <span className="material-symbols-outlined text-lg">download</span>
                    </button>
                    <label className="bg-[#1A100C] text-[#E8DCCF]/80 hover:text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm border border-[#9E7649]/20 cursor-pointer">
                        <span className="material-symbols-outlined text-lg">upload</span>
                        <input type="file" accept=".txt" onChange={handleTxtUpload} className="hidden" />
                    </label>
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {users.map(user => (
                    <div key={user.username} className="bg-[#2C1B15] p-4 rounded-xl border border-[#9E7649]/20 shadow-sm hover:border-[#9E7649]/50 transition-all relative group">
                        <div className="flex items-start justify-between mb-2">
                            <div className={`size-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${user.role === 'admin' ? 'bg-[#9E7649]' : (user.role === 'director' ? 'bg-green-600' : 'bg-blue-600')}`}>
                                {user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${user.role === 'admin' ? 'bg-orange-900/30 text-orange-400' : 'bg-[#1A100C] text-[#E8DCCF]/60'}`}>
                                {getRoleLabel(user.role)}
                            </span>
                        </div>
                        
                        <h4 className="font-bold text-white truncate">{user.fullName}</h4>
                        <p className="text-xs text-[#E8DCCF]/60 mb-1">@{user.username}</p>
                        {user.phone && <p className="text-xs text-[#E8DCCF]/40 flex items-center gap-1 mb-3"><span className="material-symbols-outlined text-[14px]">call</span> {user.phone}</p>}
                        
                        <div className="flex gap-2 mt-2 pt-2 border-t border-[#9E7649]/10">
                            <button onClick={() => handleEditClick(user)} className="flex-1 py-1.5 rounded bg-[#1A100C] text-xs font-bold text-[#E8DCCF]/80 hover:text-white flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-sm">edit</span> Editar
                            </button>
                            {user.phone && (
                                <button onClick={() => handleShareWhatsApp(user)} className="size-7 flex items-center justify-center rounded bg-green-900/20 text-green-500 hover:bg-green-900/40 border border-green-500/20" title="WhatsApp">
                                    <span className="material-symbols-outlined text-sm">chat</span>
                                </button>
                            )}
                            {canDelete(user) && (
                                <button onClick={() => handleDeleteConfirm(user.username)} className="size-7 flex items-center justify-center rounded bg-red-900/20 text-red-500 hover:bg-red-900/40 border border-red-500/20" title="Eliminar">
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
        )}

        {showUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={handleResetForm}>
                <div className="w-full max-w-md bg-[#2C1B15] rounded-2xl shadow-2xl overflow-hidden border border-[#9E7649]/30" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-[#9E7649]/20 flex justify-between items-center bg-[#1A100C]">
                        <h3 className="font-bold text-white">{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                        <button onClick={handleResetForm} className="text-[#E8DCCF]/40 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                    </div>
                    
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div><label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">Nombre Completo *</label><input className="w-full p-2.5 rounded-lg border border-[#9E7649]/30 bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Ej: Juan Pérez"/></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">Usuario *</label><input className="w-full p-2.5 rounded-lg border border-[#9E7649]/30 bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="usuario123"/></div>
                            <div><label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">Teléfono</label><input className="w-full p-2.5 rounded-lg border border-[#9E7649]/30 bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="55555555"/></div>
                        </div>
                        <div><label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">Rol</label><div className="flex gap-2">{['user', 'director', 'admin'].map(r => (<button key={r} type="button" onClick={() => setFormData({...formData, role: r as any})} className={`flex-1 py-2 text-xs font-bold rounded-lg uppercase border ${formData.role === r ? 'bg-[#9E7649] text-white border-[#9E7649]' : 'bg-[#1A100C] text-[#E8DCCF]/60 border-[#9E7649]/30'}`}>{getRoleLabel(r)}</button>))}</div></div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">PIN (4 Dígitos) *</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        className="w-full p-2.5 rounded-lg border border-[#9E7649]/30 bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649] pr-8 font-mono tracking-widest" 
                                        value={formData.password} 
                                        onChange={(e) => handlePinInput(e, 'password')} 
                                        placeholder="0000"
                                    />
                                    <button onClick={() => setShowPassword(!showPassword)} type="button" className="absolute right-0 top-0 h-full px-3 text-[#E8DCCF]/40 flex items-center justify-center hover:text-white"><span className="material-symbols-outlined text-sm">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
                                </div>
                            </div>
                             <div>
                                <label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">Confirmar PIN *</label>
                                <input 
                                    type="password" 
                                    className="w-full p-2.5 rounded-lg border border-[#9E7649]/30 bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649] font-mono tracking-widest" 
                                    value={formData.confirmPassword} 
                                    onChange={(e) => handlePinInput(e, 'confirmPassword')} 
                                    placeholder="0000"
                                />
                             </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[#E8DCCF]/60 block mb-1">ID Firma Digital</label>
                            <div className="flex gap-2">
                                <input className="flex-1 p-2.5 rounded-lg border border-[#9E7649]/30 bg-[#1A100C] text-xs font-mono text-[#E8DCCF]/60" value={formData.uniqueId} readOnly placeholder="Generado autom." />
                                <button onClick={handleGenerateID} type="button" className="bg-[#1A100C] border border-[#9E7649]/30 px-3 rounded-lg text-[#E8DCCF]/60 hover:text-white"><span className="material-symbols-outlined text-sm">refresh</span></button>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 bg-[#1A100C] flex gap-3 border-t border-[#9E7649]/20">
                        <button onClick={handleResetForm} className="flex-1 py-3 bg-[#2C1B15] border border-[#9E7649]/30 rounded-xl font-bold text-[#E8DCCF]/80 text-sm hover:text-white">Cancelar</button>
                        <button onClick={handleSubmitUser} className="flex-1 py-3 bg-[#9E7649] text-white rounded-xl font-bold text-sm shadow-lg hover:bg-[#8B653D]">{isEditing ? 'Guardar Cambios' : 'Crear Usuario'}</button>
                    </div>
                </div>
            </div>
        )}

        <div className="mt-8 p-6 bg-[#2C1B15] rounded-2xl border border-[#9E7649]/20">
            <h3 className="font-bold text-white mb-4">Gestión de Programas</h3>
            <div className="flex gap-2 mb-4">
                <input 
                    className="flex-1 p-2.5 rounded-lg border border-[#9E7649]/30 bg-[#1A100C] text-white text-sm outline-none focus:border-[#9E7649]" 
                    value={newProgram} 
                    onChange={e => setNewProgram(e.target.value)} 
                    placeholder="Nombre del nuevo programa"
                />
                <button onClick={addProgram} className="px-4 py-2 bg-[#9E7649] text-white rounded-lg font-bold text-sm hover:bg-[#8B653D]">Agregar</button>
            </div>
            <div className="space-y-2">
                {programs.map((program, index) => (
                    <div key={program} className="flex items-center gap-2 p-2 bg-[#1A100C] rounded-lg border border-[#9E7649]/20">
                        <span className="flex-1 text-sm text-white">{program}</span>
                        <button onClick={() => moveProgram(index, 'up')} className="p-1 text-[#E8DCCF]/60 hover:text-white"><span className="material-symbols-outlined text-sm">arrow_upward</span></button>
                        <button onClick={() => moveProgram(index, 'down')} className="p-1 text-[#E8DCCF]/60 hover:text-white"><span className="material-symbols-outlined text-sm">arrow_downward</span></button>
                        <button onClick={() => removeProgram(program)} className="p-1 text-red-500 hover:text-red-400"><span className="material-symbols-outlined text-sm">delete</span></button>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};

export default Settings;
