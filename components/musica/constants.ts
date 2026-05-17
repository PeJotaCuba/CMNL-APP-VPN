import { Track } from "./types";

export const GENRES_LIST = [
    "Afrobeats", "Axé", "Bachata", "Bhangra", "Blues", "Bolero", "Bossa nova", "Canción", "Canción popular", "Chachachá", 
    "Clásica", "Country", "C-Pop", "Cumbia", "Danzón", "Fado", "Flamenco", "Folk", "Forró", "Funk", "Gospel", 
    "Highlife", "Hip-Hop/Rap", "Indie/Alternativo", "J-Pop", "Jazz", "K-Pop", "Mambo", "Mbaqanga", "Merengue", 
    "Metal", "Música árabe", "Música electrónica", "Música india (clásica)", "Ópera", "Pop", "Punk", 
    "R&B (Rhythm & Blues)", "Raï", "Reggae", "Reguetón", "Rock", "Salsa", "Samba", "Ska", "Soul", "Son", 
    "Tango", "Timba", "Trova", "World Music"
];

export const COUNTRIES_LIST = [
    "Afganistán", "Albania", "Alemania", "Andorra", "Angola", "Antigua y Barbuda", "Arabia Saudita", "Argelia", "Argentina", "Armenia", "Australia", "Austria", "Azerbaiyán", "Bahamas", "Bangladés", "Barbados", "Baréin", "Bélgica", "Belice", "Benín", "Bielorrusia", "Birmania", "Bolivia", "Bosnia y Herzegovina", "Botsuana", "Brasil", "Brunéi", "Bulgaria", "Burkina Faso", "Burundi", "Bután", "Cabo Verde", "Camboya", "Camerún", "Canadá", "Catar", "Chad", "Chile", "China", "Chipre", "Ciudad del Vaticano", "Colombia", "Comoras", "Corea del Norte", "Corea del Sur", "Costa de Marfil", "Costa Rica", "Croacia", "Cuba", "Dinamarca", "Dominica", "Ecuador", "Egipto", "El Salvador", "Emiratos Árabes Unidos", "Eritrea", "Eslovaquia", "Eslovenia", "España", "Estados Unidos", "Estonia", "Etiopía", "Filipinas", "Finlandia", "Fiyi", "Francia", "Gabón", "Gambia", "Georgia", "Ghana", "Granada", "Grecia", "Guatemala", "Guyana", "Guinea", "Guinea ecuatorial", "Guinea-Bisáu", "Haití", "Honduras", "Hungría", "India", "Indonesia", "Irak", "Irán", "Irlanda", "Islandia", "Islas Marshall", "Islas Salomón", "Israel", "Italia", "Jamaica", "Japón", "Jordania", "Kazajistán", "Kenia", "Kirguistán", "Kiribati", "Kuwait", "Laos", "Lesoto", "Letonia", "Líbano", "Liberia", "Libia", "Liechtenstein", "Lituania", "Luxemburgo", "Madagascar", "Malasia", "Malaui", "Maldivas", "Malí", "Malta", "Marruecos", "Mauricio", "Mauritania", "México", "Micronesia", "Moldavia", "Mónaco", "Mongolia", "Montenegro", "Mozambique", "Namibia", "Nauru", "Nepal", "Nicaragua", "Níger", "Nigeria", "Noruega", "Nueva Zelanda", "Omán", "Países Bajos", "Pakistán", "Palaos", "Panamá", "Papúa Nueva Guinea", "Paraguay", "Perú", "Polonia", "Portugal", "Reino Unido", "República Centroafricana", "República Checa", "República del Congo", "República Democrática del Congo", "República Dominicana", "Ruanda", "Rumanía", "Rusia", "Samoa", "San Cristóbal y Nieves", "San Marino", "San Vicente y las Granadinas", "Santa Lucía", "Santo Tomé y Príncipe", "Senegal", "Serbia", "Seychelles", "Sierra Leona", "Singapur", "Siria", "Somalia", "Sri Lanka", "Suazilandia", "Sudáfrica", "Sudán", "Sudán del Sur", "Suecia", "Suiza", "Surinam", "Tailandia", "Tanzania", "Tayikistán", "Timor Oriental", "Togo", "Tonga", "Trinidad y Tobago", "Túnez", "Turkmenistán", "Turquía", "Tuvalu", "Ucrania", "Uganda", "Uruguay", "Uzbekistán", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Yibuti", "Zambia", "Zimbabue"
];

