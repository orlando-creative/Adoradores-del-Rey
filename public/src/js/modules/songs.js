import { state } from './state.js';
import { supabase } from '../supabaseClient.js';
import { changeFontSize, closeNavbar, showToast, showView, toggleAutoScroll, toggleLoading, toggleLyricsOnly } from './ui.js';

export function filterSongsList(e) {
    const term = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('#hymns-list a, #jubilo-list a, #adoracion-list a');
    
    items.forEach(item => {
        const searchContent = item.dataset.search || item.textContent.toLowerCase();
        item.classList.toggle('d-none', !searchContent.includes(term));
    });
}
