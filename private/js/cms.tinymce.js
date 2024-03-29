"use strict";

window.cms_editor_plugin = {

    _editors: {},

    // initializes the editor on the target element, with the given html code
    create: function(el, inline, content, options, save_callback) {
        if (!(el.id in this._editors)) {
            tinymce.init({
                selector: "#" + el.id,
                inline: inline,
                menubar: false,
                height: inline ? undefined : '100%',
                width: inline ? undefined : '100%',
                setup: (editor) => {
                    editor.on('Dirty', () => el.dataset.changed = 'true');
                    editor.on('blur', save_callback);
                    editor.on('focus', () => CMS_Editor._highlightTextplugin(el.dataset.cmsPluginId));
                    this._editors[el.id] = editor;
                }
            });
        } else {
            console.warn("editor already exists:", el.id);
        }
    },

    // returns the edited html code
    get_html: function(el) {
        return cms_editor_plugin._get_editor(el).getContent();
    },

    // returns the edited content as json
    get_json: function(el) {
        return undefined;
    },

    // destroy the editor
    destroy_editor: function(el) {
        cms_editor_plugin._get_editor(el).destroy();
    },

    _get_editor: function(el) {
        return tinymce.get(el.id);
    }
};
