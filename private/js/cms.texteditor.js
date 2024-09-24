/* eslint-env es6 */
/* jshint esversion: 6 */
/* global document, window, console */

class CmsTextEditor {
    constructor (el, options, save_callback) {
        this.el = el;
        this.plugin_identifier = this.find_plugin_identifier();
        const id_split = this.plugin_identifier.split('-');
        this.plugin_id = parseInt(id_split[id_split.length-1]);
        this.options = options;
        this.events = {};
        this.save = (el) => {
            return save_callback(el);
        };
        this.init();
    }

    destroy () {
        this.el.removeEventListener('focus', this._focus.bind(this));
        this.el.removeEventListener('blur', this._blur.bind(this));
        this.el.removeEventListener('input', this._change);
        this.el.removeEventListener('keydown', this._key_down);
        this.el.removeEventListener('paste', this._paste);
        this.el.setAttribute('contenteditable', 'false');
    }

    init () {
        this.el.setAttribute('contenteditable', 'plaintext-only');
        if (!this.el.isContentEditable) {
            this.el.setAttribute('contenteditable', 'true');
            this.options.enforcePlaintext = true;

        }
        this.el.setAttribute('spellcheck', this.options.spellcheck || 'false');
        this.el.addEventListener('input', this._change);
        this.el.addEventListener('focus', this._focus.bind(this));
        this.el.addEventListener('blur', this._blur.bind(this));
        this.el.addEventListener('keydown', this._key_down);
        if (this.options.enforcePlaintext) {
            this.el.addEventListener('paste', this._paste);
        }
    }

    _key_down (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            if (e.target.dataset.undo) {
                e.target.innerText = e.target.dataset.undo;
                e.target.dataset.changed = false;
            }
            e.target.blur();
        }
    }

    _focus (e) {
        this.options.undo = this.el.innerText;
    }

    _blur (e) {
        const success = this.save(e.target);
        console.log(success);
        if (!success) {
            e.target.innerText = this.options.undo;
            e.target.dataset.changed = 'false';
            e.target.focus();
        }
    }

    _paste (e) {
        // Upon past only take the plain text
        e.preventDefault();
        let text = e.clipboardData.getData('text/plain');
        if (text) {
            const [start, end] = [e.target.selectionStart, this.el.selectionEnd];
            e.target.setRangeText(text, start, end, 'select');
        }
    }

    _change (e) {
        e.target.dataset.changed = 'true';
    }

    find_plugin_identifier () {
        const header = 'cms-plugin-';

        for (let cls of this.el.classList) {
            if (cls.startsWith(header)) {
                let items = cls.substring(header.length).split('-');
                if (items.length === 4 && items[items.length-1] == parseInt(items[items.length-1])) {
                    return items.join('-');
                }
            }
        }
        return null;
    }
}

export { CmsTextEditor as default };
