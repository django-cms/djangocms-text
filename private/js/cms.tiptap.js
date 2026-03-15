/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */

import {Editor} from '@tiptap/core';
import {StarterKit} from "@tiptap/starter-kit";
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import CmsDynLink from './tiptap_plugins/cms.dynlink';
import {CmsPluginNode, CmsBlockPluginNode} from './tiptap_plugins/cms.plugin';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import {TextAlign, TextAlignOptions} from '@tiptap/extension-text-align';
import TiptapToolbar from "./tiptap_plugins/cms.tiptap.toolbar";

import {TextColor, Highlight, InlineQuote, InlineStyle, BlockStyle} from "./tiptap_plugins/cms.styles";
import CmsFormExtension from "./tiptap_plugins/cms.formextension";
import CmsToolbarPlugin from "./tiptap_plugins/cms.toolbar";
import ExtendedTable from "./tiptap_plugins/cms.table";
import markdownPasteHandler from './tiptap_plugins/cms.markdown';

import '../css/cms.tiptap.css';


// Mapping from toolbar item names to the extensions they require.
// starterKitKey: key to pass to StarterKit.configure({key: false}) to disable
// extensionNames: extension name(s) to remove from the extensions array
const toolbarToExtension = {
    Bold:           { starterKitKey: 'bold' },
    Italic:         { starterKitKey: 'italic' },
    Strike:         { starterKitKey: 'strike' },
    Code:           { starterKitKey: 'code' },
    CodeBlock:      { starterKitKey: 'codeBlock' },
    Blockquote:     { starterKitKey: 'blockquote' },
    BulletedList:   { starterKitKey: 'bulletList' },
    NumberedList:   { starterKitKey: 'orderedList' },
    HorizontalRule: { starterKitKey: 'horizontalRule' },
    Heading1:       { starterKitKey: 'heading' },
    Heading2:       { starterKitKey: 'heading' },
    Heading3:       { starterKitKey: 'heading' },
    Heading4:       { starterKitKey: 'heading' },
    Heading5:       { starterKitKey: 'heading' },
    Heading6:       { starterKitKey: 'heading' },
    Underline:      { extensionNames: ['underline'] },
    Subscript:      { extensionNames: ['subscript'] },
    Superscript:    { extensionNames: ['superscript'] },
    Link:           { extensionNames: ['link'] },
    Table:          { extensionNames: ['table', 'tableRow', 'tableHeader', 'tableCell'] },
    TextColor:      { extensionNames: ['textcolor'] },
    Highlight:      { extensionNames: ['Highlight'] },
    InlineQuote:    { extensionNames: ['Q'] },
    InlineStyles:   { extensionNames: ['inlinestyle'] },
    BlockStyles:    { extensionNames: ['blockstyle'] },
};

// Collect all toolbar item names from a (possibly nested) toolbar config
function collectToolbarItems(toolbar) {
    const items = new Set();
    if (!Array.isArray(toolbar)) {
        return items;
    }
    for (const entry of toolbar) {
        if (typeof entry === 'string') {
            if (entry !== '|' && entry !== '-') {
                items.add(entry);
            }
        } else if (Array.isArray(entry)) {
            for (const item of collectToolbarItems(entry)) {
                items.add(item);
            }
        }
    }
    // Expand Format's insitu items (Paragraph, Heading1-6)
    if (items.has('Format')) {
        const formatDef = TiptapToolbar.Format;
        if (formatDef && formatDef.insitu) {
            for (const sub of formatDef.insitu) {
                if (typeof sub === 'string' && sub !== '|' && sub !== '-') {
                    items.add(sub);
                }
            }
        }
    }
    return items;
}

// Filter extensions based on which toolbar items are present.
// Disables StarterKit sub-extensions and removes standalone extensions
// that have no corresponding toolbar item.
function filterExtensions(extensions, toolbarItems) {
    const removeNames = new Set();

    // First pass: find which StarterKit keys are needed by at least one toolbar item
    const starterKitKeep = new Set();
    for (const [toolbarItem, mapping] of Object.entries(toolbarToExtension)) {
        if (mapping.starterKitKey && toolbarItems.has(toolbarItem)) {
            starterKitKeep.add(mapping.starterKitKey);
        }
    }

    // Second pass: collect what to disable/remove
    const starterKitDisable = {};
    for (const [toolbarItem, mapping] of Object.entries(toolbarToExtension)) {
        if (!toolbarItems.has(toolbarItem)) {
            if (mapping.starterKitKey && !starterKitKeep.has(mapping.starterKitKey)) {
                starterKitDisable[mapping.starterKitKey] = false;
            }
            if (mapping.extensionNames) {
                for (const name of mapping.extensionNames) {
                    removeNames.add(name);
                }
            }
        }
    }

    // Nothing to disable
    if (Object.keys(starterKitDisable).length === 0 && removeNames.size === 0) {
        return extensions;
    }

    return extensions
        .map((ext) => {
            // Reconfigure StarterKit to disable unused sub-extensions
            const name = ext.name || ext?.config?.name;
            if (name === 'starterKit' && Object.keys(starterKitDisable).length > 0) {
                return ext.configure(starterKitDisable);
            }
            return ext;
        })
        .filter((ext) => {
            const name = ext.name || ext?.config?.name;
            return !removeNames.has(name);
        });
}


