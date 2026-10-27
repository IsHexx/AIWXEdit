import { MarkdownView, type App } from 'obsidian';
import { linkedScrollPosition } from '../../utils/previewPresentation';

/** Links only the Markdown pane showing this preview's note. */
export class PreviewScrollSync {
    private source: MarkdownView | null = null;
    private expected = new WeakMap<HTMLElement, number>();
    private frame = 0;
    private enabled = true;
    private path = '';
    private disposed = false;
    private win: Window;

    constructor(private app: App, private preview: HTMLElement) {
        this.win = preview.ownerDocument.defaultView ?? window;
        preview.addEventListener('scroll', this.onPreviewScroll, { passive: true });
    }

    configure(path: string, enabled: boolean): void {
        if (this.disposed) return;
        this.path = path;
        this.enabled = enabled;
        const active = this.app.workspace.getActiveViewOfType(MarkdownView);
        const matching = active?.file?.path === path ? active : this.app.workspace.getLeavesOfType('markdown')
            .map(leaf => leaf.view).find((view): view is MarkdownView => view instanceof MarkdownView && view.file?.path === path && view.containerEl.clientHeight > 0) ?? null;
        if (matching !== this.source) {
            this.source?.containerEl.removeEventListener('scroll', this.onSourceScroll, true);
            this.source = matching;
            this.expected = new WeakMap();
            matching?.containerEl.addEventListener('scroll', this.onSourceScroll, { capture: true, passive: true });
        }
        if (!enabled && this.frame) { this.win.cancelAnimationFrame(this.frame); this.frame = 0; }
    }

    private scroller(): HTMLElement | null {
        if (this.source?.file?.path !== this.path) return null;
        return this.source.containerEl.querySelector<HTMLElement>(this.source.getMode() === 'preview' ? '.markdown-preview-view' : '.cm-scroller');
    }

    private onSourceScroll = (event: Event): void => {
        const source = this.scroller();
        if (source && event.target === source) this.transfer(source, this.preview);
    };

    private onPreviewScroll = (): void => {
        const source = this.scroller();
        if (source) this.transfer(this.preview, source);
    };

    private transfer(from: HTMLElement, to: HTMLElement): void {
        if (!this.enabled) return;
        const expected = this.expected.get(from);
        this.expected.delete(from);
        if (expected !== undefined && Math.abs(from.scrollTop - expected) < 2) return;
        if (this.frame) this.win.cancelAnimationFrame(this.frame);
        this.frame = this.win.requestAnimationFrame(() => {
            this.frame = 0;
            if (!this.enabled || !from.isConnected || !to.isConnected) return;
            const position = linkedScrollPosition(from.scrollTop, from.scrollHeight - from.clientHeight, to.scrollHeight - to.clientHeight);
            if (Math.abs(to.scrollTop - position) < 2) return;
            this.expected.set(to, position);
            to.scrollTop = position;
        });
    }

    dispose(): void {
        this.disposed = true;
        if (this.frame) this.win.cancelAnimationFrame(this.frame);
        this.preview.removeEventListener('scroll', this.onPreviewScroll);
        this.source?.containerEl.removeEventListener('scroll', this.onSourceScroll, true);
        this.source = null;
        this.enabled = false;
    }
}
