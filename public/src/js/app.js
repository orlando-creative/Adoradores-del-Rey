import { supabase } from './supabaseClient.js';
import { getCurrentProfile, logout } from './auth.js';
import { renderSong } from './chords-render.js';
import { scales } from './transpose.js';

// Inyectar estilos para modo "Solo Letra" y Himnos
const lyricsStyles = document.createElement('style');
lyricsStyles.textContent = `
    .lyrics-only .line-wrapper {
        text-align: center !important;
        margin-bottom: 0.2rem !important;
        display: block !important;
    }
    .lyrics-only .section-header {
        text-align: center !important;
        font-family: 'Georgia', 'Times New Roman', serif !important;
        font-size: 1.8em !important;
        font-weight: bold;
        margin-top: 1rem !important;
        margin-bottom: 0.5rem !important;
    }
    .lyrics-only .chord {
        display: none !important;
    }
    .lyrics-only .lyrics {
        font-family: 'Georgia', 'Times New Roman', serif !important;
        font-size: 2rem !important;
        color: #212529;
        line-height: 1.2;
    }
    .lyrics-only .chord-word {
        display: inline !important;
        margin: 0 2px !important;
    }
    .lyrics-only .chord-word .lyrics {
        display: inline;
    }
`;
document.head.appendChild(lyricsStyles);

let currentSong = null;
let currentSemitones = 0;
let currentTransposedSuffix = null;
let currentRepertoire = null;
let userProfile = null;
let songModal = null;
let repertoireModal = null;
let addSongModal = null;
let transposeModal = null;
let importModal = null;
let bulkImportModal = null;
let allSongsForModal = [];
let currentFontSize = 13; // Tamaño óptimo inicial reducido
let isSelectionMode = false;
let scrollInterval = null;
let scrollSpeedMs = 50; // Velocidad inicial (ms por pixel)
let returnToView = 'view-songs';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar Auth
    const profile = await getCurrentProfile();
    if (!profile) {
        window.location.href = 'login.html';
        return;
    }
    userProfile = profile;
    document.getElementById('user-name').textContent = profile.nombre || 'Usuario';

    if (userProfile.rol === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
    }

    // Inicializar Modales
    songModal = new bootstrap.Modal(document.getElementById('songModal'));
    repertoireModal = new bootstrap.Modal(document.getElementById('repertoireModal'));
    addSongModal = new bootstrap.Modal(document.getElementById('addSongModal'));
    transposeModal = new bootstrap.Modal(document.getElementById('transposeModal'));
    importModal = new bootstrap.Modal(document.getElementById('importModal'));
    bulkImportModal = new bootstrap.Modal(document.getElementById('bulkImportModal'));

    await populateMusicianSelectors();
    // 2. Event Listeners Navegación
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    document.getElementById('nav-songs').addEventListener('click', async (e) => {
        e.preventDefault();
        closeNavbar();
        showView('view-songs');
        await loadSongs();
    });

    document.getElementById('nav-repertoires').addEventListener('click', async (e) => {
        e.preventDefault();
        closeNavbar();
        showView('view-repertoires');
        await loadRepertoires();
    });
    
    document.getElementById('nav-profile').addEventListener('click', async (e) => {
        e.preventDefault();
        closeNavbar();
        showView('view-profile');
        await loadProfileView();
    });

    document.getElementById('nav-home').addEventListener('click', (e) => {
        e.preventDefault();
        closeNavbar();
        showView('view-home');
    });

    document.getElementById('back-to-songs').addEventListener('click', (e) => {
        showView(returnToView);
    });
    document.getElementById('back-to-repertoires').addEventListener('click', () => {
        showView('view-repertoires');
    });

    // 3. Event Listeners Transposición
    document.getElementById('btn-transpose-menu').addEventListener('click', openTransposeModal);
    document.getElementById('btn-font-plus').addEventListener('click', () => changeFontSize(2));
    document.getElementById('btn-font-minus').addEventListener('click', () => changeFontSize(-2));
    document.getElementById('btn-toggle-lyrics').addEventListener('click', toggleLyricsOnly);
    document.getElementById('btn-auto-scroll').addEventListener('click', toggleAutoScroll);
    
    document.getElementById('scroll-speed-range').addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        // Mapeo: 0 (Lento/200ms) -> 100 (Rápido/5ms)
        scrollSpeedMs = Math.floor(200 - (val * 1.95));
        if (scrollSpeedMs < 5) scrollSpeedMs = 5;
        
        if (scrollInterval) startScrollInterval();
    });

    // 4. Exportar PNG (Lógica mejorada)
    document.getElementById('export-png').addEventListener('click', () => {
        const element = document.getElementById('view-song-detail');
        const title = currentSong.titulo || 'cancion';
        exportElementAsPNG(element, title);
    });

    document.getElementById('export-rep-png').addEventListener('click', async () => {
        const element = document.getElementById('repertoire-content');
        const title = currentRepertoire.titulo || 'repertorio';

        // Guardar estilos originales para restaurarlos después
        const originalStyleAttr = element.getAttribute('style') || '';
        const mutedElements = element.querySelectorAll('.text-muted');
        const originalMutedStyles = Array.from(mutedElements).map(el => el.getAttribute('style') || '');

        // Configuración para exportación (Estilo A4)
        // Respetamos el tema seleccionado, pero forzamos dimensiones A4
        element.style.width = '794px'; // Ancho estándar A4 a 96dpi
        element.style.maxWidth = 'none';
        element.style.margin = '0 auto';
        element.style.padding = '30px'; // Padding reducido para más contenido
        element.style.boxShadow = 'none';
        element.style.borderRadius = '0';

        const options = {
            scale: 2, // Alta calidad (2x)
            useCORS: true,
            backgroundColor: null, // Usar el del elemento (transparente/heredado)
            windowWidth: 1200, // Simular desktop para mantener columnas lado a lado
            width: 794 // Ancho de captura
        };

        try {
            await exportElementAsPNG(element, title, options);
        } finally {
            // Restaurar estilos originales
            element.setAttribute('style', originalStyleAttr);
        }
    });

    // 5. Admin Actions
    document.getElementById('btn-add-song').addEventListener('click', () => openModal());
    document.getElementById('btn-edit-song').addEventListener('click', () => openModal(currentSong));
    document.getElementById('btn-save-song').addEventListener('click', saveSong);
    document.getElementById('btn-delete-song').addEventListener('click', deleteSong);

    document.getElementById('btn-add-repertoire').addEventListener('click', () => openRepertoireModal());
    document.getElementById('btn-save-repertoire').addEventListener('click', saveRepertoire);
    document.getElementById('btn-delete-rep').addEventListener('click', deleteRepertoire);
    document.getElementById('btn-edit-repertoire').addEventListener('click', () => toggleRepertoireEditMode(true));
    document.getElementById('btn-save-repertoire-details').addEventListener('click', saveRepertoireDetails);
    document.getElementById('btn-add-song-to-rep').addEventListener('click', openAddSongModal);
    document.getElementById('btn-confirm-add-song').addEventListener('click', addSongToRepertoire);
    document.getElementById('input-song-section').addEventListener('change', updateSongSelectOptions);
    document.getElementById('input-song-search').addEventListener('input', updateSongSelectOptions);
    document.getElementById('select-song-to-add').addEventListener('change', updateRepertoireKeyInput);
    document.getElementById('btn-bulk-import').addEventListener('click', handleBulkImport);
    document.getElementById('btn-select-songs').addEventListener('click', () => toggleSelectionMode(true));
    document.getElementById('btn-cancel-selection').addEventListener('click', () => toggleSelectionMode(false));
    document.getElementById('btn-delete-selected').addEventListener('click', deleteSelectedSongs);
    document.getElementById('song-type').addEventListener('change', toggleYoutubeInput);
    document.getElementById('song-list-search').addEventListener('input', filterSongsList);
    
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveProfile();
    });

    document.getElementById('password-change-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await changePassword();
    });

    // Theme Selector
    document.getElementById('rep-theme-select').addEventListener('change', (e) => {
        const content = document.getElementById('repertoire-content');
        content.className = `${e.target.value} p-4 mx-auto shadow-lg`;
    });

    // Import Logic
    document.getElementById('btn-open-import').addEventListener('click', () => {
        document.getElementById('import-textarea').value = '';
        document.getElementById('import-search-query').value = '';
        document.getElementById('import-file').value = '';
        importModal.show();
    });
    
    document.getElementById('btn-search-external').addEventListener('click', () => {
        const query = document.getElementById('import-search-query').value;
        if (query) window.open(`https://www.google.com/search?q=${encodeURIComponent(query + ' acordes cifraclub')}`, '_blank');
    });

    document.getElementById('btn-process-import').addEventListener('click', processImport);

    // File Import Logic
    document.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. Detectar Título y Autor desde el nombre del archivo
        let title = file.name.replace(/\.[^/.]+$/, "");
        let author = '';

        // Si tiene guión, asumimos formato "Autor - Título"
        if (title.includes(' - ')) {
            const parts = title.split(' - ');
            author = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
        }

        document.getElementById('song-title').value = title;
        document.getElementById('song-author').value = author;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            document.getElementById('import-textarea').value = content;

            // 2. Analizar contenido para metadatos explícitos y Tono
            const lines = content.split('\n');
            let detectedKey = '';
            
            const keyRegex = /^(?:Tono|Key|Tonality|Tonalidad):\s*([A-G][#b]?m?)/i;
            const authorRegex = /^(?:Autor|Author|Por|By):\s*(.+)/i;
            const titleRegex = /^(?:Titulo|Title):\s*(.+)/i;

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                const keyMatch = trimmed.match(keyRegex);
                if (keyMatch) detectedKey = keyMatch[1];

                const authorMatch = trimmed.match(authorRegex);
                if (authorMatch) document.getElementById('song-author').value = authorMatch[1].trim();

                const titleMatch = trimmed.match(titleRegex);
                if (titleMatch) document.getElementById('song-title').value = titleMatch[1].trim();
            }

            // 3. Si no hay tono explícito, buscar el primer acorde
            if (!detectedKey) {
                for (const line of lines) {
                    if (isChordLine(line)) {
                        const tokens = line.trim().split(/\s+/);
                        for (const token of tokens) {
                            const cleanToken = token.replace(/^[\(\|]+|[\)\|]+$/g, '');
                            const match = cleanToken.match(/^([A-G][#b]?m?)/);
                            if (match) {
                                detectedKey = match[1];
                                break;
                            }
                        }
                        if (detectedKey) break;
                    }
                }
            }

            if (detectedKey) {
                document.getElementById('song-key').value = detectedKey;
            }
        };
        reader.readAsText(file);
    });

    // Registrar Service Worker para PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }

    // Mantener la base de datos activa en el plan gratuito de Supabase
    setInterval(keepDatabaseAwake, 300000); // Ping cada 5 minutos
});

