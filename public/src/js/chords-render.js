import { transposeChord } from './transpose.js';

function escapeHtml(value) {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

export function renderSong(lyricsWithChords, semitones = 0) {
    if (!lyricsWithChords) return '';

    const lines = lyricsWithChords.replace(/\r\n?/g, '\n').split('\n');
    const sectionHeaderRegex = /^\s*(\(?(verso|verse|coro|chorus|estribillo|puente|bridge|intro|outro|solo|estrofa|pre-coro|pre-chorus)\b.*)/i;
    let inChorus = false;

    return lines.map(line => {
        if (sectionHeaderRegex.test(line)) {
            const isChorus = /coro|chorus|estribillo/i.test(line);
            inChorus = isChorus;
            const safeHeader = escapeHtml(line.trim()).replace(
                /(coro|chorus|estribillo)/i,
                '<strong>$1</strong>'
            );
            return `<div class="section-header">${safeHeader}</div>`;
        }

        if (!line.trim()) {
            inChorus = false;
            return '<div class="line-wrapper blank-line">&nbsp;</div>';
        }

        const chordPattern = /\[([^\]]+)\]/g;
        const matches = Array.from(line.matchAll(chordPattern));
        const hasLyrics = line.replace(chordPattern, '').trim().length > 0;
        if (matches.length && !hasLyrics) {
            const chords = matches.map(match =>
                `<span class="chord-anchor chord-only-anchor"><span class="chord">${escapeHtml(transposeChord(match[1], semitones))}</span></span>`
            );
            return `<div class="line-wrapper chord-only-line${inChorus ? ' chorus-line' : ''}">${chords.join('')}</div>`;
        }

        const parts = [`<div class="line-wrapper${inChorus ? ' chorus-line' : ''}">`];
        let cursor = 0;

        matches.forEach((match, index) => {
            const beforeChord = line.slice(cursor, match.index);
            if (beforeChord) parts.push(`<span class="lyrics">${escapeHtml(beforeChord)}</span>`);

            const chord = escapeHtml(transposeChord(match[1], semitones));
            const lyricStart = match.index + match[0].length;
            const lyricEnd = index + 1 < matches.length ? matches[index + 1].index : line.length;
            const lyric = line.slice(lyricStart, lyricEnd);
            const lyricContent = lyric ? escapeHtml(lyric) : (hasLyrics ? '&nbsp;' : '');

            parts.push(`<span class="chord-anchor"><span class="chord">${chord}</span><span class="lyrics">${lyricContent}</span></span>`);
            cursor = lyricEnd;
        });

        if (!matches.length) {
            parts.push(`<span class="lyrics">${escapeHtml(line)}</span>`);
        } else if (cursor < line.length) {
            parts.push(`<span class="lyrics">${escapeHtml(line.slice(cursor))}</span>`);
        }

        parts.push('</div>');
        return parts.join('');
    }).join('');
}
