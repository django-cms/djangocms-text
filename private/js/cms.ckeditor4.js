/**
 * @license Copyright (c) 2003-2022, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

import './ckeditor4/ckeditor';
import './ckeditor4_plugins/cmsdialog/plugin';
import './ckeditor4_plugins/cmsplugins/plugin';
import './ckeditor4_plugins/cmsresize/plugin';
import './ckeditor4_plugins/cmswidget/plugin';

// Configure cmsplugin
(function() {
    document.createElement('cms-plugin');
    CKEDITOR.dtd['cms-plugin'] = CKEDITOR.dtd.div;
    CKEDITOR.dtd.$inline['cms-plugin'] = 1;
    // has to be here, otherwise extra <p> tags appear
    CKEDITOR.dtd.$nonEditable['cms-plugin'] = 1;
    CKEDITOR.dtd.$transparent['cms-plugin'] = 1;
    CKEDITOR.dtd.body['cms-plugin'] = 1;

    // add additional plugins (autoloads plugins.js)
    CKEDITOR.skin.addIcon('cmsplugins', '/static' +
        '/ckeditor_plugins/cmsplugins/icons/cmsplugins.svg');
    CKEDITOR.disableAutoInline = true
})();

window.cms_editor_plugin = {

    _editors: {},
    _CSS: [],

    options: {
        // ckeditor default settings, will be overwritten by CKEDITOR_SETTINGS
        language: 'en',
        readOnly: false,
        skin: 'moono-lisa',
        toolbar_CMS: [
            ['Undo', 'Redo'],
            ['cmsplugins', 'cmswidget', '-', 'ShowBlocks'],
            ['Format', 'Styles'],
            ['TextColor', 'BGColor', '-', 'PasteText', 'PasteFromWord'],
            ['Scayt'],
            ['Maximize', ''],
            '/',
            ['Bold', 'Italic', 'Underline', 'Strike', '-', 'Subscript', 'Superscript', '-', 'RemoveFormat'],
            ['JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'],
            ['HorizontalRule'],
            ['NumberedList', 'BulletedList'],
            ['Outdent', 'Indent', '-', 'Blockquote', '-', 'Link', 'Unlink', '-', 'Table'],
            ['Source']
        ],
        toolbar_HTMLField: [
            ['Undo', 'Redo'],
            ['ShowBlocks'],
            ['Format', 'Styles'],
            ['TextColor', 'BGColor', '-', 'PasteText', 'PasteFromWord'],
            ['Scayt'],
            ['Maximize', ''],
            '/',
            ['Bold', 'Italic', 'Underline', 'Strike', '-', 'Subscript', 'Superscript', '-', 'RemoveFormat'],
            ['JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'],
            ['HorizontalRule'],
            ['Link', 'Unlink'],
            ['NumberedList', 'BulletedList'],
            ['Outdent', 'Indent', '-', 'Blockquote', '-', 'Link', 'Unlink', '-', 'Table'],
            ['Source']
        ],
        allowedContent: true,
        toolbarCanCollapse: false,
        removePlugins: 'resize,flash',
        extraPlugins: ''
    },

    // initializes the editor on the target element, with the given html code
    create: function(el, inline, content, settings, save_callback) {
        const all_options = Object.assign({}, this.options, settings.options);

        // add extra plugins that we absolutely must have
        all_options.extraPlugins = all_options.extraPlugins +=
            ',cmsplugins,cmswidget,cmsdialog,cmsresize,widget';

        if (typeof all_options.toolbar === 'string' && ('toolbar_' + all_options.toolbar) in all_options) {
            all_options.toolbar = all_options['toolbar_' + all_options.toolbar];
        }

        if (!(el.id in this._editors)) {
            if (!inline) {
                const editor = CKEDITOR.replace(el, all_options);
                this._editors[el.id] = editor;

                // Maximize editor if alone in modal
                const modal = document.querySelector('.app-djangocms_text.model-text');
                if (modal !== null && modal.contains(el)) {
                    console.warn(modal, el, modal.contains(el));
                    setTimeout(() => editor.execCommand('maximize'), 300);
                }
            } else {
                const editor = CKEDITOR.inline(el, all_options);
                console.warn(editor.config.readOnly);
                this._editors[el.id] = editor;
                el.addEventListener('blur', save_callback);
                editor.on('change', () => el.dataset.changed='true');
                // Let ckeditor first add its styles
                setTimeout(this._manageStyles, 200);
            }
        }
    },

    _manageStyles: function () {
        const styles = document.querySelectorAll('link[rel="stylesheet"][type="text/css"][href*="ckeditor4"]');
        console.warn("styles", styles);
        if (styles.length > 0) {
            // Styles are installed in the document head, but we need to clone them
            // for later recovery
            styles.forEach((style) => {
                    if (cms_editor_plugin._CSS.indexOf(style) === -1) {
                        cms_editor_plugin._CSS.push(style.cloneNode(true));
                    }
                }
            );
        } else {
            cms_editor_plugin._CSS.forEach((style) => document.head.appendChild(style));
        }
    },

    // returns the edited html code
    getHTML: function(el) {
        return this._editors[el.id].getData();
    },

    // returns the edited content as json
    getJSON: function(el) {
        return undefined;
    },

    // destroy the editor
    destroyEditor: function(el) {
        this._editors[el.id].destroy();
        delete this._editors[el.id];
    }
};