/**
 * Realiza una consulta ligera a la base de datos para evitar que Supabase
 * pause el proyecto en el plan gratuito por inactividad.
 */
function keepDatabaseAwake() {
    supabase.from('profiles').select('id', { count: 'exact', head: true }).then(({ error }) => {
        if (error) {
            console.warn('Ping a la base de datos falló:', error.message);
        } else {
            // No es necesario mostrar esto en producción, pero es útil para depurar.
            // console.log('Ping a la base de datos exitoso para mantenerla activa.');
        }
    });
}

async function loadProfileView() {
    const { data: { user } } = await supabase.auth.getUser();
    document.getElementById('profile-email').value = user ? user.email : '';
    document.getElementById('profile-name').value = userProfile.nombre || '';    
    const roleSelect = document.getElementById('profile-role');
    roleSelect.value = userProfile.rol || 'user';

    // Solo los administradores pueden cambiar el rol
    if (userProfile.rol === 'admin') {
        roleSelect.disabled = false;
    } else {
        roleSelect.disabled = true;
    }
}

async function saveProfile() {
    const newName = document.getElementById('profile-name').value;
    const newRole = document.getElementById('profile-role').value;
    if (!newName) return showToast('El nombre es requerido', 'warning');

    const { error } = await supabase
        .from('profiles')
        .update({ nombre: newName, rol: newRole })
        .eq('id', userProfile.id);

    if (error) {
        showToast('Error al actualizar perfil: ' + error.message, 'danger');
    } else {
        showToast('Perfil actualizado correctamente', 'success');
        userProfile.nombre = newName;
        userProfile.rol = newRole;
        document.getElementById('user-name').textContent = newName;
    }
}

async function changePassword() {
    const newPassword = document.getElementById('profile-new-password').value;
    if (newPassword.length < 6) {
        return showToast('La contraseña debe tener al menos 6 caracteres.', 'warning');
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
        showToast('Error al cambiar la contraseña: ' + error.message, 'danger');
    } else {
        showToast('Contraseña actualizada correctamente.', 'success');
        document.getElementById('password-change-form').reset();
    }
}

async function exportElementAsPNG(element, filename, options = {}) {
    const elementsToHide = element.querySelectorAll('.no-export');
    elementsToHide.forEach(el => el.style.display = 'none');

    try {
        const canvas = await html2canvas(element, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            ...options,
        });
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error('Error exportando a PNG:', err);
        showToast('Hubo un error al exportar la imagen.', 'danger');
    } finally {
        elementsToHide.forEach(el => el.style.display = '');
    }
}

function showView(viewId) {
    ['view-home', 'view-songs', 'view-song-detail', 'view-repertoires', 'view-repertoire-detail', 'view-profile'].forEach(id => {
        document.getElementById(id).classList.add('d-none');
    });
    document.getElementById(viewId).classList.remove('d-none');
}

function closeNavbar() {
    const navbarOffcanvas = document.getElementById('offcanvasNavbar');
    if (navbarOffcanvas.classList.contains('show')) {
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(navbarOffcanvas) || new bootstrap.Offcanvas(navbarOffcanvas);
        bsOffcanvas.hide();
    }
}

