import { transposeChord } from './transpose.js';

export function renderSong(lyricsWithChords, semitones = 0) {
    if (!lyricsWithChords) return '';

    const lines = lyricsWithChords.split('\n');
    let html = '';
    
    // Regex para detectar títulos de sección
    const sectionHeaderRegex = /^\s*(\(?(verso|verse|coro|chorus|estribillo|puente|bridge|intro|outro|solo|estrofa|pre-coro|pre-chorus)\b.*)/i;
    let inChorus = false;

    lines.forEach(line => {
        // 1. Título de sección
        if (sectionHeaderRegex.test(line)) {
            const lowerLine = line.toLowerCase();
            const isThisSectionAChorus = lowerLine.includes('coro') || lowerLine.includes('chorus') || lowerLine.includes('estribillo');
            inChorus = isThisSectionAChorus;

            let headerContent = line.trim();
            if (isThisSectionAChorus) {
                headerContent = headerContent.replace(/(coro|chorus|estribillo)/i, '<strong>$1</strong>');
            }
            html += `<div class="section-header">${headerContent}</div>`;
            return;
        }

        // 2. Línea vacía
        if (!line.trim()) {
            inChorus = false;
            html += '<div class="line-wrapper" style="min-height:1.2em">&nbsp;</div>';
            return;
        }

        const parts = line.split(/(\[[^\]]+\])/g);
        
        // ¿Línea instrumental? (solo acordes, sin letra)
        const hasLyricsText = parts.some((part, idx) => idx % 2 === 0 && part.trim().length > 0);
        const isInstrumental = !hasLyricsText;

        let lineHtml = `<div class="line-wrapper${inChorus ? ' chorus-line' : ''}">`;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part.startsWith('[') && part.endsWith(']')) {
                let chord = part.slice(1, -1);
                let transposed = transposeChord(chord, semitones);
                
                // ¿Qué texto sigue a este acorde?
                let text = null;
                if (i + 1 < parts.length && !parts[i+1].startsWith('[')) {
                    text = parts[i + 1];
                    i++; // consumimos la parte de texto
                }
                
                const emptyLyric = isInstrumental ? '' : '\u00a0'; // &nbsp; solo si hay letra en la línea

                if (text) {
                    const tokens = text.split(/(\s+)/);
                    const hasWords = tokens.some(t => t.trim().length > 0);

                    if (hasWords) {
                        let chordAssigned = false;
                        tokens.forEach(token => {
                            if (/^\s+$/.test(token)) {
                                // Preservar espacios entre palabras con un span de lyrics
                                lineHtml += `<span class="chord-word"><span class="chord">&nbsp;</span><span class="lyrics">${token}</span></span>`;
                            } else if (token) {
                                const currentChord = !chordAssigned ? transposed : '\u00a0';
                                lineHtml += `<span class="chord-word"><span class="chord">${currentChord}</span><span class="lyrics">${token}</span></span>`;
                                chordAssigned = true;
                            }
                        });
                    } else {
                        // Solo espacios o vacío (e.g. [C]  [D])
                        lineHtml += `<span class="chord-word"><span class="chord">${transposed}</span><span class="lyrics">${emptyLyric}</span></span>${text}`;
                    }
                } else {
                    // Sin texto siguiente (e.g. [C][D])
                    lineHtml += `<span class="chord-word"><span class="chord">${transposed}</span><span class="lyrics">${emptyLyric}</span></span>`;
                }
            } else {
                // Texto sin acorde previo
                if (part) {
                    const tokens = part.split(/(\s+)/);
                    tokens.forEach(token => {
                        if (/^\s+$/.test(token)) {
                            // Espacios sin acorde: usar chord-word con placeholder invisible para mantener altura
                            lineHtml += `<span class="chord-word"><span class="chord" style="visibility:hidden">&nbsp;</span><span class="lyrics">${token}</span></span>`;
                        } else if (token) {
                            // Texto sin acorde: misma estructura pero acorde invisible para alineación uniforme
                            lineHtml += `<span class="chord-word"><span class="chord" style="visibility:hidden">&nbsp;</span><span class="lyrics">${token}</span></span>`;
                        }
                    });
                }
            }
        }
        html += lineHtml + '</div>';
    });
    return html;
}