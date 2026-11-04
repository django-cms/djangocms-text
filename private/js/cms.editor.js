/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window, document, fetch, IntersectionObserver, URLSearchParams, console */

import CmsTextEditor from './cms.texteditor.js';
import LinkField from "./cms.linkfield";
import CmsDialog from "./cms.dialog";
import InlineEditing from "./cms.inline";
import NavigationSaveGuard from "./cms.navigation";

// #############################################################################
// CMS Editor
// #############################################################################

const WRAPPER_TAGS = new Set([
    'DIV', 'SECTION', 'ARTICLE', 'MAIN', 'ASIDE',
    'HEADER', 'FOOTER', 'NAV', 'CMS-PLUGIN',
]);

// Coordinates editor backends and CMS persistence. Inline event boundaries and
// navigation protection live separately from backend-owned toolbars/dialogs.
class CMSEditor {

    // CMS Editor: constructor
    // Initialize the editor object
    constructor() {
        this._global_settings = {};
        this._editor_settings = {};
        this._generic_editors = {};
        this._richTextElements = new Map();
        this._adminRows = new WeakSet();
        this._inlineWrappers = new WeakSet();
        this._pendingSaves = new Set();
        this._inlineEditing = new InlineEditing(document, wrapper => !!this.getEditor(wrapper));
        this._navigationGuard = new NavigationSaveGuard(
            document, () => this.hasUnsavedChanges(), () => this.flushPendingSaves()
        );
        this._beforeUnload = event => {
            if (this.hasUnsavedChanges()) {
                event.preventDefault();
                event.returnValue = true;
            }
        };
        this._admin_selector = 'textarea.CMS_Editor';
        this._admin_add_row_selector = 'body.change-form .add-row a';
        this._inline_admin_selector = 'body.change-form .form-row';
        this.API = {
            LinkField: LinkField,
            CmsDialog: CmsDialog,
            CmsTextEditor: CmsTextEditor,
        };

        document.addEventListener('DOMContentLoaded', () => {
            // Get the CMS object from the parent window
            if (window.CMS !== undefined && window.CMS.config !== undefined) {
                this.mainWindow = window;
                this.CMS = window.CMS;
            } else {
                this.mainWindow = window.parent;
                this.CMS = window.parent.CMS;
            }

            if (this.CMS) {
                // Only needs to happen on the main window.
                this.CMS.$(window).on('cms-content-refresh', () => {
                    this._resetInlineEditors();
                });
            }

            if (document.querySelector(this._inline_admin_selector + '.empty-form')) {
                // Marker for inline admin form: do **not** initialize empty form templates
                this._admin_selector = this._inline_admin_selector + ':not(.empty-form) ' + this._admin_selector;
            }
            this.initAll();
        }, { once: true });
    }

    // CMS Editor: init_all
    // Initialize all editors on the page
    initAll () {
        // Get global options from script element
        try {
            this._global_settings = JSON.parse(document.getElementById('cms-editor-cfg').textContent);
        } catch (e) {
            this._global_settings = {};
        }

        // All textareas with class CMS_Editor: typically on admin site
        document.querySelectorAll(this._admin_selector).forEach(
            (el) => this.init(el), this
        );
        // Register all plugins on the page for inline editing
        this.initInlineEditors();

        // Listen to the add row click for inline admin in a change form
        if (this._admin_add_row_selector) {
            setTimeout(() => {
                for (const el of document.querySelectorAll(this._admin_add_row_selector)) {
                    if (this._adminRows.has(el)) continue;
                    this._adminRows.add(el);
                    el.addEventListener('click', (event) => {
                        setTimeout(() => {
                            document.querySelectorAll(this._admin_selector).forEach(
                                (el) => this.init(el), this
                            );
                        }, 0);
                    });
                }
            }, 0);
        }
    }

    handleInlineEscape(event) {
        return this._inlineEditing.handleEscape(event);
    }