function showToast(message, type = 'info') {
    const toastEl = document.getElementById('liveToast');
    const toastBody = document.getElementById('toast-body');
    
    // Configurar colores según tipo
    toastEl.className = `toast align-items-center text-white border-0 bg-${type}`;
    toastBody.textContent = message;
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

function toggleSelectionMode(enable) {
    isSelectionMode = enable;
    const view = document.getElementById('view-songs');
    const mainActions = document.getElementById('songs-main-actions');
    const selectionActions = document.getElementById('songs-selection-actions');

    view.classList.toggle('selection-mode', enable);
    mainActions.classList.toggle('d-none', enable);
    selectionActions.classList.toggle('d-none', !enable);

    // Uncheck all boxes when exiting selection mode
    if (!enable) {
        const checkedBoxes = view.querySelectorAll('.song-selection-checkbox input:checked');
        checkedBoxes.forEach(cb => cb.checked = false);
    }
}

async function deleteSelectedSongs() {
    const view = document.getElementById('view-songs');
    const checkedBoxes = view.querySelectorAll('.song-selection-checkbox input:checked');
    const idsToDelete = Array.from(checkedBoxes).map(cb => cb.value);

    if (idsToDelete.length === 0) {
        showToast('No has seleccionado ninguna canción.', 'warning');
        return;
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar ${idsToDelete.length} canción(es)? Esta acción no se puede deshacer.`)) {
        return;
    }

    const { error } = await supabase
        .from('songs')
        .delete()
        .in('id', idsToDelete);

    if (error) {
        showToast(`Error al eliminar: ${error.message}`, 'danger');
    } else {
        showToast(`${idsToDelete.length} canción(es) eliminada(s) correctamente.`, 'success');
        toggleSelectionMode(false); // Exit selection mode
        await loadSongs(); // Refresh the list
    }
}

async function loadSongs() {
    const hymnsList = document.getElementById('hymns-list');
    const jubiloList = document.getElementById('jubilo-list');
    const adoracionList = document.getElementById('adoracion-list');
    document.getElementById('song-list-search').value = ''; // Resetear búsqueda al cargar
    
    hymnsList.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm text-secondary" role="status"></div></div>';
    jubiloList.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm text-secondary" role="status"></div></div>';
    adoracionList.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm text-secondary" role="status"></div></div>';

    const { data: songs, error } = await supabase
        .from('songs')
        .select('*')
        .order('titulo');

    if (error) {
        console.error(error);
        hymnsList.innerHTML = 'Error cargando canciones.';
        jubiloList.innerHTML = '';
        adoracionList.innerHTML = '';
        return;
    }

    hymnsList.innerHTML = '';
    jubiloList.innerHTML = '';
    adoracionList.innerHTML = '';

    songs.forEach(song => {
        const item = document.createElement('a');
        item.className = 'list-group-item list-group-item-action d-flex align-items-center';
        item.href = '#';
        
        const checkboxHTML = `
            <div class="form-check song-selection-checkbox me-3 d-none">
                <input class="form-check-input" type="checkbox" value="${song.id}">
            </div>
        `;

        let titleHTML;
        if (song.tipo === 'himno') {
            const displayTitle = song.autor ? ` - ${song.autor}` : '';
            titleHTML = `<span class="fw-bold">#${song.titulo}${displayTitle}</span> <span class="badge bg-secondary float-end">${song.tono_original || '-'}</span>`;
        } else {
            titleHTML = `${song.titulo} <span class="badge bg-secondary float-end">${song.tono_original || '-'}</span>`;
        }

        item.innerHTML = checkboxHTML + `<div class="flex-grow-1">${titleHTML}</div>`;

        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (isSelectionMode) {
                const chk = e.currentTarget.querySelector('input[type="checkbox"]');
                if (chk && e.target.type !== 'checkbox') {
                    chk.checked = !chk.checked;
                }
            } else {
                openSong(song);
            }
        });

        if (song.tipo === 'himno') {
            hymnsList.appendChild(item);
        } else if (song.tipo === 'jubilo' || song.tipo === 'ofrenda') {
            jubiloList.appendChild(item);
        } else if (song.tipo === 'adoracion') {
            adoracionList.appendChild(item);
        } else {
            jubiloList.appendChild(item);
        }
    });
    
    // Ordenar himnos numéricamente si es posible
    sortListNumerically(hymnsList);
}

function sortListNumerically(listContainer) {
    const items = Array.from(listContainer.children);
    items.sort((a, b) => {
        // Extraer número del texto (asumiendo formato "#123")
        const numA = parseInt(a.innerText.replace('#', '')) || 0;
        const numB = parseInt(b.innerText.replace('#', '')) || 0;
        if (numA && numB) return numA - numB;
        return a.innerText.localeCompare(b.innerText);
    });
    items.forEach(item => listContainer.appendChild(item));
}

function filterSongsList(e) {
    const term = e.target.value.toLowerCase();
    const items = document.querySelectorAll('#hymns-list a, #jubilo-list a, #adoracion-list a');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(term)) {
            item.classList.remove('d-none');
        } else {
            item.classList.add('d-none');
        }
    });
}

function openSong(song, targetKey = null, fromView = 'view-songs') {
    currentSong = song;
    returnToView = fromView;
    
    // Reset View State
    currentFontSize = 14; // Tamaño más pequeño para mejor visualización en móvil
    updateFontSize();
    stopAutoScroll();
    
    // Configurar modo solo letra (automático para himnos)
    const lyricsContainer = document.getElementById('song-lyrics');
    const btnToggleLyrics = document.getElementById('btn-toggle-lyrics');
    
    if (song.tipo === 'himno') {
        lyricsContainer.classList.add('lyrics-only');
        btnToggleLyrics.classList.add('active', 'btn-secondary');
        btnToggleLyrics.classList.remove('btn-outline-secondary');
    } else {
        lyricsContainer.classList.remove('lyrics-only');
        btnToggleLyrics.classList.remove('active', 'btn-secondary');
        btnToggleLyrics.classList.add('btn-outline-secondary');
    }
    
    if (song.tipo === 'himno' && song.autor) {
        document.getElementById('detail-title').textContent = `#${song.titulo} - ${song.autor}`;
    } else {
        document.getElementById('detail-title').textContent = song.titulo;
    }
    
    // YouTube Logic
    const ytContainer = document.getElementById('youtube-container');
    if (song.youtube_url) {
        const videoId = getYoutubeId(song.youtube_url);
        if (videoId) {
            ytContainer.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
            ytContainer.classList.remove('d-none');
        }
    } else {
        ytContainer.classList.add('d-none');
        ytContainer.innerHTML = '';
    }

    // Lógica de Tonalidad (Si viene con un tono específico)
    if (targetKey && targetKey !== song.tono_original) {
        const { root: originalRoot } = getSongRootAndSuffix(song.tono_original || 'C');
        const { root: targetRoot, suffix: targetSuffix } = getSongRootAndSuffix(targetKey);
        
        const normalizeMap = { 'Cb': 'B', 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'E#': 'F', 'B#': 'C' };
        
        const normOriginal = normalizeMap[originalRoot] || originalRoot;
        const normTarget = normalizeMap[targetRoot] || targetRoot;

        const startIdx = scales.sharp.indexOf(normOriginal);
        const endIdx = scales.sharp.indexOf(normTarget);
        
        if (startIdx !== -1 && endIdx !== -1) {
            currentSemitones = endIdx - startIdx;
        } else {
            currentSemitones = 0;
        }
        currentTransposedSuffix = targetSuffix;
    } else {
        currentSemitones = 0;
        const { suffix } = getSongRootAndSuffix(song.tono_original);
        currentTransposedSuffix = suffix;
    }

    renderCurrentSong();
    updateTransposeButton();
    showView('view-song-detail');
}

