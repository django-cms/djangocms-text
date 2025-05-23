/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window, document, fetch, IntersectionObserver, URLSearchParams, console */

import CmsTextEditor from './cms.texteditor.js';
import LinkField from "./cms.linkfield";
import CmsDialog from "./cms.dialog";

// #############################################################################
// CMS Editor
// #############################################################################

class CMSEditor {

    // CMS Editor: constructor
    // Initialize the editor object
    constructor() {
        this._global_settings = {};
        this._editor_settings = {};
        this._generic_editors = {};
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

    // CMS Editor: init
    // Initialize a single editor
    init (el) {
        if (!el.id) {
            el.id = "cms-edit-" + Math.random().toString(36).slice(2, 9);
        }
        // Create editor
        if (!el.dataset.cmsType || el.dataset.cmsType === 'TextPlugin' || el.dataset.cmsType === 'HTMLField') {
            this._createRTE(el);
        } else if (el.dataset.cmsType === 'CharField') {
            // Creat simple generic text editor
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
    initInlineEditors() {
        if (this.CMS === undefined || this.CMS._plugins === undefined) {
            // Check the CMS frontend for plugins
            // no plugins -> no inline editors
            return;
        }

        this.observer = this.observer || new IntersectionObserver( (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    this.observer.unobserve(entry.target);  // Only init once
                    this.init(entry.target);
                }
            }, this);
        }, {
            root: null,
            threshold: 0.05
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
                    const edit_fields = new URL(url.replace('&amp;', '&'), 'https://random-base.org')
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
                    // Catch CMS single click event to highlight the plugin
                    // Catch CMS double click event if present, since double click is needed by Editor
                    if (!Array.from(this.observer.root?.children || []).includes(wrapper)) {
                        // Only add to the observer if not already observed (e.g., if the page only was update partially)
                        this.observer.observe(wrapper);
                        if (this.CMS) {
                            // Remove django CMS core's double click event handler which opens an edit dialog
                            this.CMS.$(wrapper).off('dblclick.cms.plugin')
                                .on('dblclick.cms-editor', function (event) {
                                    event.stopPropagation();
                                });
                            wrapper.addEventListener('focusin', () => {
                                this._highlightTextplugin(id);
                            }, true);
                            // Prevent tooltip on hover
                            this.CMS.$(wrapper).off('pointerover.cms.plugin pointerout.cms.plugin')
                                .on('pointerover.cms-editor', function (event) {
                                    window.CMS.API.Tooltip.displayToggle(false, event.target, '', id);
                                    event.stopPropagation();
                                });
                        }
                    }
                }
            }
        }, this);

        window.addEventListener('beforeunload', (event) =>  {
            if (document.querySelector('.cms-editor-inline-wrapper[data-changed="true"]')) {
                event.preventDefault();
                event.returnValue = true;
                return 'Do you really want to leave this page?';
            }
        });
    }

    _createRTE(el) {
        const settings = this.getSettings(el);
        // Element options overwrite
        settings.options = Object.assign({},
            settings.options || {},
            JSON.parse(el.dataset.options || '{}')
        );

        // Add event listener to delete data on modal cancel
        if (settings.revert_on_cancel) {
            const CMS = this.CMS;
            const csrf = CMS.config?.csrf || document.querySelector('input[name="csrfmiddlewaretoken"]').value;
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
        return this._editor_settings[el.id];
    }

    /**
     * Retrieves the list of installed plugins. (Returns empty list of no editor has been initialized.)
     *
     * @returns {Array} - The list of installed plugins.
     */
    getInstalledPlugins() {
        if (this._editor_settings) {
            return this.getSettings(Object.keys(this._editor_settings)[0]).installed_plugins || [];
        }
        return [];
    }

    // CMS Editor: destroy
    destroyAll() {
        this.destroyRTE();
        this.destroyGenericEditor();
    }

    destroyRTE() {
        for (const el of Object.keys(this._editor_settings)) {
            const element = document.getElementById(el);
            window.cms_editor_plugin.destroyEditor(el);
        }
        this._editor_settings = {};
    }

    // CMS Editor: destroyGenericEditor
    destroyGenericEditor (el) {
        if (el in this._generic_editors) {
            this._generic_editors[el].destroy();
            delete this._generic_editors[el];
            this._generic_editors.pop(el);
        }
    }

    saveData(el, action) {
        if (el && el.dataset.changed === "true") {
            const html = window.cms_editor_plugin.getHTML(el),
                json = window.cms_editor_plugin.getJSON(el);

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
            if (field) {
                // FormField data
                data[field] = el.dataset.cmsType === 'HTMLField' ? html : el.textContent ;
            } else {
                // Plugin data
                data.body = html;
                data.json = JSON.stringify(json) || '';
            }

            fetch(url, {
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
                            fetch(settings.messages_url)
                                .then(response => response.json())
                                .then(messages => {
                                    let error = "success", message_text = "";
                                    for (let message of messages.messages) {
                                        if (message.level_tag === "error") {
                                            error = "error";
                                        }
                                        message_text += `<p>${message.message}</p>`;
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
        }
    }

    processDataBridge(dom) {
        const script = dom.querySelector('script#data-bridge');

        if (script && script.textContent.length > 2) {
            this.CMS.API.Helpers.dataBridge = JSON.parse(script.textContent);
        } else {
            const regex1 = /^\s*Window\.CMS\.API\.Helpers\.dataBridge\s=\s(.*?);$/gmu.exec(dom.innerHTML);
            const regex2 = /^\s*Window\.CMS\.API\.Helpers\.dataBridge\.structure\s=\s(.*?);$/gmu.exec(dom.innerHTML);

            if (regex1 && regex2 && this.CMS) {
                this.CMS.API.Helpers.dataBridge = JSON.parse(regex1[1]);
                this.CMS.API.Helpers.dataBridge.structure = JSON.parse(regex2[1]);
            } else {
                // No databridge found
                this.CMS.API.Helpers.dataBridge = null;
            }
        }
        // Additional content for the page disrupts inline editing and needs to be removed
        delete this.CMS.API.Helpers.dataBridge.structure?.content;
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

                this.processDataBridge(form);
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
                elements[0].tagName === 'DIV' || // Single wrapping div
                elements[0].tagName === 'CMS-PLUGIN' ||  // Single wrapping cms-plugin tag
                elements[0].classList.contains('cms-editor-inline-wrapper')  // already wrapped
            )) {
                // already wrapped?
                wrapper = elements[0];
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

