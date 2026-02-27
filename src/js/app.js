import { supabase } from './supabaseClient.js';
import { getCurrentProfile, logout } from './auth.js';
import { renderSong } from './chords-render.js';
import { scales } from './transpose.js';

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
let currentFontSize = 16;
let scrollInterval = null;

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

    document.getElementById('nav-home').addEventListener('click', (e) => {
        e.preventDefault();
        closeNavbar();
        showView('view-home');
    });

    document.getElementById('back-to-songs').addEventListener('click', () => {
        showView('view-songs');
    });
    document.getElementById('back-to-repertoires').addEventListener('click', () => {
        showView('view-repertoires');
    });

    // 3. Event Listeners Transposición
    document.getElementById('btn-transpose-menu').addEventListener('click', openTransposeModal);
    document.getElementById('btn-font-plus').addEventListener('click', () => changeFontSize(2));
    document.getElementById('btn-font-minus').addEventListener('click', () => changeFontSize(-2));
    document.getElementById('btn-columns').addEventListener('click', toggleColumns);
    document.getElementById('btn-auto-scroll').addEventListener('click', toggleAutoScroll);

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
    document.getElementById('btn-add-song-to-rep').addEventListener('click', openAddSongModal);
    document.getElementById('btn-confirm-add-song').addEventListener('click', addSongToRepertoire);
    document.getElementById('input-song-section').addEventListener('change', updateSongSelectOptions);
    document.getElementById('input-song-search').addEventListener('input', updateSongSelectOptions);
    document.getElementById('select-song-to-add').addEventListener('change', updateRepertoireKeyInput);
    document.getElementById('btn-bulk-import').addEventListener('click', handleBulkImport);
    document.getElementById('btn-delete-all-hymns').addEventListener('click', deleteAllHymns);
    document.getElementById('song-type').addEventListener('change', toggleYoutubeInput);

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

        // Usar el nombre del archivo (sin extensión) como título
        document.getElementById('song-title').value = file.name.replace(/\.[^/.]+$/, "");

        const reader = new FileReader();
        reader.onload = (event) => {
            document.getElementById('import-textarea').value = event.target.result;
        };
        reader.readAsText(file);
    });
});

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
        alert('Hubo un error al exportar la imagen.');
    } finally {
        elementsToHide.forEach(el => el.style.display = '');
    }
}

function showView(viewId) {
    ['view-home', 'view-songs', 'view-song-detail', 'view-repertoires', 'view-repertoire-detail'].forEach(id => {
        document.getElementById(id).classList.add('d-none');
    });
    document.getElementById(viewId).classList.remove('d-none');
}

function closeNavbar() {
    const navbarCollapse = document.getElementById('navbarNav');
    if (navbarCollapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse) || new bootstrap.Collapse(navbarCollapse, { toggle: false });
        bsCollapse.hide();
    }
}