function getSongRootAndSuffix(key) {
    if (!key) return { root: 'C', suffix: '' };
    const regex = /^([A-G][#b]?)(.*)$/;
    const match = key.match(regex);
    if (match) {
        return { root: match[1], suffix: match[2] || '' };
    }
    return { root: 'C', suffix: '' };
}

function getCurrentKeyLabel() {
    if (!currentSong || !currentSong.tono_original) return '-';
    
    const { root, suffix } = getSongRootAndSuffix(currentSong.tono_original);
    
    // Normalizar root a sostenidos para buscar en scales.sharp
    const normalizeMap = { 'Cb': 'B', 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'E#': 'F', 'B#': 'C' };
    let searchRoot = normalizeMap[root] || root;
    
    let index = scales.sharp.indexOf(searchRoot);
    if (index === -1) return currentSong.tono_original; // Fallback

    let newIndex = (index + currentSemitones) % 12;
    if (newIndex < 0) newIndex += 12;

    const displaySuffix = currentTransposedSuffix !== null ? currentTransposedSuffix : suffix;
    return scales.sharp[newIndex] + displaySuffix;
}

function updateTransposeButton() {
    const btn = document.getElementById('btn-transpose-menu');
    btn.textContent = getCurrentKeyLabel();
}

function openTransposeModal() {
    const grid = document.getElementById('transpose-grid');
    grid.innerHTML = '';
    
    const currentKey = getCurrentKeyLabel();

    const majorKeysContainer = document.createElement('div');
    majorKeysContainer.className = 'd-grid gap-2';
    const minorKeysContainer = document.createElement('div');
    minorKeysContainer.className = 'd-grid gap-2';

    scales.sharp.forEach((note) => {
        // Major key button
        const majorKeyLabel = note;
        const majorBtn = document.createElement('button');
        majorBtn.className = `btn ${majorKeyLabel === currentKey ? 'btn-primary' : 'btn-outline-secondary'}`;
        majorBtn.textContent = majorKeyLabel;
        majorBtn.onclick = () => setTranspositionByTarget(note, '');
        majorKeysContainer.appendChild(majorBtn);

        // Minor key button
        const minorKeyLabel = note + 'm';
        const minorBtn = document.createElement('button');
        minorBtn.className = `btn ${minorKeyLabel === currentKey ? 'btn-primary' : 'btn-outline-secondary'}`;
        minorBtn.textContent = minorKeyLabel;
        minorBtn.onclick = () => setTranspositionByTarget(note, 'm');
        minorKeysContainer.appendChild(minorBtn);
    });

    grid.appendChild(majorKeysContainer);
    grid.appendChild(minorKeysContainer);

    transposeModal.show();
}

function setTranspositionByTarget(targetRoot, targetSuffix) {
    const { root: originalRoot } = getSongRootAndSuffix(currentSong.tono_original || 'C');
    
    // Calcular distancia en semitonos
    const normalizeMap = { 'Cb': 'B', 'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'E#': 'F', 'B#': 'C' };
    const startIdx = scales.sharp.indexOf(normalizeMap[originalRoot] || originalRoot);
    const endIdx = scales.sharp.indexOf(targetRoot);
    
    currentSemitones = endIdx - startIdx;
    currentTransposedSuffix = targetSuffix;
    
    renderCurrentSong();
    updateTransposeButton();
    transposeModal.hide();
}

function changeFontSize(delta) {
    currentFontSize = Math.max(10, Math.min(60, currentFontSize + delta));
    updateFontSize();
}

function updateFontSize() {
    document.getElementById('song-lyrics').style.fontSize = `${currentFontSize}px`;
}

function toggleLyricsOnly() {
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

function toggleAutoScroll() {
    const btn = document.getElementById('btn-auto-scroll');
    if (scrollInterval) {
        stopAutoScroll();
    } else {
        btn.textContent = '⏸';
        btn.classList.replace('btn-outline-success', 'btn-danger');
        startScrollInterval();
    }
}

function startScrollInterval() {
    if (scrollInterval) clearInterval(scrollInterval);
    scrollInterval = setInterval(() => window.scrollBy(0, 1), scrollSpeedMs);
}

function stopAutoScroll() {
    const btn = document.getElementById('btn-auto-scroll');
    if (scrollInterval) clearInterval(scrollInterval);
    scrollInterval = null;
    btn.textContent = '▶';
    btn.classList.replace('btn-danger', 'btn-outline-success');
}

function renderCurrentSong() {
    const container = document.getElementById('song-lyrics');
    container.innerHTML = renderSong(currentSong.letra_acordes, currentSemitones);
}

function openModal(song = null) {
    const form = document.getElementById('song-form');
    form.reset();
    
    if (song) {
        document.getElementById('song-id').value = song.id;
        document.getElementById('song-title').value = song.titulo;
        document.getElementById('song-author').value = song.autor || '';
        document.getElementById('song-key').value = song.tono_original || '';
        document.getElementById('song-type').value = song.tipo || 'jubilo';
        document.getElementById('song-youtube').value = song.youtube_url || '';
        document.getElementById('song-lyrics-input').value = song.letra_acordes || '';
        document.getElementById('songModalLabel').textContent = 'Editar Canción';
    } else {
        document.getElementById('song-id').value = '';
        document.getElementById('song-type').value = 'himno'; // Default a himno
        document.getElementById('songModalLabel').textContent = 'Nueva Canción';
    }
    
    // Reset validation styles
    document.getElementById('song-key').classList.remove('is-invalid');
    toggleYoutubeInput();
    songModal.show();
}

function toggleYoutubeInput() {
    const type = document.getElementById('song-type').value;
    const divYoutube = document.getElementById('div-youtube-input');
    if (type === 'himno') {
        divYoutube.classList.add('d-none');
    } else {
        divYoutube.classList.remove('d-none');
    }
}

function isValidKey(key) {
    if (!key) return true; // Permitir vacío
    // Regex para validar tonalidades: C, C#, Db, Cm, C#m, etc.
    const regex = /^([A-G][#b]?)(m)?$/;
    return regex.test(key);
}

async function saveSong() {
    const id = document.getElementById('song-id').value;
    const key = document.getElementById('song-key').value.trim();
    const type = document.getElementById('song-type').value;
    
    // Validación de Tonalidad
    if (!isValidKey(key)) {
        document.getElementById('song-key').classList.add('is-invalid');
        return;
    } else {
        document.getElementById('song-key').classList.remove('is-invalid');
    }

    const songData = {
        titulo: document.getElementById('song-title').value,
        autor: document.getElementById('song-author').value,
        tono_original: key,
        tipo: type,
        youtube_url: (type === 'himno') ? '' : document.getElementById('song-youtube').value,
        letra_acordes: document.getElementById('song-lyrics-input').value,
        created_by: userProfile.id
    };

    let error;
    if (id) {
        const { error: updateError } = await supabase.from('songs').update(songData).eq('id', id);
        error = updateError;
    } else {
        const { error: insertError } = await supabase.from('songs').insert([songData]);
        error = insertError;
    }

    if (error) {
        showToast('Error guardando: ' + error.message, 'danger');
    } else {
        showToast('Canción guardada correctamente', 'success');
        songModal.hide();
        await loadSongs(); // Recarga la lista de canciones
        if (id) { // Si estábamos editando una canción
            // Volvemos a cargar la canción desde la BD para tener los datos más frescos
            const { data: updatedSong, error: fetchError } = await supabase
                .from('songs')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) {
                console.error("Error recargando la canción:", fetchError);
                showView('view-songs'); // Volver a la lista si hay error
            } else if (updatedSong && currentSong && currentSong.id == id) {
                // Si seguimos en la vista de detalle de esa canción, la actualizamos
                openSong(updatedSong);
            }
        }
    }
}

async function deleteSong() {
    if (!confirm('¿Estás seguro de eliminar esta canción?')) return;

    const { error } = await supabase.from('songs').delete().eq('id', currentSong.id);
    
    if (error) {
        showToast('Error eliminando: ' + error.message, 'danger');
    } else {
        showView('view-songs');
        await loadSongs();
    }
}

// --- REPERTOIRES LOGIC ---

async function loadRepertoires() {
    const listContainer = document.getElementById('repertoires-list');
    listContainer.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm text-secondary" role="status"></div></div>';

    const { data: repertoires, error } = await supabase
        .from('repertoires')
        .select('*')
        .order('fecha', { ascending: false });

    if (error) {
        listContainer.innerHTML = 'Error cargando repertorios.';
        return;
    }

    listContainer.innerHTML = '';
    repertoires.forEach(rep => {
        const col = document.createElement('div');
        col.className = 'col-md-4';
        col.innerHTML = `
            <div class="card repertoire-card h-100 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">${rep.titulo}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${rep.fecha || ''} ${rep.hora || ''}</h6>
                    <p class="card-text small">Director: ${rep.director || '-'}</p>
                </div>
            </div>
        `;
        col.querySelector('.card').addEventListener('click', () => openRepertoire(rep));
        listContainer.appendChild(col);
    });
}

async function openRepertoire(rep) {
    currentRepertoire = rep;
    toggleRepertoireEditMode(false); // Reset edit mode

    document.getElementById('rep-detail-title').textContent = rep.titulo;

    if (rep.fecha) {
        const dateParts = rep.fecha.split('-'); // YYYY-MM-DD
        document.getElementById('rep-detail-date').textContent = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    } else {
        document.getElementById('rep-detail-date').textContent = '';
    }
    
    if (rep.hora) {
        const timeParts = rep.hora.split(':'); // HH:MM:SS
        document.getElementById('rep-detail-time').textContent = `${timeParts[0]}:${timeParts[1]}`;
    } else {
        document.getElementById('rep-detail-time').textContent = '';
    }
    
    const uniformEl = document.getElementById('rep-uniform-display');
    if (rep.uniforme) {
        uniformEl.textContent = `Uniforme: ${rep.uniforme}`;
        uniformEl.classList.remove('d-none');
    } else {
        uniformEl.classList.add('d-none');
    }
    
    document.getElementById('rep-director').textContent = rep.director || '-';
    document.getElementById('rep-singers').textContent = rep.coristas || '-';
    document.getElementById('rep-piano').textContent = rep.teclado || '-';
    document.getElementById('rep-guitar').textContent = rep.guitarra || '-';
    document.getElementById('rep-drums').textContent = rep.bateria || '-';
    document.getElementById('rep-bass').textContent = rep.bajo || '-';

    // Populate edit fields for later
    document.getElementById('edit-rep-title').value = rep.titulo || '';
    document.getElementById('edit-rep-date').value = rep.fecha || '';
    document.getElementById('edit-rep-time').value = rep.hora ? rep.hora.substring(0, 5) : ''; // HH:MM
    document.getElementById('edit-rep-uniform').value = rep.uniforme || '';
    document.getElementById('edit-rep-director').value = rep.director || '';
    document.getElementById('edit-rep-singers').value = rep.coristas || '';
    document.getElementById('edit-rep-piano').value = rep.teclado || '';
    document.getElementById('edit-rep-guitar').value = rep.guitarra || '';
    document.getElementById('edit-rep-drums').value = rep.bateria || '';
    document.getElementById('edit-rep-bass').value = rep.bajo || '';

    await loadRepertoireSongs(rep.id);
    showView('view-repertoire-detail');
}

async function loadRepertoireSongs(repId) {
    const list = document.getElementById('rep-songs-list');
    list.innerHTML = '<div class="text-center py-2"><div class="spinner-border spinner-border-sm text-secondary" role="status"></div></div>';

    const { data, error } = await supabase
        .from('repertoire_songs')
        .select('*, songs(*)')
        .eq('repertoire_id', repId)
        .order('orden');

    if (error) {
        console.error(error);
        list.innerHTML = '<li class="text-danger">Error cargando las canciones.</li>';
        return;
    }

    list.innerHTML = '';
    
    // Agrupar por sección
    const sections = {};
    data.forEach((item) => {
        const section = item.section || 'Sin Sección';
        if (!sections[section]) {
            sections[section] = [];
        }
        sections[section].push(item);
    });

    // Ordenar secciones
    const sectionOrder = [
        'HIMNOS DE GLORIA Y TRIUNFO',
        'ALABANZAS DE JUBILO',
        'ALABANZAS DE ADORACION',
        'OFRENDA'
    ];
    
    const sortedKeys = Object.keys(sections).sort((a, b) => {
        const idxA = sectionOrder.indexOf(a);
        const idxB = sectionOrder.indexOf(b);
        if (idxA === -1 && idxB === -1) return a.localeCompare(b);
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
    });

    // Renderizar por sección
    let songIndex = 1;
    sortedKeys.forEach(sectionName => {
        // Título de la sección
        const sectionHeader = document.createElement('li');
        sectionHeader.className = 'rep-section-header';
        sectionHeader.textContent = sectionName;
        list.appendChild(sectionHeader);

        // Canciones en la sección
        sections[sectionName].forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'd-flex justify-content-between align-items-center rep-song-item';
            
            // ID para Drag & Drop
            li.dataset.id = item.id;
            
            if (userProfile.rol === 'admin') {
                li.draggable = true;
                addDragEvents(li);
            }

            const songText = document.createElement('div');
            songText.style.flex = '1';

            let displayTitle = item.songs.titulo;
            if (item.songs.tipo === 'himno') {
                displayTitle = `#${item.songs.titulo}`;
                if (item.songs.autor) {
                    displayTitle += ` - ${item.songs.autor}`;
                }
            }

            const authorHtml = (item.songs.autor && item.songs.tipo !== 'himno') ? `<small class="text-muted fw-normal ms-2" style="font-size: 0.5em; vertical-align: middle; letter-spacing: 0;">${item.songs.autor}</small>` : '';

            // Mostrar el tono guardado para el repertorio, o el original si no hay específico
            const toneToDisplay = item.tono || item.songs.tono_original || '-';
            songText.innerHTML = `<span class="rep-song-index">•</span><span class="rep-song-title">${displayTitle}${authorHtml}</span> <span class="badge bg-white text-dark border border-dark ms-2 rep-key-badge" style="vertical-align: middle; border-color: currentColor !important;">${toneToDisplay}</span>`;
            
            li.appendChild(songText);
            
            if (userProfile.rol === 'admin') {
                const keyBadge = li.querySelector('.rep-key-badge');
                keyBadge.style.cursor = 'pointer';
                keyBadge.title = 'Click para cambiar tono';
                keyBadge.addEventListener('click', (e) => {
                    e.stopPropagation();
                    editRepertoireSongKey(item);
                });

                const btn = document.createElement('button');
                btn.className = 'btn btn-sm btn-outline-danger no-export';
                btn.style.marginLeft = '0.5rem';
                btn.innerHTML = '&times;';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    removeSongFromRepertoire(item.id);
                };
                li.appendChild(btn);
            }
            
            // Click para ver la canción
            li.style.cursor = 'pointer';
            li.onclick = () => openSong(item.songs, item.tono || item.songs.tono_original, 'view-repertoire-detail');

            list.appendChild(li);
            songIndex++;
        });
    });
}

// --- DRAG AND DROP LOGIC ---
let draggedItem = null;

function addDragEvents(item) {
    item.addEventListener('dragstart', function(e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = 'move';
        this.classList.add('opacity-50');
    });

    item.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const list = document.getElementById('rep-songs-list');
        const afterElement = getDragAfterElement(list, e.clientY);
        
        if (afterElement == null) {
            list.appendChild(draggedItem);
        } else {
            list.insertBefore(draggedItem, afterElement);
        }
    });

    item.addEventListener('dragend', function() {
        this.classList.remove('opacity-50');
        draggedItem = null;
        updateRepertoireOrder();
    });
}