    // CMS Editor: init
    // Initialize a single editor
    init (el) {
        // Skip elements inside empty form templates (stacked and tabular inlines)
        if (el.closest('.empty-form')) {
            return;
        }
        if (!el.id) {
            el.id = "cms-edit-" + Math.random().toString(36).slice(2, 9);
        }
        if (el.tagName !== 'TEXTAREA') this._inlineEditing.attachEscape(el);
        if (this.getEditor(el)) return;
        // Create editor
        if (!el.dataset.cmsType || el.dataset.cmsType === 'TextPlugin' || el.dataset.cmsType === 'HTMLField') {
            this._createRTE(el);
        } else if (el.dataset.cmsType === 'CharField') {
            // Create a plain text editor for a generic field.
            this._generic_editors[el.id] = new CmsTextEditor(el, {
                    spellcheck: el.dataset.spellcheck || 'false',
                },
                (el) => this.saveData(el)
            );
        }
    }

    // CMS Editor: initInlineEditors
    // Register all plugins on the page for inline editing
    // This is called from init_all
    /**
     * Attach the inline-editor double-click event boundary to a wrapper.
     * Each wrapper owns this listener; it stops dblclicks from reaching
     * django-cms's document-level `dblclick.cms.plugin` delegate while
     * letting editor-internal handlers (registered on descendants) fire
     * normally. Idempotent. Exposed so tests and any callers that build
     * wrappers outside `initInlineEditors` can opt in to the guard.
     */
    attachInlineDblclickGuard(wrapper) {
        this._inlineEditing.attachDoubleClick(wrapper);
    }

