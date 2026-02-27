// This file manages the user interface for displaying songs, including rendering chords and handling user interactions.

import { supabase } from '../../services/supabaseClient.js';
import { renderSongItem } from '../../templates/song-item.js';

const songListElement = document.getElementById('song-list');

export const loadSongs = async () => {
    const { data: songs, error } = await supabase
        .from('songs')
        .select('*');

    if (error) {
        console.error('Error loading songs:', error);
        return;
    }

    songListElement.innerHTML = '';
    songs.forEach(song => {
        const songItem = renderSongItem(song);
        songListElement.appendChild(songItem);
    });
};

export const addSong = async (songData) => {
    const { data, error } = await supabase
        .from('songs')
        .insert([songData]);

    if (error) {
        console.error('Error adding song:', error);
        return;
    }

    loadSongs();
};

export const deleteSong = async (songId) => {
    const { error } = await supabase
        .from('songs')
        .delete()
        .eq('id', songId);

    if (error) {
        console.error('Error deleting song:', error);
        return;
    }

    loadSongs();
};

export const updateSong = async (songId, updatedData) => {
    const { error } = await supabase
        .from('songs')
        .update(updatedData)
        .eq('id', songId);

    if (error) {
        console.error('Error updating song:', error);
        return;
    }

    loadSongs();
};