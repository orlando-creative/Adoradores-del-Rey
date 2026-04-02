/**
 * Shared application state to avoid circular dependencies
 * between the new modularized files.
 */
export const state = {
    currentSong: null,
    currentSemitones: 0,
    currentTransposedSuffix: null,
    currentRepertoire: null,
    userProfile: null,
    
    // Modals
    songModal: null,
    repertoireModal: null,
    addSongModal: null,
    transposeModal: null,
    importModal: null,
    
    // Arrays
    allSongsForModal: [],
    
    // UI State
    currentFontSize: 15,
    isSelectionMode: false,
    scrollInterval: null,
    scrollSpeedMs: 50,
    returnToView: 'view-songs'
};
