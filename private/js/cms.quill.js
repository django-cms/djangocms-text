/* eslint-env es6 */
/* jshint esversion: 6 */
/* global window, document, fetch, IntersectionObserver, URLSearchParams, console */

import Quill from 'quill';



"use strict";

window.cms_editor_plugin = {

    _editors: {},

    options: {
        theme: 'bubble',
    },

    // initializes the editor on the target element, with the given html code
    create: function(el, inline, content, options, save_callback) {
        if (!(el.id in this._editors)) {
            const all_options = Object.assign({}, this.options, options);

            const editor = new Quill(el, all_options)
            this._editors[el.id] = editor;

            editor.on('text-change', function(delta, oldDelta, source) {
                el.dataset.changed = 'true';
            });
            editor.on('selection-change', function(range, oldRange, source) {
                if (range === null && oldRange !== null) {
                    save_callback();
                }
            });
        } else {
            console.warn("editor already exists: ", el.id);
        }
    },

    // returns the edited html code
    get_html: function(el) {
        return cms_editor_plugin._get_editor(el).root.innerHTML;
    },

    // returns the edited content as json
    get_json: function(el) {
        return cms_editor_plugin._get_editor(el).getContents();
    },

    // destroy the editor
    destroy_editor: function(el) {
        cms_editor_plugin._get_editor(el).destroy();
    },

    _get_editor: function(el) {
        return this._editors[el.id];
    }
};
