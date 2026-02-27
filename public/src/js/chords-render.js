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
            html += '<div class="line-wrapper">&nbsp;</div>';
            return;
        }

        const parts = line.split(/(\[[^\]]+\])/g);
        let lineHtml = '<div class="line-wrapper">';
        
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
                
                if (text) {
                    // Tokenizar por espacios para permitir wrapping en móviles
                    const tokens = text.split(/(\s+)/);
                    // Identificar si hay palabras reales
                    const hasWords = tokens.some(t => t.trim().length > 0);

                    if (hasWords) {
                        let chordAssigned = false;
                        tokens.forEach(token => {
                            if (/^\s+$/.test(token)) {
                                lineHtml += token; // Espacios reales para permitir wrap
                            } else if (token) {
                                // Asignar el acorde a la primera palabra encontrada
                                const currentChord = !chordAssigned ? transposed : '&nbsp;';
                                lineHtml += `<span class="chord-word"><span class="chord">${currentChord}</span><span class="lyrics">${token}</span></span>`;
                                chordAssigned = true;
                            }
                        });
                    } else {
                        // Solo espacios o texto vacío (ej: [C]  [D])
                        lineHtml += `<span class="chord-word"><span class="chord">${transposed}</span><span class="lyrics">&nbsp;</span></span>` + text;
                    }
                } else {
                    // Sin texto (ej: [C][D])
                    lineHtml += `<span class="chord-word"><span class="chord">${transposed}</span><span class="lyrics">&nbsp;</span></span>`;
                }
            } else {
                if (part) {
                    // Texto sin acorde previo. Tokenizar también para wrapping.
                    const tokens = part.split(/(\s+)/);
                    tokens.forEach(token => {
                        if (/^\s+$/.test(token)) {
                            lineHtml += token;
                        } else if (token) {
                            lineHtml += `<span class="chord-word"><span class="chord">&nbsp;</span><span class="lyrics">${token}</span></span>`;
                        }
                    });
                }
            }
        }
        html += lineHtml + '</div>';
    });
    return html;
}