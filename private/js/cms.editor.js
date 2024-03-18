/* eslint-env es6 */
/* jshint esversion: 6 */
/* global window, document, fetch, IntersectionObserver, URLSearchParams, console */

// #############################################################################
// CMS Editor
// #############################################################################

class CMSEditor {

    // CMS Editor: constructor
    // Initialize the editor object
    constructor() {
        this._editors = [];
        this._options = {};
        this._editor_settings = {};

        // Get the CMS object from the parent window
        if (window.CMS !== undefined && window.CMS.config !== undefined) {
            this.mainWindow = window;
            this.CMS = window.CMS;
        } else {
            this.mainWindow = window.parent;
            this.CMS = window.parent.CMS;
        }

        document.addEventListener('DOMContentLoaded', () => this.initAll());
        if (this.CMS) {
            // Only needs to happen on the main window.
            this.CMS.$(window).on('cms-content-refresh', () => this._resetInlineEditors());
        }
    }

    // CMS Editor: init
    // Initialize a single editor
    init (el) {
        const editor_type = el.dataset.type || 'HTMLField';
        let content;

        // Get content: json > textarea > innerHTML
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
        if (!el.id) {
            el.id = "cms-edit-" + Math.random().toString(36).slice(2, 9);
        }
        const settings = this.getSettings(el);
        // Element options overwrite
        settings.options = Object.assign({},
            this._options[editor_type],
            settings.options || {},
            JSON.parse(el.dataset.options || '{}')
        );

        // Add event listener to delete data on modal cancel
        if (settings.revert_on_cancel) {
            const CMS = this.CMS;
            const csrf = CMS.config.csrf;
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

        // Create editor
        window.cms_editor_plugin.create(
            el,
            inModal,
            content, settings,
            el.tagName !== 'TEXTAREA' ? () => this.saveData(el) : () => {}
        );
        this._editors.push(el);
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
        const plugins = this.CMS._plugins;

        this.observer = this.observer || new IntersectionObserver( (entries, opts) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    this.init(entry.target);
                }
            }, this);
        }, {
            root: null,
            threshold: 0.05
        });

        plugins.forEach(function (plugin) {
            if (plugin[1].plugin_type === 'TextPlugin') {
                const url = plugin[1].urls.edit_plugin;
                const id = plugin[1].plugin_id;
                const elements = document.querySelectorAll('.cms-plugin.cms-plugin-' + id);
                let wrapper;

                if (elements.length > 0) {
                    if (elements.length === 1 && elements[0].tagName === 'DIV') {  // already wrapped?
                        wrapper = elements[0];
                        wrapper.classList.add('cms-editor-inline-wrapper');
                    } else {  // no, wrap now!
                        wrapper = document.createElement('div');
                        wrapper.classList.add('cms-editor-inline-wrapper', 'wrapped');
                        wrapper = this._wrapAll(elements, wrapper);
                        wrapper.classList.add('cms-plugin', 'cms-plugin-' + id);
                        for (let child of wrapper.children) {
                            child.classList.remove('cms-plugin', 'cms-plugin-' + id);
                        }
                    }
                    wrapper.dataset.cmsEditUrl = url;
                    wrapper.dataset.cmsPluginId = id;

                    // Catch CMS single click event to highlight the plugin
                    // Catch CMS double click event if present, since double click is needed by Editor
                    if (this.CMS) {
                        this.CMS.$(wrapper).on('dblclick.cms-editor', function (event) {
                            event.stopPropagation();
                        });
                        wrapper.addEventListener('focusin.cms-editor',  () => {
                            this._highlightTextplugin(id);
                        }, true);
                    }

                    // Prevent tooltip on hover
                    document.addEventListener('pointerover.cms-editor', (event) => {
                        // use time out to let other event handlers (CMS' !) run first.
                        setTimeout(function () {
                            // do not show tooltip on inline editing text fields.
                            this.CMS.API.Tooltip.displayToggle(false, event.target, '', id);
                        }, 0);
                    });

                    this.observer.observe(wrapper);
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
            this._editor_settings[el.id] = JSON.parse(settings_el.textContent);
            return this._editor_settings[el.id];
        }
        return {};
    }

    /**
     * Retrieves the list of installed plugins. (Returns empty list of no editor has been initialized.)
     *
     * @returns {Array} - The list of installed plugins.
     */
    getInstalledPlugins() {
        if (this._editor_settings) {
            return this.getSettings(Object.keys(this._editor_settings)[0]).installed_plugins;
        }
        return [];
    }

    // CMS Editor: init_all
    initAll () {
        // Get global options from script element
        try {
            this._options = JSON.parse(document.getElementById('cms-editor-cfg').textContent);
        } catch (e) {
            this._options = {};
        }
        // All textareas with class CMS_Editor: typically on admin site
        document.querySelectorAll('textarea.CMS_Editor').forEach(
            (el) => this.init(el), this
        );
        // Register all plugins on the page for inline editing
        this.initInlineEditors();
    }

    // CMS Editor: destroy
    destroyAll() {
        while (this._editors.length) {
            window.cms_editor_plugin.destroyEditor(this._editors.pop());
        }
    }

    saveData(el, action) {
        if (el && el.dataset.changed === "true") {
            const html = window.cms_editor_plugin.getHTML(el),
                json = window.cms_editor_plugin.getJSON(el);

            let url = el.dataset.cmsEditUrl;
            let csrf = el.dataset.cmsCsrfToken;
            if (this.CMS) {
                this.CMS.API.Toolbar.showLoader();
                url = this.CMS.API.Helpers.updateUrlWithPath(url);
                csrf = this.CMS.config.csrf;
            }

            fetch(url, {
                method: 'POST',
                body: new URLSearchParams({
                    csrfmiddlewaretoken: csrf,
                    body: html,
                    json: JSON.stringify(json) || '',
                    _save: 'Save'
                }),
            })
                .then(response => {
                        el.dataset.changed = 'false';
                        if (this.CMS) {
                            this.CMS.API.Toolbar.hideLoader();
                        }
                        if (action !== undefined) {
                            action(el, response);
                        }
                    if (el.dataset.childChanged) {
                        this.CMS.API.Helpers.reloadBrowser('REFRESH_PAGE');
                    } else {
                        this._loadToolbar();
                    }
                })
                .catch(error => {
                        el.dataset.changed = 'true';
                    if (this.CMS) {
                        this.CMS.API.Messages.open({
                            message: error.message,
                            error: true
                        });
                    } else {
                        window.console.error(error.message);
                    }
                });
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
        return this.loadForm(url, iframe, el, onLoad, onSave);
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
        return this.loadForm(url, iframe, el, onLoad, onSave);
    }

    loadForm (url, iframe, el, onLoad, onSave) {
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
            let saveSuccess = !!form.querySelector('.messagelist :not(.error)');
            if (!saveSuccess) {
                saveSuccess =
                    !!form.querySelector('.dashboard #content-main') &&
                    !form.querySelector('.messagelist .error');
            }
            if (saveSuccess) {
                // Mark document and child as changed
                el.dataset.changed = 'true';
                el.dataset.childChanged = 'true';
                // Hook into the django CMS dataBridge to get the details of the newly created or saved
                // plugin. For new plugins we need their id to get the content.
                if (!this.CMS.API.Helpers.dataBridge) {
                    // The dataBridge sets a timer, so typically it will not yet be present
                    setTimeout(() => {
                        if (onSave) {
                            onSave(el, form, this.CMS.API.Helpers.dataBridge);
                        }
                    }, 100);
                } else {
                    if (onSave) {
                        onSave(el, form, this.CMS.API.Helpers.dataBridge);
                    }
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
        this.destroyAll();
        this.initAll();
    }

    // CMS Editor: loadToolbar
    // Load the toolbar after saving for update
    _loadToolbar () {
        if (this.CMS) {
            const $ = this.CMS.$;
            this.CMS.API.StructureBoard._loadToolbar()
                .done((newToolbar) => {
                    this.CMS.API.Toolbar._refreshMarkup($(newToolbar).find('.cms-toolbar'));
                })
                .fail(() => this.CMS.API.Helpers.reloadBrowser());
        }
    }

    _highlightTextplugin (pluginId) {
        const HIGHLIGHT_TIMEOUT = 800;

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

    // Wrap wrapper around nodes
    // Just pass a collection of nodes, and a wrapper element
    _wrapAll (nodes, wrapper) {
        // Cache the current parent and previous sibling of the first node.
        const parent = nodes[0].parentNode;
        const previousSibling = nodes[0].previousSibling;

        // Place each node in wrapper.
        //  - If nodes is an array, we must increment the index we grab from
        //    after each loop.
        //  - If nodes is a NodeList, each node is automatically removed from
        //    the NodeList when it is removed from its parent with appendChild.
        for (let i = 0; nodes.length - i; wrapper.firstChild === nodes[0] && i++) {
            wrapper.appendChild(nodes[i]);
        }

        // Place the wrapper just after the cached previousSibling,
        // or if that is null, just before the first child.
        const nextSibling = previousSibling ? previousSibling.nextSibling : parent.firstChild;
        parent.insertBefore(wrapper, nextSibling);

        return wrapper;
    }
}

// Create global editor object
window.CMS_Editor = new CMSEditor();

