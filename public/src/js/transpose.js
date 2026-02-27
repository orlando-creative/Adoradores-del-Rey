export const scales = {
    sharp: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    flat:  ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
};

const normalizeMap = {
    'Cb': 'B', 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'E#': 'F', 'B#': 'C'
};

export function transposeChord(chord, semitones) {
    if (!chord || chord.trim() === '') return chord;
    
    // Regex para separar la nota base (ej: C, F#) del sufijo (ej: m, 7, sus4)
    const regex = /^([A-G][#b]?)(.*)$/;
    const match = chord.match(regex);
    
    if (!match) return chord; // No es un acorde reconocible

    let note = match[1];
    const suffix = match[2];

    // Normalizar a sostenidos para cálculo interno
    if (normalizeMap[note]) note = normalizeMap[note];

    let index = scales.sharp.indexOf(note);
    if (index === -1) return chord; // Nota no encontrada

    // Calcular nuevo índice (manejo circular)
    let newIndex = (index + semitones) % 12;
    if (newIndex < 0) newIndex += 12;

    return scales.sharp[newIndex] + suffix;
}