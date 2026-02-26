import html2canvas from 'html2canvas';

/**
 * Capture a DOM element as a PNG blob and share it via the Web Share API
 * (with file support) or fall back to a download.
 */
export async function shareCardAsImage(
    element: HTMLElement | null,
    filename: string = 'karmquest-card.png',
    shareTitle: string = 'KarmQuest'
): Promise<'shared' | 'downloaded' | 'failed'> {
    if (!element) return 'failed';

    try {
        const canvas = await html2canvas(element, {
            backgroundColor: null,
            scale: 2, // retina-quality
            useCORS: true,
            logging: false,
        });

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, 'image/png', 1)
        );

        if (!blob) return 'failed';

        const file = new File([blob], filename, { type: 'image/png' });

        // Try native Web Share API with file support
        if (
            'share' in navigator &&
            typeof (navigator as any).canShare === 'function' &&
            (navigator as any).canShare({ files: [file] })
        ) {
            try {
                await navigator.share({
                    title: shareTitle,
                    files: [file],
                });
                return 'shared';
            } catch {
                // User cancelled or failed — fall through to download
            }
        }

        // Fallback: download the image directly
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return 'downloaded';
    } catch {
        return 'failed';
    }
}
