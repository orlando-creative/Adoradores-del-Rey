/**
 * Habilita la funcionalidad de "Deslizar hacia abajo para cerrar" en los modales de Bootstrap 5
 * para dispositivos móviles, simulando el comportamiento de un bottom sheet.
 */
export function initDragToDismiss() {
    const modals = document.querySelectorAll('.modal');

    modals.forEach(modal => {
        const content = modal.querySelector('.modal-content');
        const header = modal.querySelector('.modal-header');
        const body = modal.querySelector('.modal-body');
        if (!content || !header) return;

        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const handleStart = (e) => {
            if (window.innerWidth >= 768) return;
            if (e.target.closest('button, a, input, select, textarea, label')) return;
            if (body && body.scrollTop > 0) return;

            startY = e.touches[0].clientY;
            currentY = startY;
            isDragging = true;
            content.style.transition = 'none';
        };

        const handleMove = (e) => {
            if (!isDragging) return;

            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            if (Math.abs(deltaY) < 8) return;
            if (deltaY < 0) {
                isDragging = false;
                content.style.transition = '';
                content.style.transform = '';
                return;
            }

            if (e.cancelable) e.preventDefault();
            content.style.transform = `translateY(${deltaY}px)`;
        };

        const handleEnd = () => {
            if (!isDragging) return;
            isDragging = false;
            
            const deltaY = currentY - startY;
            const threshold = 120;
            content.style.transition = 'transform 120ms ease-out';
            
            if (deltaY > threshold) {
                const bsModal = window.bootstrap?.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            } else {
                content.style.transform = 'translateY(0)';
            }
        };

        const handleCancel = () => {
            isDragging = false;
            content.style.transition = '';
            content.style.transform = '';
        };

        header.addEventListener('touchstart', handleStart, { passive: true });
        header.addEventListener('touchmove', handleMove, { passive: false });
        header.addEventListener('touchend', handleEnd);
        header.addEventListener('touchcancel', handleCancel);
        modal.addEventListener('hidden.bs.modal', () => {
            content.style.transition = '';
            content.style.transform = '';
        });
    });
}