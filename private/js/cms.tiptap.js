/* eslint-env es6 */
/* jshint esversion: 6 */
/* global document, window, console */

import {Editor} from '@tiptap/core';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import Image from '@tiptap/extension-image';
import CmsDynLink from './tiptap_plugins/cms.dynlink';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import {TextAlign, TextAlignOptions} from '@tiptap/extension-text-align';
import {CmsPluginNode, CmsBlockPluginNode} from './tiptap_plugins/cms.plugin';
import TiptapToolbar from "./tiptap_plugins/cms.tiptap.toolbar";
import {StarterKit} from "@tiptap/starter-kit";

import {InlineColors, Small, Var, Kbd, Samp} from "./tiptap_plugins/cms.styles";
import CmsBalloonToolbar from "./tiptap_plugins/cms.balloon-toolbar";
import FormExtension from "./tiptap_plugins/cms.formextension";

import {formToHtml, populateForm} from './cms.dialog';
import LinkField from './cms.linkfield';

import '../css/cms.tiptap.css';
import '../css/cms.linkfield.css';



class CMSTipTapPlugin {
    defaultOptions() {
        return {
            extensions: [
                StarterKit,
                Underline,
                CharacterCount,
                Image,
                InlineColors,
                Placeholder,
                Subscript,
                Superscript,
                Table.configure({
                    resizable: false,
                    HTMLAttributes: {
                        class: 'table',
                    },
                }),
                TableRow,
                TableHeader,
                TableCell,
                CmsDynLink,
                Small, Var, Kbd, Samp,
                CmsPluginNode,
                CmsBlockPluginNode,
                TextAlign.configure({
                    types: ['heading', 'paragraph'],
                }),
                FormExtension,
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
        // (e.g. clicking on the toolbar)
        this.separator_markup = props.separator_markup || '<span class="separator"></span>';
        this.space_markup = props.space_markup || '<span class="space"></span>';
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

            const editorElement = this._transform_textarea(el, inModal);
            if (el.tagName === 'TEXTAREA') {
                // Fix toolbar position for non-inline editors
                editorElement.classList.add('fixed');
            }

            const editor = new Editor({
                extensions: options.extensions,
                autofocus: false,
                content: content || '',
                editable: true,
                element: editorElement,
                el: el,
                save_callback: save_callback,
                settings: settings,
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
            if (el.tagName === 'TEXTAREA' || el_rect.x < 28) {
                // Not inline or too close to the left edge to see the block toolbar
                this._createTopToolbar(editorElement, editor, options);
                if (el.rows && !el.closest('body.app-djangocms_text.change-form')) {
                    editorElement.querySelector('.tiptap').style.height = el.rows * 1.5 + 'em';
                }
            } else {
                // Inline
                this._createTopToolbar(editorElement, editor, options, 'mark');
                this._createBlockToolbar(editorElement, editor, options);
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

    _createTopToolbar(el, editor, options, filter) {
        const toolbar = this._createToolbar(el, editor, options.toolbar || this.options.toolbar_HTMLField, filter);
        toolbar.style.zIndex = options.baseFloatZIndex || 8888888;
    }

    _createBlockToolbar(el, editor, options) {
        const toolbar = this._populateToolbar(editor, options.toolbar || this.options.toolbar_HTMLField, 'block');
        const ballonToolbar = new CmsBalloonToolbar(editor, toolbar,
            (event) => this._handleToolbarClick(event, editor),
            (el) => this._updateToolbar(editor, el));
    }

    _createToolbar(el, editor, toolbar, filter) {
        const toolbarElement = document.createElement('div');
        toolbarElement.setAttribute('role', 'menubar');
        toolbarElement.classList.add('cms-toolbar');

        // create the toolbar html from the settings
        toolbarElement.innerHTML = `<div class="toolbar-dropback"></div>${this._populateToolbar(editor, toolbar, filter)}`;

        toolbarElement.querySelector('.toolbar-dropback').addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            this._closeAllDropdowns(event, editor);
            editor.commands.focus();
        });

        // Add form submits and cancels
        toolbarElement.querySelectorAll('.cms-form-buttons .submit')
            .forEach((el) => {
                el.addEventListener('click', (event) => this._submitToolbarForm(event, editor));
            }, this);
        toolbarElement.querySelectorAll('form.cms-form')
            .forEach((el) => {
                el.addEventListener('submit', (event) => this._submitToolbarForm(event, editor));
            }, this);
        toolbarElement.querySelectorAll('.cms-form-buttons .cancel')
            .forEach((el) => {
                el.addEventListener('click', (event) => {
                    this._closeAllDropdowns(event, editor);
                    editor.commands.focus();
                });
            }, this);
        toolbarElement.querySelectorAll('form.cms-form .js-linkfield')
            .forEach((el) => {
                new LinkField(el, {
                    url: editor.options.settings.url_endpoint || '',
                });
            }, this);

        // add the toolbar to the DOM above the editor
        el.prepend(toolbarElement);
        // destroy the toolbar when the editor is destroyed
        editor.on('destroy', () => toolbarElement.remove());
        // and update the button states
        this._updateToolbar(editor, toolbarElement);

        // add event listeners
        // 1. update the toolbar button states when the selection changes
        editor.on('selectionUpdate', ({editor}) => this._updateToolbar(editor, toolbarElement));
        // 2. handle clicks on the toolbar buttons
        this._addButtonEvents(editor, toolbarElement);
        // 3. focus the editor when clicking on the toolbar to not trigger a save
        toolbarElement.addEventListener('click', (event) => {
            editor.commands.focus();
            this._closeAllDropdowns(event, editor);
            event.stopPropagation();
            event.preventDefault();
        });
        if (!el.classList.contains('fixed')) {
            // show the toolbar when the editor is focused
            editor.on('focus', () => toolbarElement.classList.add('show'));

            // Limit its width to the available space
            toolbarElement.style.maxWidth = (window.innerWidth - toolbarElement.getBoundingClientRect().left - 16) + 'px';
        }
        // 4.Document if a selection is in progress
        editor.view.dom.addEventListener('dblclick', (e) => this._handleDblClick(e, editor));

        return toolbarElement;
    }

    _addButtonEvents(editor, toolbarElement) {
        for (const entry of toolbarElement.querySelectorAll('button, [role="button"]')) {
            entry.addEventListener('click', (event) => this._handleToolbarClick(event, editor));
        }
    }

    // handle a click on a toolbar button
    // the button's data-action attribute is used to determine the action
    _handleToolbarClick(event, editor) {
        event.stopPropagation();
        event.preventDefault();
        const button = event.target.closest('button, .dropdown');
        if (button && !button.disabled && !editor.options.el.querySelector('dialog.cms-form-dialog')) {
            const action = button.dataset.action;
            if (button.classList.contains('dropdown')) {
                // Open dropdown
                const content = button.querySelector('.dropdown-content');
                if (!button.classList.contains('show')) {
                    this._closeAllDropdowns(event, editor);
                    button.classList.add('show');
                    content.style.top = button.offsetHeight + 'px';
                    content.style.zIndex = button.closest('button, [role="menubar"]').style.zIndex + 1;
                    if (button.offsetLeft + content.offsetWidth > window.innerWidth) {
                        content.style.left = (window.innerWidth - content.offsetWidth - button.offsetLeft - 25) + 'px';
                    }
                    if (content.tagName === 'FORM') {
                        // Don't let clicks on the form close the dropdown
                        content.addEventListener('click', (event) => event.stopPropagation());
                        // Select the first input
                        content.querySelector('input:not([type=hidden])').focus();
                    } else {
                        editor.commands.focus();
                    }
                } else {
                    // Already open, just close and go back to editor
                    this._closeAllDropdowns(event, editor);
                    editor.commands.focus();
                }
            } else if (TiptapToolbar[action]) {
                TiptapToolbar[action].action(editor, button);
                this._updateToolbar(editor);
                // Close dropdowns after command execution
                this._closeAllDropdowns(event, editor);
            }
        } else {
            editor.commands.focus();
        }

    }

    // Blur editor event
    _blurEditor(editor, event) {
        // Let the editor process clicks on the toolbar first
        // This hopefully prevents race conditions
        setTimeout(() => {
            // Allow toolbar and other editor widgets to process the click first
            // They need to refocus the editor to avoid a save
            if(!editor.options.el.contains(document.activeElement)) {
                // hide the toolbar
                editor.options.element.querySelectorAll('[role="menubar"], [role="button"]')
                    .forEach((el) => el.classList.remove('show'));
                // save the content (is no-op for non-inline calls)
                editor.options.save_callback();
            }
        }, this.debounceTime);
    }

    // Close all dropdowns
    _closeAllDropdowns(event, editor) {
        document.documentElement.querySelectorAll('.cms-editor-inline-wrapper [role="menubar"] .dropdown')
            .forEach((el) => el.classList.remove('show'));
    }

    _populateToolbar(editor, array, filter) {
        let html = '';

        for (let item of array) {
            if (item === undefined) {
                continue;
            }
            if (item in TiptapToolbar && TiptapToolbar[item].insitu) {
                item = TiptapToolbar[item].insitu;
            } else if (item in TiptapToolbar && TiptapToolbar[item].items) {
                // Create submenu
                const repr = this._getRepresentation(item);
                item = TiptapToolbar[item];
                item.title = repr.title;
                item.icon = repr.icon;
            }
            if (Array.isArray(item)) {
                const group = this._populateToolbar(editor, item, filter);
                if (group.length > 0) {
                    html += group + this.separator_markup;
                }
            } else if (item.constructor === Object) {
                let dropdown;

                if (typeof item.items === 'string') {
                    dropdown = item.items;
                } else {
                    dropdown = this._populateToolbar(editor, item.items, filter);
                    // Are there any items in the dropdown?
                    if (dropdown.replaceAll(this.separator_markup, '').replaceAll(this.space_markup, '').length === 0) {
                        continue
                    }
                }
                const title = item.title && item.icon ? `title='${item.title}' ` : '';
                const icon = item.icon || item.title;
                html += `<span ${title}class="dropdown" role="button">${icon}<div class="dropdown-content ${item.class || ''}">${dropdown}</div></span>`;
            } else {
                switch (item) {
                    case '|':
                        // vertical separator
                        if (html.endsWith(this.space_markup)) {
                            // Remove trailing space if there is one
                            html = html.slice(0, -this.space_markup.length);
                        }
                        if (html.length > 0 && !html.endsWith(this.separator_markup)) {
                            // Add separator if there is not already a vertical separator
                            html += this.separator_markup;
                        }
                        break;
                    case '-':
                        // additional horizontal space
                        if (html.length > 0 && !html.endsWith(this.space_markup) && !html.endsWith(this.separator_markup)) {
                            html += this.space_markup;
                        }
                        break;
                    case '/':
                        // line break
                        if (html.length > 0 && !html.endsWith('<br>') && !filter) {
                            html += '<br>';
                        }
                        break;
                    default:
                        // Button
                        if (item in TiptapToolbar && TiptapToolbar[item].render) {
                            html += TiptapToolbar[item].render(editor, TiptapToolbar[item], filter);
                        } else {
                            html += this._createToolbarButton(editor, item, filter);
                        }
                        break;
                }
            }
        }
        // Remove trailing separator or space
        if (html.endsWith(this.separator_markup)) {
            html = html.slice(0, -this.separator_markup.length);
        }
        if (html.endsWith(this.space_markup)) {
            html = html.slice(0, -this.space_markup.length);
        }
        return html;
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
            if (filter && filter !== TiptapToolbar[item].type) {
                return null;
            }
            return Object.assign({}, TiptapToolbar[item] || {}, this.lang[item]);
        }
        return TiptapToolbar.failed;
    }

    // create the html for a toolbar button
    _createToolbarButton(editor, itemName, filter) {
        const item = itemName.split(' ')[0];

        const repr = this._getRepresentation(item, filter);
        if (repr) {
            repr.dataaction = repr.dataaction || item;
            const title = repr && repr.icon ? `title='${repr.title}' ` : '';
            const position = repr.position ? `style="float :${repr.position};" ` : '';
            const cmsplugin = repr.cmsplugin ? `data-cmsplugin="${repr.cmsplugin}" ` : '';
            let form = '';
            let classes = 'button';
            if (repr.toolbarForm) {
                classes += ' dropdown';
                form = `<form class="cms-form dropdown-content">
                            <div class="cms-form-inputs">${formToHtml(repr.toolbarForm)}</div>
                            <div class="cms-form-buttons">
                                <span class="submit"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16">
                                    <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
                                    </svg></span>
                                <span class="cancel"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">
                                    <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/>
                                    </svg></span>
                            </div>
                        </form>`;
            }
            return `<button data-action="${repr.dataaction}" ${cmsplugin}${title}${position}class="${classes}" role="button">
                        ${repr.icon ? repr.icon : repr.title}${form}
                    </button>`;
        }
        return '';
    }

    // update the toolbar button states
    _updateToolbar(editor, toolbar) {
        let selector;
        if (!toolbar) {
            toolbar = editor.options.element;
            selector = '.cms-toolbar button, .cms-toolbar [role="button"], ' +
                '.cms-balloon button, .cms-balloon [role="button"]';
        } else {
            selector = 'button, [role="button"]';
        }
        for (const button of toolbar.querySelectorAll(selector)) {
            const action = button.dataset.action;
            if (action) {
                if (TiptapToolbar[action]) {
                    const toolbarItem = this._getRepresentation(action);
                    button.disabled = !toolbarItem.enabled(editor, button);
                    try {
                        button.disabled = !toolbarItem.enabled(editor, button);
                        try {
                            if (toolbarItem.active(editor, button)) {
                                button.classList.add('active');
                            } else {
                                button.classList.remove('active');
                            }
                            if (TiptapToolbar[action].attributes) {
                                populateForm(button, TiptapToolbar[action].attributes(editor), toolbarItem.form);
                            }
                        } catch (e) {
                        }
                    } catch (e) {
                        console.warn(e);
                        button.remove();
                    }
                }
            }
        }
        editor.options.el.dataset.selecting = 'false';
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
                setTimeout(() => editor.commands.openCmsForm(action), 100);
            }
        }
    }


    _submitToolbarForm(event, editor) {
        event.preventDefault();
        event.stopPropagation();
        const form = event.target.closest('form');
        if (form.reportValidity()) {
            this._closeAllDropdowns(event, editor);
            const action = form.closest('[role=button]').dataset.action;
            if (TiptapToolbar[action]) {
                TiptapToolbar[action].action(editor, event.target.closest('button, [role="button"]'), new FormData(form));
            }
        }
    }
}


window.cms_editor_plugin = new CMSTipTapPlugin({});