function getDragAfterElement(container, y) {
    // Incluimos headers y songs para poder soltar entre ellos
    const draggableElements = [...container.querySelectorAll('.rep-song-item:not(.opacity-50), .rep-section-header')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

async function updateRepertoireOrder() {
    const list = document.getElementById('rep-songs-list');
    const items = list.children;
    let currentSection = '';
    let orderCounter = 1;
    const updates = [];

    for (let item of items) {
        if (item.classList.contains('rep-section-header')) {
            currentSection = item.textContent;
        } else if (item.classList.contains('rep-song-item')) {
            const id = item.dataset.id;
            if (id) {
                updates.push({
                    id: id,
                    orden: orderCounter++,
                    section: currentSection
                });
            }
        }
    }

    // Actualizar en segundo plano
    const promises = updates.map(u => 
        supabase.from('repertoire_songs')
            .update({ orden: u.orden, section: u.section })
            .eq('id', u.id)
    );

    await Promise.all(promises);
    // Opcional: showToast('Orden actualizado', 'success');
}

function toggleRepertoireEditMode(isEditing) {
    const view = document.getElementById('view-repertoire-detail');
    const displayElements = view.querySelectorAll('#rep-detail-title, #rep-detail-date, #rep-detail-time, #rep-director, #rep-singers, #rep-piano, #rep-guitar, #rep-drums, #rep-bass');
    const editElements = view.querySelectorAll('#edit-rep-title, #edit-rep-date, #edit-rep-time, #edit-rep-uniform, #edit-rep-director, #edit-rep-singers, #edit-rep-piano, #edit-rep-guitar, #edit-rep-drums, #edit-rep-bass');

    document.getElementById('btn-edit-repertoire').classList.toggle('d-none', isEditing);
    document.getElementById('btn-save-repertoire-details').classList.toggle('d-none', !isEditing);

    displayElements.forEach(el => el.classList.toggle('d-none', isEditing));
    editElements.forEach(el => el.classList.toggle('d-none', !isEditing));

    // Special case for uniform display
    const uniformDisplay = document.getElementById('rep-uniform-display');
    if (isEditing) {
        uniformDisplay.classList.add('d-none');
    } else if (currentRepertoire && currentRepertoire.uniforme) {
        uniformDisplay.classList.remove('d-none');
    } else {
        uniformDisplay.classList.add('d-none');
    }
}

async function saveRepertoireDetails() {
    const updatedData = {
        titulo: document.getElementById('edit-rep-title').value,
        fecha: document.getElementById('edit-rep-date').value,
        hora: document.getElementById('edit-rep-time').value,
        uniforme: document.getElementById('edit-rep-uniform').value,
        director: document.getElementById('edit-rep-director').value,
        coristas: document.getElementById('edit-rep-singers').value,
        teclado: document.getElementById('edit-rep-piano').value,
        guitarra: document.getElementById('edit-rep-guitar').value,
        bateria: document.getElementById('edit-rep-drums').value,
        bajo: document.getElementById('edit-rep-bass').value,
    };

    const { data, error } = await supabase
        .from('repertoires')
        .update(updatedData)
        .eq('id', currentRepertoire.id)
        .select()
        .single();

    if (error) {
        showToast('Error al guardar los cambios: ' + error.message, 'danger');
    } else {
        await openRepertoire(data); // Re-renders the view with fresh data and exits edit mode
    }
}

async function editRepertoireSongKey(repertoireSongItem) {
    const currentKey = repertoireSongItem.tono || repertoireSongItem.songs.tono_original || '';
    const newKey = prompt('Ingresa la nueva tonalidad para esta canción en este repertorio:', currentKey);

    if (newKey !== null && newKey.trim() !== currentKey) {
        const { error } = await supabase
            .from('repertoire_songs')
            .update({ tono: newKey.trim() })
            .eq('id', repertoireSongItem.id);

        if (error) showToast('Error al actualizar la tonalidad: ' + error.message, 'danger');
        else await loadRepertoireSongs(currentRepertoire.id);
    }
}

function openRepertoireModal() {
    document.getElementById('repertoire-form').reset();
    repertoireModal.show();
}

async function saveRepertoire() {
    const titulo = document.getElementById('rep-title').value;
    const fecha = document.getElementById('rep-date').value;
    const hora = document.getElementById('rep-time').value;
    
    if (!titulo || !fecha || !hora) {
        showToast('Por favor completa título, fecha y hora', 'warning');
        return;
    }

    const data = {
        titulo: titulo,
        fecha: fecha,
        hora: hora,
        director: document.getElementById('rep-director-input').value,
        uniforme: document.getElementById('rep-uniform').value,
        coristas: document.getElementById('rep-singers-input').value,
        teclado: document.getElementById('rep-piano-input').value,
        guitarra: document.getElementById('rep-guitar-input').value,
        bateria: document.getElementById('rep-drums-input').value,
        bajo: document.getElementById('rep-bass-input').value,
        created_by: userProfile.id
    };

    const { error } = await supabase.from('repertoires').insert([data]);
    if (error) {
        showToast('Error guardando: ' + error.message, 'danger');
    } else {
        showToast('Repertorio creado exitosamente', 'success');
        repertoireModal.hide();
        await loadRepertoires();
    }
}

async function deleteRepertoire() {
    if (!confirm('¿Eliminar este repertorio?')) return;
    await supabase.from('repertoires').delete().eq('id', currentRepertoire.id);
    showView('view-repertoires');
    loadRepertoires();
}

async function openAddSongModal() {
    const select = document.getElementById('select-song-to-add');
    select.innerHTML = '<option>Cargando...</option>';
    document.getElementById('input-song-search').value = '';
    document.getElementById('input-song-key-repertoire').value = '';
    
    // Cargamos id, titulo, tipo, autor y tono_original
    const { data: songs } = await supabase.from('songs').select('id, titulo, tipo, autor, tono_original').order('titulo');
    allSongsForModal = songs || [];
    
    // Aplicar filtro inicial basado en la sección seleccionada por defecto
    updateSongSelectOptions();
    
    addSongModal.show();
}

function updateSongSelectOptions() {
    const section = document.getElementById('input-song-section').value;
    const searchQuery = document.getElementById('input-song-search').value.toLowerCase();
    const select = document.getElementById('select-song-to-add');
    select.innerHTML = '';
    
    let filteredSongs = [];
    if (section === 'HIMNOS DE GLORIA Y TRIUNFO') {
        filteredSongs = allSongsForModal.filter(s => s.tipo === 'himno');
    } else if (section === 'ALABANZAS DE JUBILO') {
        filteredSongs = allSongsForModal.filter(s => s.tipo === 'jubilo');
    } else if (section === 'ALABANZAS DE ADORACION') {
        filteredSongs = allSongsForModal.filter(s => s.tipo === 'adoracion');
    } else if (section === 'OFRENDA') {
        // Jubilo sirve para ofrenda
        filteredSongs = allSongsForModal.filter(s => s.tipo === 'jubilo' || s.tipo === 'ofrenda');
    } else {
        filteredSongs = allSongsForModal;
    }

    // Filtrar por búsqueda de texto (título, número o autor)
    if (searchQuery) {
        filteredSongs = filteredSongs.filter(s => {
            const titleMatch = s.titulo.toLowerCase().includes(searchQuery);
            const authorMatch = s.autor && s.autor.toLowerCase().includes(searchQuery);
            // Para himnos, el título suele ser el número
            return titleMatch || authorMatch;
        });
    }
    
    if (filteredSongs.length === 0) {
        const opt = document.createElement('option');
        opt.textContent = '-- No hay canciones disponibles --';
        select.appendChild(opt);
    } else {
        filteredSongs.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            if (s.tipo === 'himno' && s.autor) {
                opt.textContent = `#${s.titulo} - ${s.autor}`;
            } else {
                opt.textContent = s.titulo;
            }
            select.appendChild(opt);
        });
    }
    // Actualizar el input de tono con la primera opción seleccionada por defecto
    updateRepertoireKeyInput();
}