class CMSTipTapPlugin {
    defaultOptions() {
        return {
            extensions: [
                StarterKit,
                Underline,
                CharacterCount,
                Image,
                TextColor,
                Placeholder,
                Subscript,
                Superscript,
                ExtendedTable.configure({
                    resizable: false,
                }),
                TableRow,
                TableHeader,
                TableCell,
                CmsDynLink,
                Highlight, InlineQuote,
                InlineStyle, BlockStyle,
                TextAlign.configure({
                    types: ['heading', 'paragraph'],
                }),
                CmsPluginNode,
                CmsBlockPluginNode,
                CmsFormExtension,
                CmsToolbarPlugin,
                markdownPasteHandler,
            ],
            toolbar_HTMLField: [
                ['Paragraph', '-', 'Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5'], '|',
                ['Bold', 'Italic', 'Underline', 'Strike', '-', 'Subscript', 'Superscript', '-', 'RemoveFormat'],
                ['Undo', 'Redo'],
            ],
            toolbar_CMS: [
                ['Paragraph', '-', 'Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5'], '|',
                ['Bold', 'Italic', 'Underline', 'Strike', '-', 'Subscript', 'Superscript', '-', 'RemoveFormat'],
                ['Undo', 'Redo'],
            ],
        };
    }

    constructor(props) {
        this.debounceTime = props.debounceTime || 200;
        // the time to wait after the editor loses focus before saving the content
        // this is to prevent saving when the user is still interacting with the editor
        this.separator_markup = props.separator_markup || '<span class="tiptap-separator"></span>';
        this.space_markup = props.space_markup || '<span class="tiptap-space"></span>';
        this.options = props.options || this.defaultOptions();
        this._editors = {};
        this.lang = null;
    }


    // initializes the editor on the target element, with the given html code
    /**
     * Creates a new editor instance for the given element.
     *
     * @param {HTMLElement} el - The element to transform into an editor.
     * @param {boolean} inModal - Whether the editor occupy the full modal.
     * @param {string} content - The initial content of the editor.
     * @param {Object} settings - Additional settings for the editor.
     * @param {Function} save_callback - The callback function to be called when the editor is saved.
     */
    create(el, inModal, content, settings, save_callback) {
        if (!(el.id in this._editors)) {
            // Remember the language settings for all editors on one page
            if (this.lang === null && 'lang' in settings) {
                this.lang = settings.lang;
            }
            // Prepare the options for the editor
            const options = Object.assign({}, this.options, settings.options || {});
            delete settings.options;

            const toolbar = options.toolbar || options.toolbar_HTMLField;

            // Filter extensions based on toolbar: disable extensions whose
            // toolbar items have been removed, so pasting won't add that formatting
            const toolbarItems = collectToolbarItems(toolbar);
            const extensions = filterExtensions(options.extensions, toolbarItems);

            const editorElement = this._transform_textarea(el, inModal);
            if (el.tagName === 'TEXTAREA') {
                // Fix toolbar position for non-inline editors
                editorElement.classList.add('fixed');
            }

            const editor = new Editor({
                extensions: extensions,
                autofocus: false,
                content: content || '',
                editable: true,
                element: editorElement,
                el: el,
                save_callback: save_callback,
                settings: settings,
                toolbar: toolbar,
                inlineStyles: options.inlineStyles,
                blockStyles: options.blockStyles,
                textColors: options.textColors,
                tableClasses: options.tableClasses,
                separator_markup: this.separator_markup,
                space_markup: this.space_markup,
            });
            editor.on('blur', ({editor, event}) => {
                this._blurEditor(editor, event);
            });
            editor.on('update', ({editor}) => {
                el.dataset.changed = 'true';
                if (el.dataset.textarea) {
                    document.getElementById(el.dataset.textarea).value = editor.getHTML();
                }
                if (el.dataset.jsonField) {
                    document.getElementById(el.dataset.jsonField).value = JSON.stringify(
                        editor.getJSON()
                    );
                }
            });
            this._editors[el.id] = editor;
            editor.cmsPlugin = this;

            const el_rect = el.getBoundingClientRect();
            if (el.tagName === 'TEXTAREA' && el.rows && !el.closest('body.app-djangocms_text.change-form')) {
                editorElement.querySelector('.tiptap').style.height = el.rows * 1.5 + 'em';
            }
        }
    }

