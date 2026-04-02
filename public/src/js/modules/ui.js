import { state } from './state.js';

export function toggleLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.classList.add('loading');
        btn.disabled = true;
    } else {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast bg-${type}`;
    toast.innerHTML = `<span class="toast-body">${message}</span>`;
    container.appendChild(toast);
    
    // Auto-dismiss after 3.5s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .3s ease';
        setTimeout(() => toast.remove(), 320);
    }, 3500);
}

export function showView(viewId, pushToHistory = true) {
    const viewIds = ['view-home', 'view-songs', 'view-song-detail', 'view-repertoires', 'view-repertoire-detail', 'view-profile'];
    
    // Hide all views
    viewIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('d-none');
        }
    });
    
    // Show target view
    const targetEl = document.getElementById(viewId);
    if (targetEl) {
        targetEl.classList.remove('d-none');
    }

    // Actualizar clase activa en AMBAS navs (top y bottom)
    const navMap = {
        'view-home':              { top: 'nav-home',        bottom: 'bnav-home' },
        'view-songs':             { top: 'nav-songs',       bottom: 'bnav-songs' },
        'view-song-detail':       { top: 'nav-songs',       bottom: 'bnav-songs' },
        'view-repertoires':       { top: 'nav-repertoires', bottom: 'bnav-repertoires' },
        'view-repertoire-detail': { top: 'nav-repertoires', bottom: 'bnav-repertoires' },
        'view-profile':           { top: 'nav-profile',     bottom: 'bnav-profile' }
    };
    document.querySelectorAll('.nav-item-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(l => l.classList.remove('active'));
    
    const ids = navMap[viewId];
    if (ids) {
        const topEl = document.getElementById(ids.top);
        const botEl = document.getElementById(ids.bottom);
        if (topEl) topEl.classList.add('active');
        if (botEl) botEl.classList.add('active');
    }

    if (pushToHistory) {
        history.pushState({ viewId }, '', '#' + viewId.replace('view-', ''));
    }

    // Ocultar navegación en móvil al entrar a detalles de canción o repertorio
    if (viewId === 'view-song-detail' || viewId === 'view-repertoire-detail') {
        document.body.classList.add('in-song');
    } else {
        document.body.classList.remove('in-song');
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
}

export function closeNavbar() {
    // No-op (tab bar)
}

/**
 * Handle modal visibility to hide bottom navbar on mobile
 */
export function initModalNavbarHandlers() {
    // Get all modals
    const modals = document.querySelectorAll('.modal');
    
    modals.forEach(modal => {
        // When modal shows, hide navbar
        modal.addEventListener('show.bs.modal', () => {
            document.body.classList.add('modal-open-navbar-hidden');
        });
        
        // When modal hides, show navbar again
        modal.addEventListener('hidden.bs.modal', () => {
            document.body.classList.remove('modal-open-navbar-hidden');
        });
    });
}

// Lógica de Skeletons (Nuevo)
export function showSkeletons(containerIds) {
    containerIds.forEach(id => {
        const container = document.getElementById(id);
        if (!container) return;
        
        container.innerHTML = Array(5).fill(0).map((_, i) => `
            <div class="list-group-item list-item-animate" style="animation-delay: ${Math.min(i * 0.05, 0.4)}s;">
                <div class="skeleton-box" style="width: ${50 + Math.random() * 30}%; height: 16px; margin-bottom: 6px; border-radius: 4px;"></div>
                <div class="skeleton-box" style="width: ${20 + Math.random() * 20}%; height: 12px; border-radius: 4px;"></div>
            </div>
        `).join('');
    });
}

export function showCardSkeletons(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = Array(6).fill(0).map((_, i) => `
        <div class="col-md-4 col-sm-6 list-item-animate" style="animation-delay: ${Math.min(i * 0.05, 0.4)}s;">
            <div class="card p-4 shadow-sm h-100 border-0">
                <div class="skeleton-box" style="width: 70%; height: 20px; margin-bottom: 12px; border-radius: 4px;"></div>
                <div class="skeleton-box" style="width: 40%; height: 14px; margin-bottom: 8px; border-radius: 4px;"></div>
                <div class="skeleton-box" style="width: 90%; height: 14px; border-radius: 4px;"></div>
            </div>
        </div>
    `).join('');
}

// Utilidades del Scroll de letres
export function changeFontSize(delta) {
    state.currentFontSize = Math.max(10, Math.min(60, state.currentFontSize + delta));
    document.getElementById('song-lyrics').style.fontSize = `${state.currentFontSize}px`;
}

export function toggleAutoScroll() {
    const btn = document.getElementById('btn-auto-scroll');
    if (state.scrollInterval) {
        stopAutoScroll();
    } else {
        btn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        btn.classList.replace('btn-outline-success', 'btn-danger');
        startScrollInterval();
    }
}

export function startScrollInterval() {
    if (state.scrollInterval) clearInterval(state.scrollInterval);
    state.scrollInterval = setInterval(() => window.scrollBy(0, 1), state.scrollSpeedMs);
}

export function stopAutoScroll() {
    const btn = document.getElementById('btn-auto-scroll');
    if (state.scrollInterval) clearInterval(state.scrollInterval);
    state.scrollInterval = null;
    if(btn) {
        btn.innerHTML = '<i class="bi bi-play-fill"></i>';
        btn.classList.replace('btn-danger', 'btn-outline-success');
    }
}

export function toggleLyricsOnly() {
    const container = document.getElementById('song-lyrics');
    const btn = document.getElementById('btn-toggle-lyrics');
    container.classList.toggle('lyrics-only');
    
    if (container.classList.contains('lyrics-only')) {
        btn.classList.add('active', 'btn-secondary');
        btn.classList.remove('btn-outline-secondary');
    } else {
        btn.classList.remove('active', 'btn-secondary');
        btn.classList.add('btn-outline-secondary');
    }
}
