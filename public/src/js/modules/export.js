import { showToast } from './ui.js';

export async function exportElementAsPNG(element, filename, options = {}) {
    // Si estamos exportando el Repertorio, usamos Off-Screen Rendering
    if (element.id === 'repertoire-content') {
        return await exportRepertoireOffScreen(element, filename);
    }

    // Para canciones — ocultar elementos que no deben aparecer en export
    const elementsToHide = element.querySelectorAll('.no-export');
    const originalDisplay = new Map();
    
    showToast('Preparando imagen...', 'info');
    elementsToHide.forEach(el => {
        originalDisplay.set(el, window.getComputedStyle(el).display);
        el.style.display = 'none';
    });

    // Detectar si estamos en tema oscuro
    const isDarkTheme = document.documentElement.getAttribute('data-theme') === 'dark';
    const bgColor = isDarkTheme ? '#1f1f1f' : '#ffffff';
    const textColor = isDarkTheme ? '#fafafa' : '#000000';

    try {
        const canvas = await html2canvas(element, {
            backgroundColor: bgColor,
            scale: 3,
            useCORS: true,
            logging: false,
            allowTaint: true,
            windowHeight: element.scrollHeight,
            ...options,
        });
        
        showToast('Exportación completada', 'success');
        triggerDownload(canvas, filename);
    } catch (err) {
        console.error('Error exportando a PNG:', err);
        showToast('Hubo un error al exportar la imagen.', 'danger');
    } finally {
        // Restaurar display original usando el Map para evitar errores de índice
        elementsToHide.forEach((el) => {
            const oldDisplay = originalDisplay.get(el);
            el.style.display = oldDisplay || '';
        });
    }
}

async function exportRepertoireOffScreen(originalElement, filename) {
    showToast('Generando imagen de alta calidad...', 'info');
    
    // Detectar tema
    const currentTheme = originalElement.className.match(/(theme-\w+)/);
    const themeClass = currentTheme ? currentTheme[1] : 'theme-morning';
    const isMorning = themeClass === 'theme-morning';
    const isNight = themeClass === 'theme-night';
    
    // Colores según tema
    let bgColor = '#ffffff';
    let textColor = '#000000';
    if (isNight) {
        bgColor = '#2a2a2a';
        textColor = '#f5f5f5';
    } else if (!isMorning) {
        // Tema especial u otros
        bgColor = '#ffffff';
        textColor = '#000000';
    }
    
    // ESTRATEGIA: Crear un iframe temporal para renderizar con estilos idénticos
    const iframe = document.createElement('iframe');
    // Lo posicionamos fuera de vista pero habilitado para renderizar correctamente
    iframe.style.cssText = 'position: fixed; top: 0; left: 0; width: 1200px; height: 2000px; z-index: -9999; visibility: hidden; border: none;';
    
    document.body.appendChild(iframe);
    
    // Clonar elemento original
    const clone = originalElement.cloneNode(true);
    clone.style.margin = '0 auto';
    clone.style.boxShadow = 'none';
    
    // Eliminar elementos de no-export
    clone.querySelectorAll('.no-export').forEach(el => el.remove());
    
    // Capturar todos los links de estilos y fuentes del documento actual para replicar el entorno exacto
    const headContent = Array.from(document.head.querySelectorAll('link, style'))
        .map(tag => tag.outerHTML).join('\n');

    const nightThemeStyles = isNight ? `
        #repertoire-content { background: linear-gradient(0deg, #000814 0%, #000000 100%) !important; color: #f5f5f5 !important; }
        #repertoire-content * { color: inherit; }
        .rep-header-main-title { color: #fafafa !important; }
        .rep-meta-value { color: #fafafa !important; }
        .rep-meta-label { color: #b8b8b8 !important; }
    ` : '';

    const iframeHtml = `
    <!DOCTYPE html>
    <html lang="es" data-theme="${document.documentElement.getAttribute('data-theme') || 'light'}">
    <head>
        <meta charset="UTF-8">
        ${headContent}
        <style>
            body { 
                margin: 0; 
                padding: 40px; 
                background: ${bgColor} !important; 
                display: flex; 
                justify-content: center;
                min-height: 100vh;
            }
            ${nightThemeStyles}
        </style>
    </head>
    <body></body>
    </html>
    `;
    
    // Inyectar HTML en iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(iframeHtml);
    iframeDoc.close();
    
    // Esperar a que el iframe cargue el entorno
    await new Promise(resolve => iframe.onload = resolve);
    
    // Inyectar el contenido clonado
    iframeDoc.body.appendChild(clone);

    // Dar tiempo extra para que el navegador procese los estilos aplicados y las fuentes
    await new Promise(resolve => setTimeout(resolve, 600));
    await iframe.contentWindow.document.fonts.ready;

    try {
        const canvas = await html2canvas(clone, {
            scale: 2.5, // Reducido de 4 a 2.5 para evitar "Out of Memory" en móviles
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: bgColor,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 1400
        });
        
        triggerDownload(canvas, filename);
        showToast('¡Exportación completada!', 'success');
    } catch (err) {
        console.error('Error en iframe export:', err);
        showToast('Hubo un error al exportar la imagen. Intentando con fallback...', 'danger');
        
        // Fallback simple: capturar el clon directamente del DOM principal
        try {
            const fallbackClone = originalElement.cloneNode(true);
            fallbackClone.querySelectorAll('.no-export').forEach(el => el.remove());
            fallbackClone.id = 'fallback-export-clone';
            // Aplicar estilos básicos
            fallbackClone.style.position = 'absolute';
            fallbackClone.style.left = '-9999px';
            fallbackClone.style.top = '0';
            fallbackClone.style.width = '1400px';
            fallbackClone.style.background = bgColor;
            fallbackClone.style.color = textColor;
            fallbackClone.style.padding = '40px';
            fallbackClone.style.boxSizing = 'border-box'; // Asegurar consistencia con el iframe
            
            document.body.appendChild(fallbackClone);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const fallbackCanvas = await html2canvas(fallbackClone, {
                scale: 2.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: bgColor,
                windowWidth: 1400 // Mantener consistencia en el ancho de captura
            });
            
            triggerDownload(fallbackCanvas, filename);
            showToast('¡Exportación completada!', 'success');
            document.body.removeChild(fallbackClone);
        } catch (fallbackErr) {
            console.error('Fallback error:', fallbackErr);
            showToast('No fue posible exportar. Intenta nuevamente.', 'danger');
        }
    } finally {
        // Limpiar iframe
        if (iframe.parentNode) document.body.removeChild(iframe);
    }
}

function triggerDownload(canvas, filename) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const link = document.createElement('a');
    link.download = `${filename}_${timestamp}.png`;
    link.href = canvas.toDataURL('image/png', 0.95);
    
    // Disparar descarga
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
