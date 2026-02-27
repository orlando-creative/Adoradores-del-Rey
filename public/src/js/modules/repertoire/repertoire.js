// This file contains the logic for managing repertoires, including creating and assigning songs.

import { supabase } from '../../services/supabaseClient.js';

// Function to fetch all repertoires
export const fetchRepertoires = async () => {
    const { data, error } = await supabase
        .from('repertoires')
        .select('*');
    
    if (error) {
        console.error('Error fetching repertoires:', error);
        return [];
    }
    return data;
};

// Function to create a new repertoire
export const createRepertoire = async (name, songIds) => {
    const { data, error } = await supabase
        .from('repertoires')
        .insert([{ name, song_ids: songIds }]);
    
    if (error) {
        console.error('Error creating repertoire:', error);
        return null;
    }
    return data;
};

// Function to assign songs to a repertoire
export const assignSongsToRepertoire = async (repertoireId, songIds) => {
    const { data, error } = await supabase
        .from('repertoires')
        .update({ song_ids: songIds })
        .eq('id', repertoireId);
    
    if (error) {
        console.error('Error assigning songs to repertoire:', error);
        return null;
    }
    return data;
};

// Function to delete a repertoire
export const deleteRepertoire = async (repertoireId) => {
    const { data, error } = await supabase
        .from('repertoires')
        .delete()
        .eq('id', repertoireId);
    
    if (error) {
        console.error('Error deleting repertoire:', error);
        return null;
    }
    return data;
};