export const parseTxtDatabase = (text: string, rootContext: string = 'Importado'): Track[] => {
  const tracks: Track[] = [];
  
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n');
  
  let currentTitle = "";
  let currentAuthor = "";
  let currentPerformer = "";
  let currentGenre = "";
  let currentAlbum = "";       
  let currentOriginalPath = ""; 
  let currentModificationDate = "";
  
  const normalizeKey = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const getRootVariations = (ctx: string) => {
      const norm = normalizeKey(ctx); 
      const noSpace = norm.replace(/\s+/g, ''); 
      return [norm, noSpace];
  };

  const saveTrack = () => {
      if (currentTitle) {
          const cleanTitle = currentTitle.trim();
          
          let rawPath = currentOriginalPath || currentAlbum;
          let finalPath = "";

          if (rawPath) {
              let cleanSegment = rawPath.replace(/\\/g, '/');
              cleanSegment = cleanSegment.replace(/^[\/\\]{2}[^\/\\]+[\/\\]/, '');
              cleanSegment = cleanSegment.replace(/^[a-zA-Z]:/, '');
              cleanSegment = cleanSegment.replace(/^[\/\s]+/, '');

              const parts = cleanSegment.split('/');
              if (parts.length > 0) {
                  const lastPart = parts[parts.length - 1];
                  const lowerLast = lastPart.toLowerCase();
                  if (lowerLast.endsWith('.mp3') || lowerLast.endsWith('.wav') || lowerLast.includes(cleanTitle.toLowerCase())) {
                      parts.pop(); 
                  }
              }
              cleanSegment = parts.join('/');
              
              const variations = getRootVariations(rootContext);
              const firstSlashIndex = cleanSegment.indexOf('/');
              
              let pathBody = cleanSegment; 
              
              if (firstSlashIndex !== -1) {
                  const firstSegment = cleanSegment.substring(0, firstSlashIndex);
                  const normFirst = normalizeKey(firstSegment);
                  
                  if (variations.some(v => normFirst.includes(v) || v.includes(normFirst))) {
                      pathBody = cleanSegment.substring(firstSlashIndex + 1);
                  }
              } else {
                  if (variations.some(v => normalizeKey(cleanSegment).includes(v))) {
                      pathBody = ""; 
                  }
              }

              if (pathBody.trim()) {
                  finalPath = `${rootContext}/${pathBody}`;
              } else {
                  finalPath = rootContext; 
              }

          } else {
              finalPath = `${rootContext}/Desconocido`;
          }

          finalPath = finalPath.split('/').map(p => p.trim()).filter(p => p).join('/');

          tracks.push({
              id: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              filename: `${cleanTitle}.mp3`,
              path: finalPath,
              size: '---',
              isVerified: true,
              metadata: {
                  title: cleanTitle,
                  author: currentAuthor || "Desconocido",
                  authorCountry: "", 
                  performer: currentPerformer || "Desconocido",
                  performerCountry: "",
                  album: currentAlbum || (finalPath.split('/').pop() || "Carpeta General"), 
                  year: "", 
                  genre: currentGenre || "",
                  modificado: currentModificationDate || ""
              }
          });
      }
      
      currentTitle = "";
      currentAuthor = "";
      currentPerformer = "";
      currentGenre = "";
      currentAlbum = "";
      currentOriginalPath = "";
      currentModificationDate = "";
  };

  for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const lowerLine = normalizeKey(line);

      if (lowerLine.startsWith('archivo #') || lowerLine.startsWith('archivo n')) {
          saveTrack(); 
          continue;
      }

      const colonIndex = line.indexOf(':');
      const content = colonIndex !== -1 ? line.substring(colonIndex + 1).trim() : "";

      if (lowerLine.startsWith('titulo')) {
          currentTitle = content;
      } 
      else if (lowerLine.startsWith('compositor') || lowerLine.startsWith('autor')) {
          currentAuthor = content;
      }
      else if (lowerLine.startsWith('interprete')) {
          currentPerformer = content;
      }
      else if (lowerLine.startsWith('genero')) {
          currentGenre = content;
      }
      else if (lowerLine.startsWith('carpeta') || lowerLine.startsWith('album')) {
          currentAlbum = content;
      }
      else if (lowerLine.startsWith('ruta')) {
          currentOriginalPath = content;
      }
      else if (lowerLine.startsWith('modificado')) {
          currentModificationDate = content;
      }
  }
  saveTrack(); 

  return tracks;
};

export const INITIAL_DB_TXT = ``;
