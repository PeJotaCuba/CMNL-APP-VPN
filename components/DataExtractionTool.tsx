import React, { useState, useEffect } from 'react';
import { Settings, Copy, Download, Play, ChevronLeft, Save, Plus, Trash2, CheckCircle2, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PowerShellCommand {
  id: string;
  name: string;
  description: string;
  command: string;
}

const DEFAULT_COMMANDS: PowerShellCommand[] = [
  {
    id: 'extract-word-todos',
    name: 'Extraer Datos de Documentos Word (Todos)',
    description: 'Extrae Programa, Fecha, Escritor, Asesor y Tema de documentos Word en la carpeta y subcarpetas.',
    command: `$w=New-Object -ComObject Word.Application;$w.Visible=$false;$out="info_docs.txt";Remove-Item $out -ErrorAction SilentlyContinue;$archivos=@(Get-ChildItem -Recurse -Include "*.doc","*.docx");$total=$archivos.Count;Write-Host "\\n📁 DOCUMENTOS ENCONTRADOS: $total" -ForegroundColor Cyan;$i=0;foreach($archivo in $archivos){$i++;$porcentaje=[math]::Round(($i/$total)*100);$restantes=$total-$i;Write-Host "\\r[ $i de $total | $porcentaje% | Faltan: $restantes ]" -NoNewline -ForegroundColor Yellow;try{$d=$w.Documents.Open($archivo.FullName,$false,$true);$t=$d.Content.Text;if($t -match '(?i)PROGRAMA\\s*:?\\s*([^\\r\\n]+)'){$prog=$matches[1].Trim()-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*:\\s*',''}else{$prog='NO ESPECIFICADO'};"Programa: $prog"|Out-File $out -Append -Enc utf8;if($t -match '(?i)FECHA\\s*:?\\s*([^\\r\\n]+)'){$fec=$matches[1].Trim()-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*:\\s*',''}else{$fec='NO ESPECIFICADA'};"Fecha: $fec"|Out-File $out -Append -Enc utf8;if($t -match '(?i)ESCRIBE\\s*:?\\s*([^\\r\\n]+)'){$esc=$matches[1].Trim()-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*:\\s*',''}elseif($t -match '(?i)ESCRITOR\\s*:?\\s*([^\\r\\n]+)'){$esc=$matches[1].Trim()-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*:\\s*',''}else{$esc='NO ESPECIFICADO'};"Escritor: $esc"|Out-File $out -Append -Enc utf8;if($t -match '(?i)ASESOR[A]?\\s*[^a-zA-Z0-9\\r\\n]*\\s*([^\\r\\n]+)'){$ase=$matches[1].Trim()-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*[^a-zA-Z0-9]+\\s*',''}else{$ase='NO ESPECIFICADO'};"Asesor: $ase"|Out-File $out -Append -Enc utf8;if($t -match '(?i)TEMA\\s*:?\\s*([^\\r\\n]+)'){$tem=$matches[1].Trim();if($tem -match '^(IO SACA|IO|LOC|\\d{2}\\sLOC|\\[)'){$tem='NO ESPECIFICADO'}else{$tem=$tem-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*:\\s*',''}}elseif($t -match '(?i)TÍTULO\\s*:?\\s*([^\\r\\n]+)'){$tem=$matches[1].Trim();if($tem -match '^(IO SACA|IO|LOC|\\d{2}\\sLOC|\\[)'){$tem='NO ESPECIFICADO'}else{$tem=$tem-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*:\\s*',''}}else{$tem='NO ESPECIFICADO'};"Tema: $tem"|Out-File $out -Append -Enc utf8;"____"|Out-File $out -Append -Enc utf8;$d.Close($false)}catch{}};Write-Host "\\n\\n✅ EXTRACCIÓN COMPLETADA" -ForegroundColor Green;Write-Host "📄 Archivo: $out" -ForegroundColor Cyan;Write-Host "📊 Documentos procesados: $total" -ForegroundColor Yellow;if(Test-Path $out){Write-Host "\\n📋 PRIMERAS LÍNEAS:" -ForegroundColor Magenta;Get-Content $out -First 15};$w.Quit();`
  },
  {
    id: 'extract-word-30dias',
    name: 'Extraer Datos de Documentos Word (Últimos 30 días)',
    description: 'Igual que el anterior pero filtrando solo documentos de los últimos 30 días.',
    command: `$dias=30;$fechaInicio=(Get-Date).AddDays(-$dias);$w=New-Object -ComObject Word.Application;$w.Visible=$false;$out="info_docs_\${dias}dias.txt";Remove-Item $out -ErrorAction SilentlyContinue;$archivos=@(Get-ChildItem -Recurse -Include "*.doc","*.docx" | Where-Object {$_.LastWriteTime -ge $fechaInicio});$total=$archivos.Count;Write-Host "\\n📅 BUSCANDO DOCUMENTOS DE LOS ÚLTIMOS $dias DÍAS" -ForegroundColor Cyan;Write-Host "📆 Desde: $($fechaInicio.ToString('dd/MM/yyyy'))" -ForegroundColor Gray;if($total -eq 0){Write-Host "No se encontraron documentos." -ForegroundColor Yellow;$w.Quit();exit};$i=0;foreach($archivo in $archivos){$i++;$porcentaje=[math]::Round(($i/$total)*100);$restantes=$total-$i;Write-Host "\\r[ $i de $total | $porcentaje% | Faltan: $restantes ]" -NoNewline -ForegroundColor Yellow;try{$d=$w.Documents.Open($archivo.FullName,$false,$true);$t=$d.Content.Text;if($t -match '(?i)PROGRAMA\\s*:?\\s*([^\\r\\n]+)'){$prog=$matches[1].Trim()-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*:\\s*',''}else{$prog='NO ESPECIFICADO'};"Programa: $prog"|Out-File $out -Append -Enc utf8;if($t -match '(?i)FECHA\\s*:?\\s*([^\\r\\n]+)'){$fec=$matches[1].Trim()-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*:\\s*',''}else{$fec='NO ESPECIFICADA'};"Fecha: $fec"|Out-File $out -Append -Enc utf8;if($t -match '(?i)ESCRIBE\\s*:?\\s*([^\\r\\n]+)'){$esc=$matches[1].Trim()-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*:\\s*',''}elseif($t -match '(?i)ESCRITOR\\s*:?\\s*([^\\r\\n]+)'){$esc=$matches[1].Trim()-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*:\\s*',''}else{$esc='NO ESPECIFICADO'};"Escritor: $esc"|Out-File $out -Append -Enc utf8;if($t -match '(?i)ASESOR[A]?\\s*[^a-zA-Z0-9\\r\\n]*\\s*([^\\r\\n]+)'){$ase=$matches[1].Trim()-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*[^a-zA-Z0-9]+\\s*',''}else{$ase='NO ESPECIFICADO'};"Asesor: $ase"|Out-File $out -Append -Enc utf8;if($t -match '(?i)TEMA\\s*:?\\s*([^\\r\\n]+)'){$tem=$matches[1].Trim();if($tem -match '^(IO SACA|IO|LOC|\\d{2}\\sLOC|\\[)'){$tem='NO ESPECIFICADO'}else{$tem=$tem-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*:\\s*',''}}elseif($t -match '(?i)TÍTULO\\s*:?\\s*([^\\r\\n]+)'){$tem=$matches[1].Trim();if($tem -match '^(IO SACA|IO|LOC|\\d{2}\\sLOC|\\[)'){$tem='NO ESPECIFICADO'}else{$tem=$tem-replace'^\\*\\*|\\*\\*$',''-replace'^\\s*:\\s*',''}}else{$tem='NO ESPECIFICADO'};"Tema: $tem"|Out-File $out -Append -Enc utf8;"____"|Out-File $out -Append -Enc utf8;$d.Close($false)}catch{}};Write-Host "\\n\\n✅ EXTRACCIÓN COMPLETADA" -ForegroundColor Green;Write-Host "📄 Archivo: $out" -ForegroundColor Cyan;Write-Host "📊 Documentos recientes: $total" -ForegroundColor Yellow;if(Test-Path $out){Write-Host "\\n📋 VISTA PREVIA:" -ForegroundColor Magenta;Get-Content $out -First 10};$w.Quit();`
  },
  {
    id: 'extract-creditos-exactos',
    name: 'Extraer Créditos Musicales Exactos',
    description: 'Encuentra compositor e intérprete de archivos MP3, WAV, WMA.',
    command: `function Find-MetadataIndices { param($folder, $item); $propiedadesBuscar = @("Título", "Compositores", "Intérpretes colaboradores", "Intérprete", "Artista", "Autor", "Composer", "Artist", "Title"); $indicesEncontrados = @{}; for ($i = 0; $i -le 300; $i++) { $nombreProp = $folder.GetDetailsOf($null, $i); if ($nombreProp -and $nombreProp.Trim() -ne "") { $valor = $folder.GetDetailsOf($item, $i); foreach ($buscar in $propiedadesBuscar) { if ($nombreProp -eq $buscar) { $indicesEncontrados[$nombreProp] = @{Indice = $i; Valor = $valor} } } } }; return $indicesEncontrados }; Write-Host "==========================================" -ForegroundColor Cyan; Write-Host "   EXTRACTOR DE CRÉDITOS MUSICALES" -ForegroundColor Yellow; Write-Host "==========================================" -ForegroundColor Cyan; $archivos = @(Get-ChildItem -Recurse -Include *.mp3, *.wav, *.wma | Where-Object { !$_.PSIsContainer }); if ($archivos.Count -eq 0) { Write-Host "No se encontraron archivos MP3, WAV o WMA." -ForegroundColor Red; return }; Write-Host "Encontrados $($archivos.Count) archivos." -ForegroundColor Green; $shell = New-Object -ComObject Shell.Application; $outputFile = "Creditos_Musicales.txt"; $rutaCompleta = Join-Path (Get-Location) $outputFile; $archivoTest = $archivos[0]; $carpetaTest = $shell.Namespace($archivoTest.DirectoryName); $itemTest = $carpetaTest.ParseName($archivoTest.Name); $indices = Find-MetadataIndices $carpetaTest $itemTest; if (-not $indices.ContainsKey("Compositores")) { $indices["Compositores"] = @{Indice = 25; Valor = ""} }; if (-not $indices.ContainsKey("Intérpretes colaboradores") -and -not $indices.ContainsKey("Intérprete")) { $indices["Intérpretes"] = @{Indice = 13; Valor = ""} }; "CRÉDITOS MUSICALES - EXTRACCIÓN EXACTA\`r\`n========================================\`r\`nTotal archivos: $($archivos.Count)\`r\`n" | Out-File $outputFile -Encoding UTF8 -Force; $contador = 0; $exitos = 0; foreach ($archivo in $archivos) { $contador++; Write-Progress -Activity "Extrayendo metadatos" -Status "$contador de $($archivos.Count)" -PercentComplete (($contador / $archivos.Count) * 100); try { $carpeta = $shell.Namespace($archivo.DirectoryName); $item = $carpeta.ParseName($archivo.Name); $titulo = ""; $compositor = ""; $interprete = ""; if ($indices.ContainsKey("Título")) { $titulo = $carpeta.GetDetailsOf($item, $indices["Título"].Indice) } else { $titulo = $carpeta.GetDetailsOf($item, 21) }; if ($indices.ContainsKey("Compositores")) { $compositor = $carpeta.GetDetailsOf($item, $indices["Compositores"].Indice) } else { $compositor = $carpeta.GetDetailsOf($item, 25); if ([string]::IsNullOrWhiteSpace($compositor)) { $compositor = $carpeta.GetDetailsOf($item, 20) }; if ([string]::IsNullOrWhiteSpace($compositor)) { $compositor = $carpeta.GetDetailsOf($item, 16) } }; if ($indices.ContainsKey("Intérpretes colaboradores")) { $interprete = $carpeta.GetDetailsOf($item, $indices["Intérpretes colaboradores"].Indice) } elseif ($indices.ContainsKey("Intérprete")) { $interprete = $carpeta.GetDetailsOf($item, $indices["Intérprete"].Indice) } else { $interprete = $carpeta.GetDetailsOf($item, 13); if ([string]::IsNullOrWhiteSpace($interprete)) { $interprete = $carpeta.GetDetailsOf($item, 20) } }; if ([string]::IsNullOrWhiteSpace($titulo)) { $titulo = $archivo.BaseName }; if ([string]::IsNullOrWhiteSpace($compositor)) { $compositor = "[No encontrado]" }; if ([string]::IsNullOrWhiteSpace($interprete)) { $interprete = "[No encontrado]" }; "Archivo #$contador\`r\`nTitulo: $titulo\`r\`nCompositor: $compositor\`r\`nInterprete: $interprete\`r\`nCarpeta: $($archivo.Directory.Name)\`r\`nRuta: $($archivo.FullName)\`r\`n" | Out-File $outputFile -Encoding UTF8 -Append; $exitos++ } catch {} }; Write-Host "PROCESO COMPLETADO. Archivo generado: $rutaCompleta" -ForegroundColor Green;`
  },
  {
    id: 'extract-creditos-7dias',
    name: 'Extraer Créditos Musicales (Últimos 7 días)',
    description: 'Extrae los metadatos de audios modificados en la última semana.',
    command: `$fechaLimite = (Get-Date).AddDays(-7); function Find-MetadataIndices { param($folder, $item); $propiedadesBuscar = @("Título", "Compositores", "Intérpretes colaboradores", "Intérprete", "Artista", "Autor", "Composer", "Artist", "Title"); $indicesEncontrados = @{}; for ($i = 0; $i -le 300; $i++) { $nombreProp = $folder.GetDetailsOf($null, $i); if ($nombreProp -and $nombreProp.Trim() -ne "") { $valor = $folder.GetDetailsOf($item, $i); foreach ($buscar in $propiedadesBuscar) { if ($nombreProp -eq $buscar) { $indicesEncontrados[$nombreProp] = @{Indice = $i; Valor = $valor} } } } }; return $indicesEncontrados }; Write-Host "EXTRACTOR DE CRÉDITOS (últimos 7 días)" -ForegroundColor Yellow; $archivos = @(Get-ChildItem -Recurse -Include *.mp3, *.wav, *.wma | Where-Object { !$_.PSIsContainer -and $_.LastWriteTime -ge $fechaLimite }); if ($archivos.Count -eq 0) { Write-Host "No se encontraron archivos." -ForegroundColor Red; return }; $shell = New-Object -ComObject Shell.Application; $outputFile = "Creditos_Recientes_7dias.txt"; $carpetaTest = $shell.Namespace($archivos[0].DirectoryName); $itemTest = $carpetaTest.ParseName($archivos[0].Name); $indices = Find-MetadataIndices $carpetaTest $itemTest; "CRÉDITOS - ARCHIVOS RECIENTES (últimos 7 días)\`r\`nTotal archivos encontrados: $($archivos.Count)\`r\`n" | Out-File $outputFile -Encoding UTF8 -Force; $contador = 0; foreach ($archivo in $archivos) { $contador++; Write-Progress -Activity "Extrayendo metadatos" -Status "$contador de $($archivos.Count)" -PercentComplete (($contador / $archivos.Count) * 100); try { $carpeta = $shell.Namespace($archivo.DirectoryName); $item = $carpeta.ParseName($archivo.Name); $titulo = ""; $compositor = ""; $interprete = ""; if ($indices.ContainsKey("Título")) { $titulo = $carpeta.GetDetailsOf($item, $indices["Título"].Indice) } else { $titulo = $carpeta.GetDetailsOf($item, 21) }; if ($indices.ContainsKey("Compositores")) { $compositor = $carpeta.GetDetailsOf($item, $indices["Compositores"].Indice) } else { $compositor = $carpeta.GetDetailsOf($item, 25) }; if ($indices.ContainsKey("Intérpretes colaboradores")) { $interprete = $carpeta.GetDetailsOf($item, $indices["Intérpretes colaboradores"].Indice) } elseif ($indices.ContainsKey("Intérprete")) { $interprete = $carpeta.GetDetailsOf($item, $indices["Intérprete"].Indice) } else { $interprete = $carpeta.GetDetailsOf($item, 13) }; if ([string]::IsNullOrWhiteSpace($titulo)) { $titulo = $archivo.BaseName }; if ([string]::IsNullOrWhiteSpace($compositor)) { $compositor = "[No encontrado]" }; if ([string]::IsNullOrWhiteSpace($interprete)) { $interprete = "[No encontrado]" }; "Archivo #$contador\`r\`nTitulo: $titulo\`r\`nCompositor: $compositor\`r\`nInterprete: $interprete\`r\`nCarpeta: $($archivo.Directory.Name)\`r\`nModificado: $($archivo.LastWriteTime.ToString('dd/MM/yyyy HH:mm'))\`r\`n" | Out-File $outputFile -Encoding UTF8 -Append; } catch {} }; Write-Host "PROCESO COMPLETADO. Archivo generado: $outputFile" -ForegroundColor Green;`
  },
  {
    id: 'listado-audios-simple',
    name: 'Listado de Audios Simple',
    description: 'Genera un archivo de texto con el nombre y ruta de todos los audios en la carpeta.',
    command: `$origen = $PWD.Path; $salida = "$origen\\listado_audios.txt"; $ext = @('*.mp3','*.wav','*.ogg','*.m4a','*.flac','*.aac','*.wma'); $archivos = Get-ChildItem -Path $origen -Recurse -Include $ext -ErrorAction SilentlyContinue; $total = $archivos.Count; if ($total -eq 0) { Write-Host 'No se encontraron audios.' -ForegroundColor Red } else { $i=1; $archivos | ForEach-Object { Write-Progress -Activity 'Procesando audios' -Status "$i de $total" -CurrentOperation $_.Name -PercentComplete (($i/$total)*100); "$i. Nombre: $($_.Name) | Ruta: $($_.FullName)"; $i++ } | Out-File $salida -Encoding utf8; Write-Progress -Activity 'Procesando audios' -Completed; Write-Host "¡Listo! Archivo guardado en: $salida" -ForegroundColor Green; Write-Host "Total: $total audios" -ForegroundColor Cyan }`
  },
  {
    id: 'renombrar-meses',
    name: 'Renombrar Subcarpetas de Meses',
    description: 'Cambia carpetas "enero" por "01-Enero", "febrero" por "02-Febrero", etc.',
    command: `$meses=@{"enero"=@{Num="01";Nombre="Enero"};"febrero"=@{Num="02";Nombre="Febrero"};"marzo"=@{Num="03";Nombre="Marzo"};"abril"=@{Num="04";Nombre="Abril"};"mayo"=@{Num="05";Nombre="Mayo"};"junio"=@{Num="06";Nombre="Junio"};"julio"=@{Num="07";Nombre="Julio"};"agosto"=@{Num="08";Nombre="Agosto"};"septiembre"=@{Num="09";Nombre="Septiembre"};"octubre"=@{Num="10";Nombre="Octubre"};"noviembre"=@{Num="11";Nombre="Noviembre"};"diciembre"=@{Num="12";Nombre="Diciembre"}}; $carpetas=Get-ChildItem -LiteralPath . -Directory -Recurse; foreach($carpeta in $carpetas){ $nom=$carpeta.Name.ToLower(); if($meses.ContainsKey($nom)){ $n=$meses[$nom].Num+"-"+$meses[$nom].Nombre; $rn=Join-Path $carpeta.Parent.FullName $n; if(-not(Test-Path -LiteralPath $rn)){ Rename-Item -LiteralPath $carpeta.FullName -NewName $n; Write-Host "Renombrado: $($carpeta.Name) -> $n" }else{ Write-Warning "Ya existe $n" } } }`
  }
];

interface Props {
  onBack: () => void;
  isAdmin: boolean;
}

const DataExtractionTool: React.FC<Props> = ({ onBack, isAdmin }) => {
  const [commands, setCommands] = useState<PowerShellCommand[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<PowerShellCommand | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('rcm_data_extraction_commands');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure new commands are loaded if using older version
        if (!parsed.some((c: PowerShellCommand) => c.id === 'extract-creditos-exactos')) {
          setCommands(DEFAULT_COMMANDS);
          localStorage.setItem('rcm_data_extraction_commands', JSON.stringify(DEFAULT_COMMANDS));
        } else {
          setCommands(parsed);
        }
      } catch (e) {
        setCommands(DEFAULT_COMMANDS);
      }
    } else {
      setCommands(DEFAULT_COMMANDS);
    }
  }, []);

  const saveCommands = (newCommands: PowerShellCommand[]) => {
    setCommands(newCommands);
    localStorage.setItem('rcm_data_extraction_commands', JSON.stringify(newCommands));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadExecutable = async (cmd: PowerShellCommand) => {
    // Escapa el código para inyectarlo de forma segura usando Base64
    const encodeBase64Unicode = (str: string) => {
      return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        (match, p1) => String.fromCharCode(Number('0x' + p1))
      ));
    };

    const psContent = `Write-Host "Ejecutando en: $PWD" -ForegroundColor Cyan
${cmd.command}
Write-Host ""
Write-Host "Automatizacion finalizada exitosamente." -ForegroundColor Green`;

    const b64 = encodeBase64Unicode(psContent);

    // Creamos un archivo batch (.bat) que asegura la ejecución en su propia carpeta usando pushd "%~dp0"
    const batContent = `@echo off
chcp 65001 >nul
title ${cmd.name} - RCM
pushd "%~dp0"
echo Iniciando automatizacion...
echo Ruta actual: %CD%
powershell -NoProfile -ExecutionPolicy Bypass -Command "$s=[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64}')); Invoke-Expression $s"
popd
echo.
pause
`;

    const defaultFileName = `RCM_${cmd.name.replace(/[^a-zA-Z0-9]/g, '_')}.bat`;

    const downloadFallback = () => {
      const element = document.createElement("a");
      const file = new Blob([batContent], {type: 'application/bat'});
      element.href = URL.createObjectURL(file);
      element.download = defaultFileName;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
    };

    try {
      // Avoid showSaveFilePicker in iframes (like the preview) due to security restrictions
      if ('showSaveFilePicker' in window && window.self === window.top) {
        // Usa la API para que el usuario elija exactamente la carpeta de destino
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: defaultFileName,
          types: [{
            description: 'Archivo por lotes (Windows)',
            accept: {'application/bat': ['.bat']},
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(batContent);
        await writable.close();
        alert('Archivo guardado. Ve a la carpeta donde lo guardaste y ábrelo (doble clic) para ejecutar la automatización allí mismo.');
      } else {
        // Fallback clásico
        downloadFallback();
        alert('El archivo se ha descargado. Muévelo a la carpeta deseada y ábrelo (doble clic) para ejecutarlo allí mismo.');
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        downloadFallback();
        alert('El archivo se ha descargado. Muévelo a la carpeta deseada y ábrelo (doble clic) para ejecutarlo allí mismo.');
      } else {
        console.log('Descarga cancelada por el usuario');
      }
    }
  };

  const handleSaveEdit = () => {
    if (editingCommand) {
      if (!editingCommand.id) {
        // New Command
        const newCmd = { ...editingCommand, id: Date.now().toString() };
        saveCommands([...commands, newCmd]);
      } else {
        // Update
        saveCommands(commands.map(c => c.id === editingCommand.id ? editingCommand : c));
      }
      setEditingCommand(null);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar este comando?')) {
      saveCommands(commands.filter(c => c.id !== id));
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-stone-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Volver a Herramientas</span>
        </button>

        {isAdmin && (
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isSettingsOpen ? 'bg-amber-500 text-black' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
            }`}
          >
            <Settings size={18} />
            <span>Ajustes</span>
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isSettingsOpen && isAdmin ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-serif text-amber-500">Ajustes de Comandos</h2>
              <button 
                onClick={() => setEditingCommand({ id: '', name: '', description: '', command: '' })}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm font-medium"
              >
                <Plus size={16} />
                <span>Nuevo Comando</span>
              </button>
            </div>

            {editingCommand && (
              <div className="p-6 bg-[#2A1810] border border-amber-500/30 rounded-xl space-y-4">
                <h3 className="text-white font-medium">{editingCommand.id ? 'Editar Script' : 'Nuevo Script PowerShell'}</h3>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1">Nombre</label>
                  <input 
                    type="text" 
                    value={editingCommand.name}
                    onChange={e => setEditingCommand({...editingCommand, name: e.target.value})}
                    className="w-full bg-black/40 border border-stone-700 rounded-lg p-2 text-white outline-none focus:border-amber-500"
                    placeholder="Ej. Extraer Nombres de Audios"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1">Descripción</label>
                  <input 
                    type="text" 
                    value={editingCommand.description}
                    onChange={e => setEditingCommand({...editingCommand, description: e.target.value})}
                    className="w-full bg-black/40 border border-stone-700 rounded-lg p-2 text-white outline-none focus:border-amber-500"
                    placeholder="Describe qué hace este script"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-stone-400 mb-1">Comando PowerShell</label>
                  <textarea 
                    value={editingCommand.command}
                    onChange={e => setEditingCommand({...editingCommand, command: e.target.value})}
                    className="w-full bg-black/60 border border-stone-700 rounded-lg p-3 text-cyan-400 font-mono text-sm h-32 outline-none focus:border-amber-500"
                    placeholder="Get-ChildItem..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    onClick={() => setEditingCommand(null)}
                    className="px-4 py-2 text-sm font-medium text-stone-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveEdit}
                    disabled={!editingCommand.name || !editingCommand.command}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-medium hover:bg-amber-400 disabled:opacity-50"
                  >
                    <Save size={16} />
                    <span>Guardar Comandos</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4">
              {commands.map(cmd => (
                <div key={cmd.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4">
                  <div className="flex-1">
                    <h3 className="text-white font-medium text-lg">{cmd.name}</h3>
                    <p className="text-stone-400 text-sm mt-1">{cmd.description}</p>
                    <div className="mt-3 bg-black/50 p-3 rounded-lg border border-white/5 font-mono text-xs text-cyan-500 line-clamp-2">
                      {cmd.command}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 justify-center">
                    <button 
                      onClick={() => setEditingCommand(cmd)}
                      className="p-2 text-stone-400 hover:text-white bg-white/5 rounded-lg transition-colors"
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(cmd.id)}
                      className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {commands.length === 0 && (
                <div className="text-center py-8 text-stone-500">
                  No hay comandos configurados. Añade uno nuevo.
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-4">
              <Terminal className="text-blue-400 shrink-0 mt-1" />
              <div className="text-sm text-stone-300">
                <p className="text-blue-200 font-medium mb-1">Módulo de Extracción de Datos (PowerShell)</p>
                <p>Usa estas herramientas para procesar tus archivos localmente en Windows. <strong>Por motivos de seguridad del navegador, no es posible ejecutar herramientas locales automáticamente.</strong> Sin embargo, lo hemos simplificado: al hacer clic en <strong>Descargar y Ejecutar</strong>, podrás elegir la carpeta donde quieres procesar tus archivos y guardar el <code>.bat</code> directamente ahí. Simplemente ve a la carpeta y haz doble clic en el archivo para que la automatización se ejecute al instante en esa ruta.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {commands.map(cmd => (
                <div key={cmd.id} className="bg-stone-900 border border-stone-800 rounded-xl p-5 hover:border-stone-700 transition-colors flex flex-col h-full">
                  <h3 className="text-white font-bold text-lg mb-2">{cmd.name}</h3>
                  <p className="text-stone-400 text-sm mb-4 flex-1">{cmd.description}</p>
                  
                  <div className="flex gap-2 mt-auto">
                    <button 
                      onClick={() => handleDownloadExecutable(cmd)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-sm font-bold transition-colors"
                    >
                      <Play size={16} />
                      <span>Descargar y Ejecutar</span>
                    </button>
                    <button 
                      onClick={() => handleCopy(cmd.id, cmd.command)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-sm font-medium transition-colors"
                    >
                      {copiedId === cmd.id ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          <span>Copiar PS</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {commands.length === 0 && (
                <div className="col-span-full py-12 text-center text-stone-500">
                  El administrador aún no ha configurado comandos de extracción de datos.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataExtractionTool;
