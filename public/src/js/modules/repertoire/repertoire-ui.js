// This file manages the user interface for displaying repertoires and their details.

import { supabase } from '../../services/supabaseClient.js';
import { renderRepertoireItem } from '../../templates/repertoire-item.html';

const repertoireContainer = document.getElementById('repertoire-container');

export const loadRepertoires = async () => {
    const { data: repertoires, error } = await supabase
        .from('repertoires')
        .select('*');

    if (error) {
        console.error('Error loading repertoires:', error);
        return;
    }

    repertoireContainer.innerHTML = '';
    repertoires.forEach(repertoire => {
        const repertoireItem = renderRepertoireItem(repertoire);
        repertoireContainer.appendChild(repertoireItem);
    });
};

export const displayRepertoireDetails = (repertoire) => {
    const detailsContainer = document.getElementById('repertoire-details');
    detailsContainer.innerHTML = `
        <h2>${repertoire.name}</h2>
        <p>${repertoire.description}</p>
        <h3>Songs in this repertoire:</h3>
        <ul>
            ${repertoire.songs.map(song => `<li>${song.title}</li>`).join('')}
        </ul>
    `;
};

export const initRepertoireUI = () => {
    loadRepertoires();
};