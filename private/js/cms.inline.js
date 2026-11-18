const WRAPPER_SELECTOR = '.cms-editor-inline-wrapper';

/**
 * Event boundaries for inline editing, independent of the rich text backend.
 * Backends own their UI and consume popup events before these handlers run.
 */
export default class InlineEditing {
    constructor(doc, isInitialized) {
        this.document = doc;
        this.isInitialized = isInitialized;
        this._wrappers = new WeakSet();
        this._escapeParents = new WeakSet();
        this._gestureGuardInstalled = false;
        this.handleEscape = this.handleEscape.bind(this);
    }

    findWrapper(target) {
        return target?.closest?.(WRAPPER_SELECTOR) || null;
    }

    attachEscape(wrapper) {
        const parent = wrapper.parentElement;
        if (!parent || this._escapeParents.has(parent)) return;
        this._escapeParents.add(parent);
        // Run after backend popup handlers and before CMS document shortcuts.
        parent.addEventListener('keydown', this.handleEscape);
    }

    // Backends that swallow Escape unconditionally can call this before their
    // fallback, after giving their own popups the opportunity to dismiss.
    handleEscape(event) {
        if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing ||
            event.target.closest?.('dialog, [role="dialog"], [role="toolbar"]')) return false;
        const wrapper = this.findWrapper(event.target);
        const editable = event.target.closest?.('[contenteditable]');
        const active = this.document.activeElement;
        if (!this.isInitialized(wrapper) || !editable || editable.getAttribute('contenteditable') === 'false' ||
            !wrapper.contains(editable) || !editable.contains(active)) return false;

        event.preventDefault();
        event.stopPropagation();
        this.document.getSelection()?.removeAllRanges();
        active.blur(); // The backend's existing blur handler owns saving.
        return true;
    }

    attachDoubleClick(wrapper) {
        if (!wrapper || this._wrappers.has(wrapper)) return;
        this._wrappers.add(wrapper);
        wrapper.addEventListener('dblclick', event => {
            if (event.button !== 0 || !this.isInitialized(wrapper)) return;
            // Nested plugins retain their own modal editor. The inline wrapper
            // itself may also be a cms-plugin, so start below that boundary.
            for (let current = event.target; current && current !== wrapper; current = current.parentElement) {
                if (current.tagName === 'CMS-PLUGIN') return;
            }
            event.stopPropagation();
        });
    }

    installGestureGuard() {
        if (this._gestureGuardInstalled) return;
        this._gestureGuardInstalled = true;
        let origin = null;
        this.document.addEventListener('mousedown', event => {
            origin = event.button === 0 ? this.findWrapper(event.target) : null;
        }, true);
        this.document.addEventListener('dblclick', event => {
            if (event.button !== 0) return;
            // In-wrapper double-clicks use their own bubble boundary. A drag
            // that extends beyond the wrapper needs a capture-phase fallback.
            if (!this.findWrapper(event.target) && this.isInitialized(origin)) event.stopPropagation();
            origin = null;
        }, true);
        this.document.addEventListener('mouseup', () => {
            setTimeout(() => { origin = null; }, 0);
        }, true);
    }
}