async function loadSongs() {
    const hymnsList = document.getElementById('hymns-list');
    const worshipList = document.getElementById('worship-list');
    
    hymnsList.innerHTML = '<div class="spinner-border" role="status"></div>';
    worshipList.innerHTML = '<div class="spinner-border" role="status"></div>';

    const { data: songs, error } = await supabase
        .from('songs')
        .select('*')
        .order('titulo');

    if (error) {
        console.error(error);
        hymnsList.innerHTML = 'Error cargando canciones.';
        worshipList.innerHTML = '';
        return;
    }

    hymnsList.innerHTML = '';
    worshipList.innerHTML = '';

    songs.forEach(song => {
        const item = document.createElement('a');
        item.className = 'list-group-item list-group-item-action';
        item.href = '#';
        
        // Formato diferente para himnos (énfasis en número si es numérico)
        if (song.tipo === 'himno') {
            const displayTitle = song.autor ? ` - ${song.autor}` : '';
            item.innerHTML = `<span class="fw-bold">#${song.titulo}${displayTitle}</span> <span class="badge bg-secondary float-end">${song.tono_original || '-'}</span>`;
        } else {
            item.innerHTML = `${song.titulo} <span class="badge bg-secondary float-end">${song.tono_original || '-'}</span>`;
        }

        item.addEventListener('click', (e) => {
            e.preventDefault();
            openSong(song);
        });

        if (song.tipo === 'himno') {
            hymnsList.appendChild(item);
        } else {
            worshipList.appendChild(item);
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

function openSong(song) {
    currentSong = song;
    currentSemitones = 0;
    const { suffix } = getSongRootAndSuffix(song.tono_original);
    currentTransposedSuffix = suffix;
    
    // Reset View State
    currentFontSize = 16;
    updateFontSize();
    document.getElementById('song-lyrics').classList.remove('lyrics-columns-2');
    stopAutoScroll();
    
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
    btn.textContent = `Tono: ${getCurrentKeyLabel()}`;
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

function toggleColumns() {
    document.getElementById('song-lyrics').classList.toggle('lyrics-columns-2');
}

function toggleAutoScroll() {
    const btn = document.getElementById('btn-auto-scroll');
    if (scrollInterval) {
        stopAutoScroll();
    } else {
        btn.textContent = '⏹';
        btn.classList.replace('btn-outline-success', 'btn-danger');
        scrollInterval = setInterval(() => window.scrollBy(0, 1), 50);
    }
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
        alert('Error guardando: ' + error.message);
    } else {
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

async function deleteAllHymns() {
    if (!confirm('⚠️ ¿ESTÁS SEGURO? \n\nEsto eliminará TODOS los himnos de la base de datos. \nÚsalo solo si quieres limpiar una importación incorrecta.\n\nEsta acción no se puede deshacer.')) return;
    
    const { error } = await supabase
        .from('songs')
        .delete()
        .eq('tipo', 'himno');

    if (error) {
        alert('Error eliminando himnos: ' + error.message);
    } else {
        alert('Todos los himnos han sido eliminados correctamente.');
        await loadSongs();
    }
}

async function deleteSong() {
    if (!confirm('¿Estás seguro de eliminar esta canción?')) return;

    const { error } = await supabase.from('songs').delete().eq('id', currentSong.id);
    
    if (error) {
        alert('Error eliminando: ' + error.message);
    } else {
        showView('view-songs');
        await loadSongs();
    }
}

// --- REPERTOIRES LOGIC ---

async function loadRepertoires() {
    const listContainer = document.getElementById('repertoires-list');
    listContainer.innerHTML = '<div class="spinner-border" role="status"></div>';

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
    document.getElementById('rep-detail-title').textContent = rep.titulo;
    document.getElementById('rep-detail-date').textContent = rep.fecha;
    document.getElementById('rep-detail-time').textContent = rep.hora;
    
    const uniformEl = document.getElementById('rep-uniform-display');
    if (rep.uniforme) {
        uniformEl.textContent = `Uniforme: ${rep.uniforme}`;
        uniformEl.style.display = 'inline-block';
    } else {
        uniformEl.style.display = 'none';
    }
    
    document.getElementById('rep-director').textContent = rep.director || '-';
    document.getElementById('rep-singers').textContent = rep.coristas || '-';
    document.getElementById('rep-piano').textContent = rep.teclado || '-';
    document.getElementById('rep-guitar').textContent = rep.guitarra || '-';
    document.getElementById('rep-drums').textContent = rep.bateria || '-';
    document.getElementById('rep-bass').textContent = rep.bajo || '-';

    await loadRepertoireSongs(rep.id);
    showView('view-repertoire-detail');
}

async function loadRepertoireSongs(repId) {
    const list = document.getElementById('rep-songs-list');
    list.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

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
            
            const songText = document.createElement('div');
            songText.style.flex = '1';

            let displayTitle = item.songs.titulo;
            if (item.songs.tipo === 'himno' && item.songs.autor) {
                displayTitle = `#${item.songs.titulo} - ${item.songs.autor}`;
            }

            // Mostrar el tono guardado para el repertorio, o el original si no hay específico
            const toneToDisplay = item.tono || item.songs.tono_original || '-';
            songText.innerHTML = `<span class="rep-song-index">•</span><span class="rep-song-title">${displayTitle}</span> <span class="badge bg-white text-dark border border-dark ms-2 rep-key-badge" style="vertical-align: middle; border-color: currentColor !important;">${toneToDisplay}</span>`;
            
            li.appendChild(songText);
            
            if (userProfile.rol === 'admin') {
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
            li.onclick = () => openSong(item.songs);

            list.appendChild(li);
            songIndex++;
        });
    });
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
        alert('Por favor completa título, fecha y hora');
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
        alert('Error guardando: ' + error.message);
    } else {
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
        alert('Por favor selecciona una canción');
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
        alert('Error al agregar la canción: ' + error.message);
    } else {
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
    const lines = text.split('\n');
    const output = [];
    // Regex to detect section headers like (Coro), Verso 1, Puente:, etc.
    const sectionHeaderRegex = /^\s*(\(?(verso|verse|coro|chorus|estribillo|puente|bridge|intro|outro|solo|estrofa|pre-coro|pre-chorus)\b.*)/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trimEnd();
        
        // 1. Check for section headers
        if (sectionHeaderRegex.test(line)) {
            // It's a title, keep it as is, maybe add a blank line before for spacing
            if (output.length > 0 && output[output.length - 1].trim() !== '') {
                output.push('');
            }
            output.push(line);
            continue;
        }

        // 2. Check for chord lines
        if (isChordLine(line)) {
            // Look ahead for a lyric line
            if (i + 1 < lines.length) {
                const nextLine = lines[i+1].trimEnd();
                // Make sure next line is not a chord line, not a section header, and not empty
                if (nextLine.trim().length > 0 && !isChordLine(nextLine) && !sectionHeaderRegex.test(nextLine)) {
                    // Merge chord line with lyric line
                    output.push(mergeLines(line, nextLine));
                    i++; // Skip the next line as it's already processed
                    continue;
                }
            }
            // If it's a chord line with no lyrics below (e.g., instrumental part), just wrap chords
            output.push(line.replace(/([A-G][#b]?(?:m|min|maj|dim|aug|sus|add|7|9|11|13|6|\/|[0-9]|\(|\))*)/g, '[$1]'));
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

    // Regex flexible para acordes
    const chordRegex = /^([A-G][#b]?)(m|min|maj|dim|aug|sus|add|7|9|11|13|6|\/|[0-9]|\(|\))*$/;
    
    // If any token is a long word that is not a chord, it's a lyric line.
    if (tokens.some(token => token.length > 6 && !chordRegex.test(token))) {
        return false;
    }

    const chordTokens = tokens.filter(token => chordRegex.test(token));
    
    // If there are no chords, it's not a chord line.
    if (chordTokens.length === 0) return false;

    // If at least 50% of tokens are chords, consider it a chord line.
    return (chordTokens.length / tokens.length) >= 0.5;
}

function mergeLines(chordLine, lyricLine) {
    const chords = [];
    const regex = /([A-G][#b]?(?:m|min|maj|dim|aug|sus|add|7|9|11|13|6|\/|[0-9]|\(|\))*)/g;
    let match;
    while ((match = regex.exec(chordLine)) !== null) {
        chords.push({ text: match[1], index: match.index });
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
                alert('Error al seleccionar carpeta: ' + err.message);
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