function updateRepertoireKeyInput() {
    const select = document.getElementById('select-song-to-add');
    const songId = select.value;
    const song = allSongsForModal.find(s => s.id == songId);
    
    if (song) {
        document.getElementById('input-song-key-repertoire').value = song.tono_original || '';
    } else {
        document.getElementById('input-song-key-repertoire').value = '';
    }
}

async function addSongToRepertoire() {
    const songId = document.getElementById('select-song-to-add').value;
    if (!songId) {
        showToast('Por favor selecciona una canción', 'warning');
        return;
    }

    const section = document.getElementById('input-song-section').value.trim();
    const tono = document.getElementById('input-song-key-repertoire').value.trim();

    const { error } = await supabase.from('repertoire_songs').insert([{
        repertoire_id: currentRepertoire.id,
        song_id: songId,
        orden: document.getElementById('rep-songs-list').querySelectorAll('li').length + 1,
        section: section || null,
        tono: tono || null // Guardamos el tono específico para este repertorio
    }]);
    
    if (error) {
        showToast('Error al agregar la canción: ' + error.message, 'danger');
    } else {
        showToast('Canción agregada', 'success');
        addSongModal.hide();
        loadRepertoireSongs(currentRepertoire.id);
    }
}

async function removeSongFromRepertoire(itemId) {
    if (!confirm('¿Quitar canción?')) return;
    await supabase.from('repertoire_songs').delete().eq('id', itemId);
    loadRepertoireSongs(currentRepertoire.id);
}

