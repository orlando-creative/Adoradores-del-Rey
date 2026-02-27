// src/js/modules/songs/songs.js

import { supabase } from '../../services/supabaseClient.js';

// Function to fetch all songs
export const fetchSongs = async () => {
    const { data, error } = await supabase
        .from('songs')
        .select('*');
    
    if (error) {
        console.error('Error fetching songs:', error);
        return [];
    }
    return data;
};

// Function to add a new song
export const addSong = async (song) => {
    const { data, error } = await supabase
        .from('songs')
        .insert([song]);
    
    if (error) {
        console.error('Error adding song:', error);
        return null;
    }
    return data;
};

// Function to update an existing song
export const updateSong = async (id, updatedSong) => {
    const { data, error } = await supabase
        .from('songs')
        .update(updatedSong)
        .eq('id', id);
    
    if (error) {
        console.error('Error updating song:', error);
        return null;
    }
    return data;
};

// Function to delete a song
export const deleteSong = async (id) => {
    const { data, error } = await supabase
        .from('songs')
        .delete()
        .eq('id', id);
    
    if (error) {
        console.error('Error deleting song:', error);
        return null;
    }
    return data;
};