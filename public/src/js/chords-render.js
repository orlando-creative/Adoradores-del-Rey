import { transposeChord } from './transpose.js';

export function renderSong(lyricsWithChords, semitones = 0) {
    if (!lyricsWithChords) return '';

    const lines = lyricsWithChords.split('\n');
    let html = '';
    
    // Regex para detectar títulos de sección (Coro, Estribillo, Puente, etc.)
    const sectionHeaderRegex = /^\s*(\(?(verso|verse|coro|chorus|estribillo|puente|bridge|intro|outro|solo|estrofa|pre-coro|pre-chorus)\b.*)/i;

    lines.forEach(line => {
        // 1. Si es un título de sección, renderizar con estilo especial
        if (sectionHeaderRegex.test(line)) {
            html += `<div class="section-header">${line.replace(/[\(\)]/g, '')}</div>`;
            return;
        }

        // 2. Si es línea vacía
        if (!line.trim()) {
            html += '<div class="line-wrapper" style="min-height: 1em;">&nbsp;</div>';
            return;
        }

        const parts = line.split(/(\[[^\]]+\])/g);
        
        // Detectar si la línea es instrumental (solo acordes, sin letra)
        const hasLyricsText = parts.some((part, index) => index % 2 === 0 && part.trim().length > 0);
        const isInstrumental = !hasLyricsText;
        // Reducir espacio si es instrumental para que no ocupe tanto
        const wrapperStyle = isInstrumental ? 'margin-bottom: 2px; line-height: 1.1;' : 'margin-bottom: 6px; line-height: 1.2;';
        let lineHtml = `<div class="line-wrapper" style="${wrapperStyle}">`;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.startsWith('[') && part.endsWith(']')) {
                let chord = part.slice(1, -1);
                let transposed = transposeChord(chord, semitones);
                
                // Buscar el texto asociado a este acorde (siguiente parte)
                let text = null;
                if (i + 1 < parts.length && !parts[i+1].startsWith('[')) {
                    text = parts[i+1];
                    i++; // Saltamos la parte de texto ya que la consumimos aquí
                }
                
                // Si es instrumental, no usar &nbsp; para que no ocupe espacio vertical extra
                const emptyLyricContent = isInstrumental ? '' : '&nbsp;';

                if (text) {
                    // Tokenizar por espacios para permitir wrapping en móviles
                    const tokens = text.split(/(\s+)/);
                    // Identificar si hay palabras reales
                    const hasWords = tokens.some(t => t.trim().length > 0);

                    if (hasWords) {
                        let chordAssigned = false;
                        tokens.forEach(token => {
                            if (/^\s+$/.test(token)) {
                                lineHtml += token; // Mantiene los espacios originales
                            } else if (token) {
                                // Asignar el acorde a la primera palabra encontrada
                                const currentChord = !chordAssigned ? transposed : '&nbsp;';
                                // Estilo CifraClub: Acorde naranja, negrita, apilado sobre la letra
                                lineHtml += `<span class="chord-word" style="display: inline-flex; flex-direction: column; vertical-align: bottom; margin-right: 1px;"><span class="chord" style="font-weight: bold; color: #eb5e00; font-size: 0.95em; margin-bottom: -1px;">${currentChord}</span><span class="lyrics">${token}</span></span>`;
                                chordAssigned = true;
                            }
                        });
                    } else {
                        // Solo espacios o texto vacío (ej: [C]  [D])
                        lineHtml += `<span class="chord-word" style="display: inline-flex; flex-direction: column; vertical-align: bottom; margin-right: 2px;"><span class="chord" style="font-weight: bold; color: #eb5e00; font-size: 0.95em; margin-bottom: -1px;">${transposed}</span><span class="lyrics">${emptyLyricContent}</span></span>` + text;
                    }
                } else {
                    // Sin texto (ej: [C][D])
                    lineHtml += `<span class="chord-word" style="display: inline-flex; flex-direction: column; vertical-align: bottom; margin-right: 2px;"><span class="chord" style="font-weight: bold; color: #eb5e00; font-size: 0.95em; margin-bottom: -1px;">${transposed}</span><span class="lyrics">${emptyLyricContent}</span></span>`;
                }
            } else {
                if (part) {
                    // Texto sin acorde previo. Tokenizar también para wrapping.
                    const tokens = part.split(/(\s+)/);
                    tokens.forEach(token => {
                        if (/^\s+$/.test(token)) {
                            lineHtml += token;
                        } else if (token) {
                            // Texto sin acorde: renderizar simple para ahorrar espacio vertical (cabalito)
                            lineHtml += `<span class="lyrics">${token}</span>`;
                        }
                    });
                }
            }
        }
        html += lineHtml + '</div>';
    });
    return html;
}