async function populateMusicianSelectors() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('nombre')
        .order('nombre');

    if (error) {
        console.error("Error cargando perfiles de músicos:", error);
        return;
    }

    const datalist = document.getElementById('musicians-list');
    if (!datalist) return;
    datalist.innerHTML = '';
    
    profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.nombre;
        datalist.appendChild(option);
    });
}

function getYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// --- IMPORT LOGIC ---

function processImport() {
    const text = document.getElementById('import-textarea').value;
    const smartConvert = document.getElementById('chk-smart-convert').checked;
    
    let processedText = text;
    if (smartConvert) {
        processedText = convertChordsOverLyrics(text);
    }
    
    document.getElementById('song-lyrics-input').value = processedText;
    importModal.hide();
}

function convertChordsOverLyrics(text) {
    // Normalizar tabs a espacios para mantener alineación relativa
    text = text.replace(/\t/g, '    ');

    const lines = text.split('\n');
    const output = [];
    // Regex to detect section headers like (Coro), Verso 1, Puente:, etc.
    const sectionHeaderRegex = /^\s*(\(?(verso|verse|coro|chorus|estribillo|puente|bridge|intro|outro|solo|estrofa|pre-coro|pre-chorus)\b.*)/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim(); // Alinear a la izquierda quitando espacios iniciales
        
        // Evitar líneas vacías excesivas para un interlineado "cabalito"
        if (!line) {
            if (output.length > 0 && output[output.length - 1] !== '') {
                output.push('');
            }
            continue;
        }
        
        // 1. Check for section headers
        if (sectionHeaderRegex.test(line)) {
            // Asegurar solo un salto de línea antes de la sección
            if (output.length > 0 && output[output.length - 1] !== '') {
                output.push('');
            }
            output.push(line);
            continue;
        }

        // 2. Check for chord lines
        if (isChordLine(line)) {
            // Look ahead for a lyric line
            if (i + 1 < lines.length) {
                const nextLine = lines[i+1].trim();
                // Make sure next line is not a chord line, not a section header, and not empty
                if (nextLine.trim().length > 0 && !isChordLine(nextLine) && !sectionHeaderRegex.test(nextLine)) {
                    // Merge chord line with lyric line
                    output.push(mergeLines(line, nextLine));
                    i++; // Skip the next line as it's already processed
                    continue;
                }
            }
            // If it's a chord line with no lyrics below (e.g., instrumental part), just wrap chords
            const chordExtractRegex = /([A-G][#b]?(?:[0-9]|m|M|i|n|a|j|d|u|g|s|b|#|-|\+|°|ø|(?:\([^)]*\)))*(?:\/[A-G][#b]?(?:[0-9]|m|M|i|n|a|j|d|u|g|s|b|#|-|\+|°|ø|(?:\([^)]*\)))*)?)|(N\.?C\.?)/gi;
            output.push(line.replace(chordExtractRegex, '[$1$2]'));
        } else {
            // 3. It's a lyric line (or empty line)
            output.push(line);
        }
    }
    return output.join('\n');
}

function isChordLine(line) {
    if (!line.trim()) return false;
    const tokens = line.trim().split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) return false;
    
    // Regex mejorado para acordes complejos y Slash Chords
    const chordRegex = /^([A-G][#b]?)(?:[0-9]|m|M|i|n|a|j|d|u|g|s|b|#|-|\+|°|ø|(?:\([^)]*\)))*(?:\/[A-G][#b]?(?:[0-9]|m|M|i|n|a|j|d|u|g|s|b|#|-|\+|°|ø|(?:\([^)]*\)))*)?$/;
    const ncRegex = /^N\.?C\.?$/i;
    
    // Symbols often found in chord lines (bars, repeats, etc)
    const symbolRegex = /^(\||\/|%|\\|-|\.|:|\(|\)|\[|\]|x\d+|\d+x)+$/i;

    // If any token is a long word (>12 chars) that is not a chord, it's likely lyrics.
    if (tokens.some(token => token.length > 12 && !chordRegex.test(token))) {
        return false;
    }
    
    let chordCount = 0;
    let validCount = 0;

    tokens.forEach(token => {
        // 1. Intentar match directo (ej: C(add9))
        if (chordRegex.test(token) || ncRegex.test(token)) {
            chordCount++;
            validCount++;
        } else {
            // 2. Intentar limpiando paréntesis/barras externos (ej: (C) o |C|)
            const cleanToken = token.replace(/^[\(\|\[]+|[\)\|\]]+$/g, ''); // Agregado soporte para brackets y limpieza más agresiva
            if (chordRegex.test(cleanToken) || ncRegex.test(cleanToken)) {
                chordCount++;
                validCount++;
            } else if (symbolRegex.test(token)) {
                validCount++;
            }
        }
    });
    
    // Must have at least one actual chord
    if (chordCount === 0) return false;

    // If at least 50% of tokens are chords or valid symbols, consider it a chord line.
    return (validCount / tokens.length) >= 0.5;
}

function mergeLines(chordLine, lyricLine) {
    const chords = [];
    // Regex matching isChordLine logic but global
    const regex = /([A-G][#b]?(?:[0-9]|m|M|i|n|a|j|d|u|g|s|b|#|-|\+|°|ø|(?:\([^)]*\)))*(?:\/[A-G][#b]?(?:[0-9]|m|M|i|n|a|j|d|u|g|s|b|#|-|\+|°|ø|(?:\([^)]*\)))*)?)|(N\.?C\.?)/gi;
    
    let match;
    while ((match = regex.exec(chordLine)) !== null) {
        chords.push({ text: match[0], index: match.index });
    }
    
    // Insertar de atrás hacia adelante para no alterar índices
    chords.sort((a, b) => b.index - a.index);
    
    let result = lyricLine;
    chords.forEach(chord => {
        const tag = `[${chord.text}]`;
        if (chord.index >= result.length) {
            result += " " + tag;
        } else {
            result = result.slice(0, chord.index) + tag + result.slice(chord.index);
        }
    });
    return result;
}

async function handleBulkImport() {
    const statusList = document.getElementById('bulk-import-status');
    
    // Función interna para procesar una lista de archivos (File objects)
    const processFiles = async (files) => {
        statusList.innerHTML = '';
        bulkImportModal.show();
        
        try {
            // Obtener himnos existentes
            const { data: existingHymns, error: fetchError } = await supabase
                .from('songs')
                .select('titulo')
                .eq('tipo', 'himno');

            if (fetchError) {
                statusList.innerHTML = `<li class="list-group-item list-group-item-danger">Error al obtener himnos existentes: ${fetchError.message}</li>`;
                return;
            }
            const existingTitles = new Set(existingHymns.map(h => h.titulo));

            let importCount = 0;
            let skippedCount = 0;

            for (const file of files) {
                if (!file.name.endsWith('.txt')) continue;

                const hymnNumber = file.name.replace(/\.txt$/, '').trim();
                
                let statusItem = document.createElement('li');
                statusItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                statusItem.textContent = `Procesando: ${file.name}`;
                statusList.appendChild(statusItem);

                if (existingTitles.has(hymnNumber)) {
                    statusItem.innerHTML = `Omitido (ya existe): ${file.name} <span class="badge bg-warning text-dark">Omitido</span>`;
                    skippedCount++;
                    continue;
                }

                const content = await file.text();
                const lines = content.split('\n');
                // El título es la primera línea no vacía del archivo.
                let hymnTitle = lines.find(line => line.trim() !== '') || 'Sin Título';
                // Limpiar el número del título si ya está presente al inicio de la línea
                hymnTitle = hymnTitle.replace(/^\d+\s*[\.-]?\s*/, '').trim();
                const processedLyrics = convertChordsOverLyrics(content);

                const { error: insertError } = await supabase.from('songs').insert([{
                    titulo: hymnNumber,      // El número del himno
                    autor: hymnTitle,       // El título real del himno
                    tipo: 'himno',
                    letra_acordes: processedLyrics,
                    created_by: userProfile.id
                }]);

                if (insertError) {
                    statusItem.innerHTML = `Error importando ${file.name}: ${insertError.message} <span class="badge bg-danger">Error</span>`;
                } else {
                    statusItem.innerHTML = `${file.name} <span class="badge bg-success">Importado</span>`;
                    importCount++;
                }
            }
            
            const summaryItem = document.createElement('li');
            summaryItem.className = 'list-group-item list-group-item-info';
            summaryItem.innerHTML = `<strong>Proceso finalizado.</strong> Importados: ${importCount}, Omitidos: ${skippedCount}.`;
            statusList.prepend(summaryItem);

            await loadSongs();
        } catch (err) {
            console.error('Error procesando archivos:', err);
            statusList.innerHTML = `<li class="list-group-item list-group-item-danger">Error: ${err.message}</li>`;
        }
    };

    // Estrategia 1: File System Access API (Chrome, Edge, Desktop)
    if (window.showDirectoryPicker) {
        try {
            const dirHandle = await window.showDirectoryPicker();
            const files = [];
            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file' && entry.name.endsWith('.txt')) {
                    files.push(await entry.getFile());
                }
            }
            await processFiles(files);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error seleccionando carpeta:', err);
                showToast('Error al seleccionar carpeta: ' + err.message, 'danger');
            }
        }
    } 
    // Estrategia 2: Fallback input (Brave, Firefox, Safari, Mobile)
    else {
        const input = document.createElement('input');
        input.type = 'file';
        input.webkitdirectory = true;
        input.multiple = true;
        input.style.display = 'none';
        document.body.appendChild(input);
        
        input.onchange = async (e) => {
            if (e.target.files.length > 0) {
                await processFiles(Array.from(e.target.files));
            }
            document.body.removeChild(input);
        };
        
        input.click();
    }
}