    /**
     * Retrieves the HTML content of the specified editor element.
     *
     * @param {HTMLElement} el - The editor element whose HTML content is to be retrieved.
     * @return {string} - The HTML content of the specified editor element.
     */
    getHTML(el) {
        if (el.id in this._editors) {
            return this._editors[el.id].getHTML();
        }
        return undefined;
    }

    /**
     * Retrieves the JSON representation of the HTML content of the specified editor element.
     * Returns undefined if the editor does not support JSON formats.
     *
     * @param {HTMLElement} el - The HTML element for which to get the JSON representation.
     *
     * @return {Object} - The JSON representation of the element.
     */
    getJSON(el) {
        if (el.id in this._editors) {
            return this._editors[el.id].getJSON();
        }
        return undefined;
    }

    /**
     * Destroys the editor associated with the provided element.
     * If an editor is found for the element, it is removed from the DOM and destroyed.
     *
     * @param {Element} el - The element for which the editor needs to be destroyed.
     * @return {void}
     */
    destroyEditor(el) {
        if (document.getElementById(el.id + '_editor')) {
            document.getElementById(el.id + '_editor').remove();
        }
        if (el.id in this._editors) {
            this._editors[el.id].destroy();
            delete this._editors[el.id];
        }
    }

    // transforms the textarea into a div, and returns the div
    _transform_textarea(el, inModal) {
        if (el.tagName === 'TEXTAREA') {
            const div = document.createElement('div');
            div.id = el.id + '_editor';
            div.classList.add('cms-editor-inline-wrapper', 'cke');
            // .cke for compatibility with djangocms-admin-style;
            el.parentNode.insertBefore(div, el.nextSibling);
            el.dataset.textarea = el.id;
            if (inModal) {
                el.dataset.jsonField = 'id_json';
            } else {
                div.classList.add('textarea');
            }
            el.style.display = 'none';
            return div;
        }
        el.innerText = '';
        return el;
    }

    // Blur editor event
    _blurEditor(editor, event) {
        // Let the editor process clicks first
        // This hopefully prevents race conditions
        setTimeout(() => {
            // Allow toolbar and other editor widgets to process the click first
            // They need to refocus the editor to avoid a save
            const {id} = editor.options.el;
            const cms_dialog = document.querySelector(`#cms-top .cms-dialog[data-editor="${id}"]`);
            if(!editor.options.el.contains(document.activeElement) && !cms_dialog) {
                // hide the toolbar
                editor.options.element.querySelectorAll('[role="menubar"], [role="button"]')
                    .forEach((el) => el.classList.remove('show'));
                // save the content (is no-op for non-inline calls)
                editor.options.save_callback();
            }
        }, this.debounceTime);
    }

    /**
     * Returns the representation of an item for the user based on the specified language option.
     * If the item is found in the language options, it will return the corresponding representation.
     * If the item is not found, it will return the "failed" representation from the TiptapToolbar.
     *
     * @param {string} item - The item to get the representation for.
     * @return {string} - The representation of the specified item, or the "failed" representation from the TiptapToolbar.
     */
    _getRepresentation(item, filter) {
        if (item.endsWith('Plugin')) {
            for (const plugin of window.CMS_Editor.getInstalledPlugins()) {
                if (plugin.value === item && filter !== 'block') {
                    return {
                        title: plugin.name,
                        icon: plugin.icon,
                        cmsplugin: plugin.value,
                        dataaction: 'CMSPlugins',
                    };
                }
            }
            return null;
        }
        if (this.lang && item in this.lang && item in TiptapToolbar) {
            if (filter && TiptapToolbar[item].type && filter !== TiptapToolbar[item].type) {
                return null;
            }
            return Object.assign({}, TiptapToolbar[item] || {}, this.lang[item]);
        }
        return TiptapToolbar.failed;
    }

    _handleDblClick(event, editor) {
        const buttons = editor.options.element.querySelectorAll(
            '.cms-toolbar button, .cms-toolbar [role="button"], ' +
            '.cms-balloon button, .cms-balloon [role="button"]'
        );
        for (const button of buttons) {
            const action = button.dataset.action;
            const toolbarItem = TiptapToolbar[action];
            const canOpenForm = toolbarItem && toolbarItem.form && toolbarItem.formAction &&
                toolbarItem.active(editor) && toolbarItem.enabled(editor);
            if (canOpenForm && !editor.state.selection.empty) {
                // Link selected, open form
                setTimeout(() => editor.commands.openCmsForm(action), this.debounceTime);
            }
        }
    }
}


window.cms_editor_plugin = window.cms_editor_plugin || new CMSTipTapPlugin({});