    initInlineEditors() {
        if (this.CMS === undefined || this.CMS._plugins === undefined) {
            // Check the CMS frontend for plugins
            // no plugins -> no inline editors
            return;
        }

        const initAsync = typeof requestIdleCallback === 'function'
            ? (cb) => requestIdleCallback(cb, {timeout: 2000})
            : (cb) => setTimeout(cb, 0);

        // Guard CMS's delegated dblclick handler for all inline editors.
        // Installed once for this editor manager.
        this._inlineEditing.installGestureGuard();

        this.observer = this.observer || new IntersectionObserver( (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    this.observer.unobserve(entry.target);  // Only init once
                    initAsync(() => this.init(entry.target));
                }
            }, this);
        }, {
            root: null,
            threshold: 0
        });
        this.observer.disconnect();

        let generic_inline_fields = document.getElementById('cms-generic-inline-fields') || {};
        if (generic_inline_fields) {
            generic_inline_fields = JSON.parse(generic_inline_fields.textContent || '{}');
        }

        this.CMS._plugins.forEach(function (plugin) {
            if (plugin[1].type === 'plugin' || plugin[1].type === 'generic') {
                // Either plugin or frontend editable element
                const url = plugin[1].urls.edit_plugin;
                const id = plugin[1].plugin_id;
                let wrapper;

                if (plugin[1].type === 'plugin' && plugin[1].plugin_type === 'TextPlugin') {
                    // Text plugin
                    const elements = document.querySelectorAll('.cms-plugin.' + plugin[0]);
                    wrapper = this._initInlineRichText(elements, url, plugin[0]);
                    if (wrapper) {
                        wrapper.dataset.cmsPluginId = id;
                        wrapper.dataset.cmsType = 'TextPlugin';
                    }
                } else if (plugin[1].type === 'generic') {
                    // Frontend editable element
                    const edit_fields = new URL(url.replace('&amp;', '&'), 'https://example.org')
                        .searchParams.get('edit_fields');  // Get the edit_fields parameter from the URL
                    if (edit_fields && edit_fields.indexOf(',') === -1 && edit_fields !== 'changelist') {
                        // Single field
                        const generic_class = plugin[0].split('-');
                        const search_key = `${generic_class[2]}-${generic_class[3]}-${edit_fields}`;
                        if (generic_inline_fields[search_key]) {
                            // Inline editable?
                            wrapper = this._initInlineRichText(document.querySelectorAll(`.${plugin[0]}`), url, plugin[0]);
                            if (wrapper) {
                                wrapper.dataset.cmsCsrfToken = this.CMS.config.csrf;
                                wrapper.dataset.cmsField = edit_fields;
                                wrapper.dataset.cmsType = (
                                    generic_inline_fields[search_key] === 'HTMLFormField' ?
                                        'HTMLField' : generic_inline_fields[search_key]
                                );
                                wrapper.dataset.settings = 'cms-cfg-htmlfield-inline';
                            }
                        }
                    }
                }

                if (wrapper) {
                    // Stop dblclicks at the wrapper before they reach the
                    // document-delegated `dblclick.cms.plugin` handler — the
                    // canonical "block events from leaving my component"
                    // pattern, mirroring the pointer-event setup below.
                    this._inlineEditing.attachDoubleClick(wrapper);

                    // Catch CMS single click event to highlight the plugin.
                    this.observer.observe(wrapper);
                    if (!this._inlineWrappers.has(wrapper)) {
                        this._inlineWrappers.add(wrapper);
                        if (this.CMS) {
                            wrapper.addEventListener('focusin', () => {
                                this._highlightTextplugin(id);
                            }, true);
                            // Prevent CMS tooltip on hover: stop pointer events from
                            // reaching the document-level CMS delegate handler.
                            // Also drop the direct `dblclick.cms.plugin` handler
                            // that `_setGeneric` binds straight on the container —
                            // it is a sibling listener on the wrapper, so the
                            // per-wrapper guard's `stopPropagation` cannot block
                            // it and the modal would open on every word-select.
                            this.CMS.$(wrapper).off(
                                'pointerover.cms.plugin pointerout.cms.plugin dblclick.cms.plugin'
                            );
                            wrapper.addEventListener('pointerover', function (event) {
                                event.stopPropagation();
                                window.CMS.API.Tooltip.displayToggle(false, event.target, '', id);
                            }, false);
                            wrapper.addEventListener('pointerout', function (event) {
                                event.stopPropagation();
                            }, false);
                        }
                    }
                }
            }
        }, this);

        this._installToolbarSaveGuard();

        window.addEventListener('beforeunload', this._beforeUnload);
    }

    // Preserve the integration entry point while the guard owns click replay.
    _installToolbarSaveGuard() {
        this._navigationGuard.install();
    }

    getEditor(el) {
        const id = typeof el === 'string' ? el : el?.id;
        if (!id) return undefined;
        return this._generic_editors[id] || window.cms_editor_plugin?._editors?.[id];
    }

    _createRTE(el) {
        const settings = this.getSettings(el);
        // Element options overwrite
        settings.options = Object.assign({},
            settings.options || {},
            JSON.parse(el.dataset.options || '{}')
        );

        // Add event listener to delete data on modal cancel (only for modal/admin editors)
        if (settings.revert_on_cancel && el.tagName === 'TEXTAREA') {
            const CMS = this.CMS;
            const csrf = CMS.config?.csrf || document.querySelector('input[name="csrfmiddlewaretoken"]')?.value || '';
            CMS.API.Helpers.addEventListener(
                'modal-close.text-plugin.text-plugin-' + settings.plugin_id,
                function(e, opts) {
                    if (!settings.revert_on_cancel || !settings.cancel_plugin_url) {
                        return;
                    }
                    CMS.$.ajax({
                        method: 'POST',
                        url: settings.cancel_plugin_url,
                        data: {
                            token: settings.action_token,
                            csrfmiddlewaretoken: csrf
                        },
                    }).done(function () {
                        CMS.API.Helpers.removeEventListener(
                            'modal-close.text-plugin.text-plugin-' + settings.plugin_id
                        );
                        opts.instance.close();
                    }).fail(function (res) {
                        CMS.API.Messages.open({
                            message: res.responseText + ' | ' + res.status + ' ' + res.statusText,
                            delay: 0,
                            error: true
                        });
                    });

                }
            );
        }
        const inModal = !!document.querySelector(
            '.app-djangocms_text.model-text.change-form #' + el.id
        );
        // Get content: json > textarea > innerHTML
        let content;

        if (el.dataset.json) {
            content = JSON.parse(el.dataset.json);
        } else  {
            content = el.innerHTML;
        }
        if (el.tagName === 'TEXTAREA') {
            el.visible = false;
            content = el.value;
            // el = el.insertAdjacentElement('afterend', document.createElement('div'));
        }

        this._richTextElements.set(el.id, el);
        window.cms_editor_plugin.create(
            el,
            inModal,
            content, settings,
            el.tagName !== 'TEXTAREA' ? () => this.saveData(el) : () => {
            }
        );
    }

    /**
     * Retrieves the settings for the given editor.
     * If the element is a string, it will be treated as an element's ID.
     * Reads settings from a json script element.
     *
     * @param {string|HTMLElement} el - The element or element's ID to retrieve the settings for.
     *
     * @return {Object} - The settings object for the element.
     */
    getSettings(el) {
        if (typeof el === "string") {
            if (this._editor_settings[el]) {
                return this._editor_settings[el];
            }
            el = document.getElementById(el);
        }
        const settings_el = (
            document.getElementById(el.dataset.settings) ||
            document.getElementById('cms-cfg-' + el.dataset.cmsPluginId)
        );
        if (settings_el) {
            this._editor_settings[el.id] = Object.assign(
                {},
                this._global_settings,
                JSON.parse(settings_el.textContent || '{}')
            );
        } else {
            this._editor_settings[el.id] = Object.assign(
                {},
                this._global_settings,
            );
        }
        if (!this._editor_settings[el.id].plugin_language) {
            // If the plugin change form contains a language meta tag, use it
            const lang = document.querySelector('meta[name="plugin_language"]');

            if (lang && lang.dataset.pluginLanguage) {
                this._editor_settings[el.id].plugin_language = lang.dataset.pluginLanguage;
            } else {
                // If the grouper admin is used, use the language from the grouper admin form
                const lang = document.querySelector('input[name="content__language"]');
                if (lang && lang.value) {
                    this._editor_settings[el.id].plugin_language = lang.value;
                }
            }
        }
        return this._editor_settings[el.id];
    }

    /**
     * Retrieves the plugins available to a Tiptap editor. Without an editor,
     * retain the legacy lookup from the first registered editor's settings.
     *
     * @param {Object} [editor] - The Tiptap editor whose settings to use.
     * @returns {Array} - The list of installed plugins.
     */
    getInstalledPlugins(editor) {
        if (editor) {
            return editor.options.settings?.installed_plugins || [];
        }
        const firstId = Object.keys(this._editor_settings || {})[0];
        if (firstId) {
            return this.getSettings(firstId).installed_plugins || [];
        }
        return [];
    }

    // CMS Editor: destroy
    destroyAll() {
        this.destroyRTE();
        this.destroyGenericEditor();
    }

    destroyRTE() {
        for (const id of Object.keys(window.cms_editor_plugin?._editors || {})) this._destroyRTE(id);
        this._editor_settings = {};
        this._richTextElements.clear();
    }

    _destroyRTE(id) {
        const el = this._richTextElements.get(id) || document.getElementById(id) || {id};
        // Backends accept an element; Tiptap also accepts an ID, CKEditor does not.
        window.cms_editor_plugin.destroyEditor(el);
        this._richTextElements.delete(id);
        delete this._editor_settings[id];
    }

    destroyGenericEditor(el) {
        const ids = el === undefined ? Object.keys(this._generic_editors) :
            [typeof el === 'string' ? el : el.id];
        for (const id of ids) {
            this._generic_editors[id]?.destroy();
            delete this._generic_editors[id];
        }
    }

    saveData(el, action) {
        if (el && el.dataset.changed === "true") {
            // Claim the change immediately: a save may be triggered twice for the same
            // blur (e.g. the toolbar guard flushes while the editor's debounced blur
            // handler is still pending). The failure branches below set it back.
            el.dataset.changed = 'false';
            let url = el.dataset.cmsEditUrl;
            let csrf = el.dataset.cmsCsrfToken;
            let field = el.dataset.cmsField;
            if (this.CMS) {
                this.CMS.API.Toolbar.showLoader();
                url = this.CMS.API.Helpers.updateUrlWithPath(url);
                csrf = this.CMS.config.csrf;
            }

            let data = {
                csrfmiddlewaretoken: csrf,
                _save: 'Save'
            };
            if (field && el.dataset.cmsType !== 'HTMLField') {
                // CharField: use plain textContent, no editor plugin involved
                data[field] = el.textContent;
            } else {
                // TextPlugin or HTMLField: get data from the editor plugin
                const html = window.cms_editor_plugin.getHTML(el);
                const json = window.cms_editor_plugin.getJSON(el);
                if (field) {
                    data[field] = html;
                } else {
                    data.body = html;
                    data.json = json ? JSON.stringify(json) : '';
                }
            }

            const request = fetch(url, {
                method: 'POST',
                body: new URLSearchParams(data),
            })
                .then(response => {
                        if (action !== undefined) {
                            action(el, response);
                        }
                        if (this.CMS) {
                            this.CMS.API.Toolbar.hideLoader();
                        }
                        return response.text();
                }).then(body => {
                    // If the edited field does not force a reload, read the CMS databridge values from the response,
                    // either directly or from a script tag or from the response using regex.
                    // This depends on the exact format django CMS core returns it. This will need to be adjusted
                    // if the format changes.
                    // Fallback solution is to reload the page as djagocms-text-ckeditor used to do.
                    const dom = document.createElement('html');
                    dom.innerHTML = body;
                    const success_element = dom.querySelectorAll('div.messagelist > div.success').length > 0;
                    if (!success_element) {
                        el.dataset.changed = 'true';
                        // Collect messages
                        const domMessages = dom.querySelectorAll(
                            `.field-${field ? field : 'body'} ul.errorlist > li`
                        );
                        let messages = [];
                        domMessages.forEach((message) => {
                            messages.push(message.textContent);
                        });
                        const domField = dom.querySelectorAll(
                            `.field-${field ? field : 'body'} label`
                        );
                        if (messages.length === 0) {
                            // Maybe CMS message from error.html?
                            const errorDescription = dom.querySelector('form fieldset .description');
                            if (errorDescription) {
                                messages.push(errorDescription.textContent);
                            }
                        }
                        if (messages.length > 0 && this.CMS) {
                            this.CMS.API.Toolbar.hideLoader();
                            this.CMS.API.Messages.open({
                                message: (domField.length > 0 ? domField[0].textContent : '') + messages.join(', '),
                                error: true,
                                delay: -1,
                            });
                        }
                        return;  // No databridge to evaluate
                    }
                    if (this.CMS) {
                        // Success:
                        // Remove an error message from a previous save attempt
                        this.CMS.API.Messages.close();
                        // Show messages if any
                        const settings = this.getSettings(el);
                        if (settings.messages_url) {
                            const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
                            const csrf = this.CMS.config?.csrf || csrfInput?.value || '';
                            fetch(settings.messages_url, {
                                method: 'POST',
                                headers: csrf ? {'X-CSRFToken': csrf} : {},
                            })
                                .then(response => response.json())
                                .then(messages => {
                                    let error = "success", message_text = "";
                                    for (let message of messages.messages) {
                                        if (message.level_tag === "error") {
                                            error = "error";
                                        }
                                        const paragraph = document.createElement('p');
                                        paragraph.textContent = message.message;
                                        message_text += paragraph.outerHTML;
                                    }
                                    if (message_text.length > 0) {
                                        this.CMS.API.Messages.open({
                                            message: message_text,
                                            error: error === "error",
                                        });
                                    }
                                });
                        }

                    }
                    el.dataset.changed = 'false';
                    this.processDataBridge(dom);
                    if (!this.CMS.API.Helpers.dataBridge) {
                        // No databridge found
                        this.CMS.API.Helpers.reloadBrowser('REFRESH_PAGE');
                        return;
                    }

                    if (this.CMS.settings.version.startsWith('3.')) {
                        /* Reflect dirty flag in django CMS < 4 */
                        try {
                            /* For some reason, in v3 this fails if the structure board is not open */
                            this.CMS.API.StructureBoard.handleEditPlugin(this.CMS.API.Helpers.dataBridge);
                        } catch (e) {
                            console.error(e);
                        }
                        this._loadToolbar();
                    } else {
                        this.CMS.API.StructureBoard.handleEditPlugin(this.CMS.API.Helpers.dataBridge);
                    }
                })
                .catch(error => {
                    el.dataset.changed = 'true';
                    if (this.CMS) {
                        this.CMS.API.Toolbar.hideLoader();
                        this.CMS.API.Messages.open({
                            message: error.message,
                            error: true,
                            delay: -1,
                        });
                    }
                    window.console.error(error.message);
                    window.console.log(error.stack);
                });

            // Keep a handle on the round trip so `flushPendingSaves` can wait for
            // saves that are already in flight (e.g. started by a blur a moment
            // before the toolbar button was clicked).
            this._pendingSaves.add(request);
            request.finally(() => this._pendingSaves.delete(request));
            return request;
        }
        return Promise.resolve();
    }

    /**
     * Are there inline editors with changes that have not been sent to the server yet?
     *
     * @return {boolean}
     */
    hasUnsavedChanges() {
        return (
            this._pendingSaves.size > 0 ||
            !!document.querySelector('.cms-editor-inline-wrapper[data-changed="true"]')
        );
    }

    /**
     * Save every inline editor that still holds changes and wait for all saves —
     * including those already in flight — to complete.
     *
     * Editors save on blur, but blur handlers are debounced and the save itself is
     * an async request. A click on a toolbar button (most visibly PUBLISH) posts and
     * navigates away before either finishes, so the edit is lost. Callers that are
     * about to leave the page use this to flush first.
     *
     * @return {Promise} - Resolves once no save is outstanding.
     */
    flushPendingSaves() {
        const saves = Array.from(
            document.querySelectorAll('.cms-editor-inline-wrapper[data-changed="true"]'),
            (el) => this.saveData(el)
        );
        return Promise.all(saves.concat(Array.from(this._pendingSaves)));
    }

    processDataBridge(dom) {
        const script = dom.querySelector('script#data-bridge');

        if (script && script.textContent.length > 2) {
            this.CMS.API.Helpers.dataBridge = JSON.parse(script.textContent);
        } else {
            const html = dom.innerHTML;
            const regex1 = /^\s*Window\.CMS\.API\.Helpers\.dataBridge\s=\s(.*?);$/gmu.exec(html);
            const regex2 = /^\s*Window\.CMS\.API\.Helpers\.dataBridge\.structure\s=\s(.*?);$/gmu.exec(html);

            if (regex1 && regex2 && this.CMS) {
                this.CMS.API.Helpers.dataBridge = JSON.parse(regex1[1]);
                this.CMS.API.Helpers.dataBridge.structure = JSON.parse(regex2[1]);
            } else {
                // No databridge found
                this.CMS.API.Helpers.dataBridge = null;
            }
        }
        // Additional content for the page disrupts inline editing and needs to be removed
        if (this.CMS.API.Helpers.dataBridge?.structure?.content) {
            delete this.CMS.API.Helpers.dataBridge.structure.content;
        }
    }

    // CMS Editor: addPluginForm
    // Get form for a new child plugin
    addPluginForm (plugin_type, iframe, el , onLoad, onSave) {
        const settings = this.getSettings(el);
        const data = {
            placeholder_id: settings.placeholder_id,
            plugin_type: plugin_type,
            plugin_parent: settings.plugin_id,
            plugin_language: settings.plugin_language,
            plugin_position: settings.plugin_position + 1,
            cms_path: window.parent.location.pathname,
            cms_history: 0,
        };
        const url = `${settings.add_plugin_url}?${new URLSearchParams(data).toString()}`;
        return this.loadPluginForm(url, iframe, el, onLoad, onSave);
    }

    // CMS Editor: addPluginForm
    // Get form for a new child plugin
    editPluginForm (plugin_id, iframe, el, onLoad, onSave) {
        let url = el.dataset.cmsEditUrl || window.location.href;
        url = url.replace(/\/edit-plugin\/\d+/, '/edit-plugin/' + plugin_id);
        const data = {
            '_popup': 1,
            cms_path: window.parent.location.pathname,
            cms_history: 0,
        };
        url = `${url}?${new URLSearchParams(data).toString()}`;
        return this.loadPluginForm(url, iframe, el, onLoad, onSave);
    }

    loadPluginForm (url, iframe, el, onLoad, onSave) {
        iframe.addEventListener('load', () => {
            const form = iframe.contentDocument;
            const heading = form.querySelector('#content h1');
            const submitrow = form.querySelector('.submit-row');

            // Remove submit button and heading
            if (submitrow) {
                submitrow.style.display = 'none';
            }
            if (heading) {
                heading.style.display = 'none';
            }

            //
            let saveSuccess = !!form.querySelector('div.messagelist div.success');
            if (!saveSuccess) {
                saveSuccess =
                    !!form.querySelector('.dashboard #content-main') &&
                    !form.querySelector('.messagelist .error');
            }
            if (saveSuccess) {
                // Mark document and child as changed
                el.dataset.changed = 'true';
                // Hook into the django CMS dataBridge to get the details of the newly created or saved
                // plugin. For new plugins we need their id to get the content.

                this.processDataBridge(form.body);
                // Needed to update StructureBoard
                if (onSave && this.CMS.API.Helpers.dataBridge) {
                    onSave(el, form, this.CMS.API.Helpers.dataBridge);
                }
                //  Do callback
            } else if (onLoad) {
                onLoad(el, form, heading, submitrow);
            }
            // Editor-specific dialog setup goes into the callback
        });
        iframe.setAttribute('src', url);

    }

    // CMS Editor: requestPluginMarkup
    // Get HTML markup for a child plugin
    requestPluginMarkup (plugin_id, el) {
        const settings = this.getSettings(el);
        const data = {
            plugin: plugin_id,
            token: settings.action_token,
        };

        const url = `${settings.render_plugin_url}?${new URLSearchParams(data).toString()}`;

        return fetch(url, {method: 'GET'})
            .then(response => {
                if (response.status === 200) {
                    return response.text();
                }
                else if (response.status === 204)
                {
                    return null;
                }
            });
     }

    // CMS Editor: resetInlineEditors
    _resetInlineEditors () {
        // Destroy editors whose DOM elements are no longer in the document
        // (e.g., after CMS replaces plugin HTML on save)
        const backend = window.cms_editor_plugin;
        for (const id of Object.keys(backend?._editors || {})) {
            const el = this._richTextElements.get(id) || document.getElementById(id);
            if (!el?.isConnected || (backend.isConnected && !backend.isConnected(el))) {
                this._destroyRTE(id);
            }
        }
        // Clean up orphaned plain text editors
        for (const id of Object.keys(this._generic_editors)) {
            const el = this._generic_editors[id].el;
            if (!el || !document.contains(el)) {
                this.destroyGenericEditor(id);
            }
        }
        this.initInlineEditors();
    }

    // CMS Editor: loadToolbar
    // Load the toolbar after saving for update
    _loadToolbar () {
        const $ = this.CMS.$;
        this.CMS.API.StructureBoard._loadToolbar()
            .done((newToolbar) => {
                this.CMS.API.Toolbar._refreshMarkup($(newToolbar).find('.cms-toolbar'));
            })
            .fail(() => this.CMS.API.Helpers.reloadBrowser());
    }

    _highlightTextplugin (pluginId) {
        const HIGHLIGHT_TIMEOUT = 100;

        if (this.CMS) {
            const $ = this.CMS.$;
            const draggable = $('.cms-draggable-' + pluginId);
            const doc = $(document);
            const currentExpandmode = doc.data('expandmode');


            // expand necessary parents
            doc.data('expandmode', false);
            draggable
                .parents('.cms-draggable')
                .find('> .cms-dragitem-collapsable:not(".cms-dragitem-expanded") > .cms-dragitem-text')
                .each((i, el) => {
                    $(el).triggerHandler(this.CMS.Plugin.click);
                });
            if (draggable.length > 0) {  // Expanded elements available
                setTimeout(function () {
                    doc.data('expandmode', currentExpandmode);
                });
                setTimeout( () => {
                    this.CMS.Plugin._highlightPluginStructure(draggable.find('.cms-dragitem:first'),
                        {successTimeout: 200, delay: 2000, seeThrough: true});
                }, HIGHLIGHT_TIMEOUT);
            }
        }
    }

    _initInlineRichText(elements, url, cls) {
        let wrapper;

        if (elements.length > 0) {
            if (elements.length === 1 && (
                WRAPPER_TAGS.has(elements[0].tagName) ||  // Single wrapping container element
                elements[0].classList.contains('cms-editor-inline-wrapper')  // already wrapped
            )) {
                // already wrapped?
                wrapper = elements[0];
                // Check for .cms-content-start inside the plugin and use it as the editing base
                const contentStart = wrapper.querySelector('.cms-content-start');
                if (contentStart) {
                    wrapper = contentStart;
                }
                wrapper.classList.add('cms-editor-inline-wrapper');
            } else {  // no, wrap now!
                wrapper = document.createElement('div');
                wrapper.classList.add('cms-editor-inline-wrapper', 'wrapped');
                wrapper.classList.add('cms-plugin', cls, 'cms-plugin-start', 'cms-plugin-end');
                wrapper = this._wrapAll(elements, wrapper, cls);
            }
            wrapper.dataset.cmsEditUrl = url;
            return wrapper;
        }
        // No elements found
        return undefined;
    }

    // Wrap wrapper around nodes
    // Just pass a collection of nodes, and a wrapper element
    _wrapAll (nodes, wrapper, cls) {
        // Cache the current parent and previous sibling of the first node.
        const parent = nodes[0].parentNode;
        const previousSibling = nodes[0].previousSibling;

        // Place each node in wrapper.
        for (const node of nodes) {
            // Remove class markers
            node.classList.remove('cms-plugin', cls, 'cms-plugin-start', 'cms-plugin-end');
            // ... and add to wrapper
            wrapper.appendChild(node);
        }

        // Place the wrapper just after the cached previousSibling,
        // or if that is null, just before the first child.
        const nextSibling = previousSibling ? previousSibling.nextSibling : parent.firstChild;
        parent.insertBefore(wrapper, nextSibling);

        return wrapper;
    }
}


// Create global editor object
window.CMS_Editor = window.CMS_Editor || new CMSEditor();

// Bootstrap a queuing stub for the tiptap registry so that dynamically
// contributed extension scripts (e.g. djangocms_text/contrib/filer_image)
// can call register()/registerToolbarItem() regardless of whether they
// load before or after bundle.tiptap.min.js. The tiptap bundle replaces
// this stub with the real registry on load and drains the queue.
(function () {
    'use strict';
    if (window.CMS_Editor.tiptap && !window.CMS_Editor.tiptap._bootstrap) {
        return;
    }
    const existing = window.CMS_Editor.tiptap;
    const queue = (existing && existing._queue) || [];
    const enqueue = (method) => function () {
        queue.push([method, Array.prototype.slice.call(arguments)]);
    };
    window.CMS_Editor.tiptap = {
        _bootstrap: true,
        _queue: queue,
        register: enqueue('register'),
        unregister: enqueue('unregister'),
        registerToolbarItem: enqueue('registerToolbarItem'),
    };
})();
