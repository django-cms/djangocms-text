// This protects django CMS publish/navigation controls, not an editor toolbar.
const BUTTON_SELECTOR = '#cms-top .cms-toolbar a, #cms-top .cms-toolbar button';

function leavesPage(button) {
    if (button.classList.contains('cms-btn-disabled') ||
        button.classList.contains('cms-dropdown-toggle') ||
        button.closest('.cms-toolbar-item-navigation-disabled')) return false;
    if (button.dataset.rel) return button.dataset.rel === 'ajax';
    if (button.classList.contains('cms-form-post-method')) return true;
    const href = (button.getAttribute('href') || '').trim();
    return !!href && !href.startsWith('#') && !/^javascript:/i.test(href);
}

export default class NavigationSaveGuard {
    constructor(doc, hasUnsavedChanges, flushPendingSaves) {
        this.document = doc;
        this.hasUnsavedChanges = hasUnsavedChanges;
        this.flushPendingSaves = flushPendingSaves;
        this._installed = false;
        this._replaying = false;
    }

    install() {
        if (this._installed) return;
        this._installed = true;
        this.document.addEventListener('click', event => {
            if (this._replaying || event.defaultPrevented || event.button) return;
            const button = event.target.closest?.(BUTTON_SELECTOR);
            if (!button || !leavesPage(button) || !this.hasUnsavedChanges()) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            this.flushPendingSaves().then(() => this.replay(button));
        }, true);
    }

    replay(button) {
        // A save can replace CMS toolbar markup, detaching the original button.
        const target = button.isConnected ? button : this.findReplacement(button);
        if (!target) return;
        this._replaying = true;
        try {
            target.click();
        } finally {
            this._replaying = false;
        }
    }

    findReplacement(button) {
        const href = button.getAttribute('href');
        const label = button.textContent.trim();
        return Array.from(this.document.querySelectorAll(BUTTON_SELECTOR)).find(candidate =>
            candidate.getAttribute('href') === href && candidate.textContent.trim() === label
        ) || null;
    }
}
