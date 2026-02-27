const exportPng = async (elementId) => {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error('Element not found');
        return;
    }

    try {
        const canvas = await html2canvas(element);
        const pngDataUrl = canvas.toDataURL('image/png');

        const link = document.createElement('a');
        link.href = pngDataUrl;
        link.download = `${elementId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error exporting PNG:', error);
    }
};

export default exportPng;