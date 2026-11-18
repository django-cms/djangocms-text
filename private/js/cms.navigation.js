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

// Modified clicks on plain links open a new tab or window: this page stays.
function opensElsewhere(event, button) {
    return (event.ctrlKey || event.metaKey || event.shiftKey) && button.tagName === 'A' &&
        !button.dataset.rel && !button.classList.contains('cms-form-post-method');
}

export default class NavigationSaveGuard {
    constructor(doc, hasUnsavedChanges, flushPendingSaves) {
        this.document = doc;
        this.hasUnsavedChanges = hasUnsavedChanges;
        this.flushPendingSaves = flushPendingSaves;
        this._installed = false;
        this._replaying = false;
        this._flushing = false;
    }

    install() {
        if (this._installed) return;
        this._installed = true;
        this.document.addEventListener('click', event => {
            if (this._replaying || event.defaultPrevented || event.button) return;
            const button = event.target.closest?.(BUTTON_SELECTOR);
            if (!button || !leavesPage(button) || opensElsewhere(event, button)) return;
            if (!this._flushing && !this.hasUnsavedChanges()) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            // Clicks repeated while a flush is running must not replay the action twice.
            if (this._flushing) return;
            this._flushing = true;
            this.flushUntilClean()
                .then(clean => {
                    this._flushing = false;
                    // A failed save has reported its error; stay on the page.
                    if (clean) this.replay(button);
                })
                .catch(() => { this._flushing = false; });
        }, true);
    }

    // Fields edited (or saves failing) while a flush is running leave changes
    // behind, so flush once more before deciding whether leaving is safe.
    async flushUntilClean() {
        for (let attempt = 0; attempt < 2 && this.hasUnsavedChanges(); attempt++) {
            await this.flushPendingSaves();
        }
        return !this.hasUnsavedChanges();
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
