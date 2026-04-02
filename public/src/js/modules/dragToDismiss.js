/**
 * Habilita la funcionalidad de "Deslizar hacia abajo para cerrar" en los modales de Bootstrap 5
 * para dispositivos móviles, simulando el comportamiento de un bottom sheet.
 */
export function initDragToDismiss() {
    // Solo aplicar en pantallas móviles (según el breakpoint de mobile.css)
    if (window.innerWidth >= 768) return;

    const modals = document.querySelectorAll('.modal');

    modals.forEach(modal => {
        const content = modal.querySelector('.modal-content');
        const body = modal.querySelector('.modal-body');
        if (!content) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const handleStart = (e) => {
            // Solo permitir el arrastre si estamos al inicio del scroll del contenido
            const scrollTop = body ? body.scrollTop : 0;
            if (scrollTop > 0) return;
            
            startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            isDragging = true;
            content.style.transition = 'none';
        };

        const handleMove = (e) => {
            if (!isDragging) return;
            
            currentY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
            const deltaY = currentY - startY;

            // Solo permitimos arrastrar hacia abajo
            if (deltaY > 0) {
                // Evitar el scroll del fondo mientras se arrastra el modal
                if (e.cancelable) e.preventDefault();
                content.style.transform = `translateY(${deltaY}px)`;
            } else {
                // Si el usuario intenta subir, cancelamos el gesto de cierre para permitir scroll normal
                isDragging = false;
                content.style.transform = '';
            }
        };

        const handleEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            
            const deltaY = currentY - startY;
            const threshold = 150; // Distancia en px para activar el cierre

            content.style.transition = 'transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)';
            
            if (deltaY > threshold) {
                // Completar la animación de salida
                content.style.transform = 'translateY(100%)';
                
                // Disparar el cierre mediante la API de Bootstrap
                const bsModal = window.bootstrap?.Modal.getInstance(modal);
                if (bsModal) {
                    setTimeout(() => bsModal.hide(), 50);
                }
                
                // Resetear posición después de que el modal se oculte para que esté listo la próxima vez
                setTimeout(() => {
                    content.style.transition = 'none';
                    content.style.transform = '';
                }, 400);
            } else {
                // Volver a la posición original (efecto rebote)
                content.style.transform = 'translateY(0)';
            }
        };

        content.addEventListener('touchstart', handleStart, { passive: true });
        content.addEventListener('touchmove', handleMove, { passive: false });
        content.addEventListener('touchend', handleEnd);
    });
}