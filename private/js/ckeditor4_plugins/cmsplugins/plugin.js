import CmsDialog from "../../cms.dialog";

(function ($) {
    if (CKEDITOR && CKEDITOR.plugins && CKEDITOR.plugins.registered && CKEDITOR.plugins.registered.CMSPlugins) {
        return;
    }

    /**
     * Determine if we should return `div` or `span` based on the
     * plugin markup.
     *
     * @function getFakePluginElement
     * @private
     * @param {String} pluginMarkup valid html hopefully
     * @returns {String} div|span
     */
    function getFakePluginElement(pluginMarkup) {
        var innerTags = (pluginMarkup.match(/<\s*([^>\s]+)[\s\S]*?>/) || [0, false]).splice(1);

        var containsAnyBlockLikeElements = innerTags.some(function (tag) {
            return tag && CKEDITOR.dtd.$block[tag];
        });

        var fakeRealType = 'span';

        if (containsAnyBlockLikeElements) {
            fakeRealType = 'div';
        }

        return fakeRealType;
    }

    /**
     * @function replaceTagName
     * @private
     * @param {jQuery} elements
     * @param {String} tagName
     */
    function replaceTagName(elements, tagName) {
        elements.each(function (i, el) {
            var newElement;

            var element = $(el);

            newElement = $('<' + tagName + '>');

            // attributes
            $.each(el.attributes, function (index, attribute) {
                newElement.attr(attribute.nodeName, attribute.nodeValue);
            });

            // content
            newElement.html(element.html());

            element.replaceWith(newElement);
        });
    }

    CKEDITOR.plugins.add('CMSPlugins', {

        // Register the icons. They must match command names.
        icons: 'CMSPlugins',

        // The plugin initialization logic goes inside this method.
        init: function (editor) {
            var that = this;

			CKEDITOR.on('instanceReady', function () {
                var widgetInstances = [];

                for (var key in editor.widgets.instances) {
                    if (editor.widgets.instances.hasOwnProperty(key)) {
                        widgetInstances.push(editor.widgets.instances[key]);
                    }
                }

                that.numberOfChildren = CKEDITOR.tools.array.filter(widgetInstances, function (i) {
                    return i.name === 'cms-widget';
                }).length;
            });
            /**
             * populated with _fresh_ child plugins
             */
            this.unsaved_child_plugins = [];

			var settings  = CMS_Editor.getSettings(editor.name);
			this.setupCancelCleanupCallback(settings);

            // don't do anything if there are no plugins defined
            if (settings === undefined || settings.plugins === undefined) {
                return false;
            }

            this.setupDialog(editor);

            // add the button
            editor.ui.add('CMSPlugins', CKEDITOR.UI_PANELBUTTON, {
                toolbar: 'cms,0',
                label: settings.lang.CMSPlugins.title,
                title: settings.lang.CMSPlugins.title,
                className: 'cke_panelbutton__cmsplugins',
                modes: { wysiwyg: 1 },
                editorFocus: 0,

                panel: {
                    css: [CKEDITOR.skin.getPath('editor')].concat(editor.config.contentsCss),
                    attributes: { 'role': 'cmsplugins', 'aria-label': settings.lang.CMSPlugins.aria }
                },

                // this is called when creating the dropdown list
                onBlock: function (panel, block) {
                    block.element.setHtml(that.setupDropdown(editor));

                    var anchors = $(block.element.$).find('.cke_panel_listItem a');

                    anchors.bind('click', function (e) {
                        e.preventDefault();

                        that.addPlugin($(this), panel, editor);
                    });
                }
            });

            // handle edit event via context menu
            if (editor.contextMenu) {
                this.setupContextMenu(editor);
            }

            editor.addCommand('cmspluginsEdit', {
                exec: function () {
                    var element = that.getElementFromSelection(editor);
                    var plugin = that.getPluginWidget(element);
                    if (plugin) {
                        that.editPlugin(plugin, editor);
                    }
                }
            });

            // handle edit event on double click
            // if event is a jQuery event (touchend), then we mutate
            // event a bit so we make the payload similar to what ckeditor.event produces
            var handleEdit = function (event) {
                event.stop();

                if (event.type === 'touchend' || event.type === 'click') {
                    var cmsPluginNode = $(event.currentTarget).closest('cms-plugin')[0];
					var element;

                    // pick cke_widget span
                    // eslint-disable-next-line new-cap
                    element = new CKEDITOR.dom.element(cmsPluginNode).getParent();

                    event.data = event.data || {};
                    // have to fake selection to be able to replace markup after editing
                    editor.getSelection().fake(element);
                }

                editor.execCommand('cmspluginsEdit');
            };

            editor.on('doubleclick', handleEdit);

            editor.on('instanceReady', function () {
/*
				var context = CMS.$('iframe.cke_wysiwyg_frame');
				if (context.length > 0) {
					context = context.contentWindow.document.documentElement;
				} else {
					context = null;
				}
                CMS.$('cms-plugin', CMS.$('iframe.cke_wysiwyg_frame')[0]
                    .contentWindow.document.documentElement).on('click touchend', handleEdit);
*/
            });

            this.setupDataProcessor(editor);
        },

        getElementFromSelection: function (editor) {
            var selection = editor.getSelection();
            var element = selection.getSelectedElement() ||
                selection.getCommonAncestor().getAscendant('cms-plugin', true);

            return element;
        },

        getPluginWidget: function (element) {
            if (!element) {
                return null;
            }
            return element.getAscendant('cms-plugin', true) || element.findOne('cms-plugin');
        },

        setupDialog: function (editor) {
            var that = this;
            var definition = function () {
                return {
                    title: '',
                    minWidth: 200,
                    minHeight: 200,
                    contents: [{
                        elements: [
                            {
                                type: 'html',
                                html: '<iframe style="position:static; width:100%; height:100%; border:none;" />'
                            }
                        ]
                    }],
                    onOk: function (dialog) {
                        var iframe = $(CKEDITOR.dialog.getCurrent().parts.contents.$).find('iframe').contents();
                        var iframeUrl = iframe[0].URL;

                        iframe.find('form').submit();

                        // catch the reload event and reattach
                        var onSave = CMS.API.Helpers.onPluginSave;

                        CMS.API.Helpers.onPluginSave = function () {
                            CKEDITOR.dialog.getCurrent().hide();
                            var data = CMS.API.Helpers.dataBridge;
                            var addedChildPlugin = false;
							var settings = CMS_Editor.getSettings(editor.name);

                            if (iframeUrl.match(/add-plugin/)) {
                                addedChildPlugin = true;
                            }
                            // in case it's a fresh text plugin children don't have to be
                            // deleted separately
                            if (!settings.delete_on_cancel && addedChildPlugin) {
                                that.unsaved_child_plugins.push(data.plugin_id);
                            }
                            that.insertPlugin(data, dialog.sender._.editor);
							that.numberOfChildren += 1

                            CMS.API.Helpers.onPluginSave = onSave;
                            return false;
                        };
                        return false;
                    }
                };
            };

            // set default definition and open dialog
            CKEDITOR.dialog.add('cmspluginsDialog', definition);
        },

        setupDropdown: function (editor) {
            var tpl = '<div class="cke_panel_block">';
			var settings = CMS_Editor.getSettings(editor.name);

            // loop through the groups
            $.each(settings.plugins, function (i, group) {
                // add template
                tpl += '<h1 class="cke_panel_grouptitle">' + group.group + '</h1>';
                tpl += '<ul role="presentation" class="cke_panel_list">';
                // loop through the plugins
                $.each(group.items, function (ii, item) {
                    tpl += '<li class="cke_panel_listItem"><a href="#" rel="' + item.type + '">' +
                        item.title + '</a></li>';
                });
                tpl += '</ul>';
            });

            tpl += '</div>';

            return tpl;
        },

        setupContextMenu: function (editor) {
            var that = this;
			var settings = CMS_Editor.getSettings(editor.name);

            editor.addMenuGroup('cmspluginsGroup');
            editor.addMenuItem('cmspluginsItem', {
                label: settings.lang.CMSPlugins.editLabel,
                icon: settings.static_url + '/icons/cmsplugins.svg',
                command: 'cmspluginsEdit',
                group: 'cmspluginsGroup'
            });

            editor.removeMenuItem('image');

            editor.contextMenu.addListener(function (element) {
                var plugin = that.getPluginWidget(element);

                if (plugin) {
                    return { cmspluginsItem: CKEDITOR.TRISTATE_OFF };
                }
            });
        },

        editPlugin: function (element, editor) {
            var id = element.getAttribute('id');
            editor.fire('saveSnapshot');

			new CmsDialog(editor.element.$, saveSuccess => {
				if (saveSuccess) {
					window.CMS_Editor.requestPluginMarkup(id, editor.element.$)
						.then(markup => {
							editor.insertHtml(markup, 'unfiltered_html');
							editor.fire('updateSnapshot');
						})
						.catch(error => {
							console.error(error);
						});
				}
				editor.focus();
			}, () => editor.focus()).editDialog(id);
        },

        addPlugin: function (item, panel, editor) {

            // hide the panel
            panel.hide();

            editor.focus();
            editor.fire('saveSnapshot');

			new CmsDialog(editor.element.$, data => {
				if (data.plugin_id) {
					window.CMS_Editor.requestPluginMarkup(data.plugin_id, editor.element.$)
						.then(markup => {
							editor.insertHtml(markup, 'unfiltered_html');
							editor.fire('updateSnapshot');
						})
						.catch(error => {
							console.error(error);
						});
				}
			}, () => editor.focus()).addDialog(item.attr('rel'), editor.getSelection().getSelectedText());
        },

        /**
         * Sets up cleanup requests. If the plugin itself or child plugin was created and then
         * creation was cancelled - we need to clean up created plugins.
         *
         * @method setupCancelCleanupCallback
         * @public
         * @param {Object} settings editor settings
         */
        setupCancelCleanupCallback: function setupCancelCleanupCallback(settings) {
            if (!window.parent || !window.parent.CMS || !window.parent.CMS.API || !window.parent.CMS.API.Helpers) {
                return;
            }

            var that = this;
            var CMS = window.parent.CMS;
            var cancelModalCallback = function cancelModalCallback(e, opts) {
                if (!settings.delete_on_cancel && !that.unsaved_child_plugins.length) {
                    return;
                }
                if (that.unsaved_child_plugins.length) {
                    e.preventDefault();
                    CMS.API.Toolbar.showLoader();
                    var data = {
                        token: settings.action_token
                    };

                    if (!settings.delete_on_cancel) {
                        data.child_plugins = that.unsaved_child_plugins;
                    }

                    $.ajax({
                        method: 'POST',
                        url: settings.cancel_plugin_url,
                        data: data,
                        // use 'child_plugins' instead of default 'child_plugins[]'
                        traditional: true
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
            };

            CMS.API.Helpers.addEventListener(
                'modal-close.text-plugin.text-plugin-' + settings.plugin_id,
                cancelModalCallback
            );
        },

        setupDataProcessor: function (editor) {
            // priorities of callback execution, see http://docs.ckeditor.com/#!/api/CKEDITOR.editor-event-toHtml
            var BEFORE_PROCESSING_STARTED = 1;
            var BEFORE_MARKUP_IS_PARSED = 4;

            /**
             * This override is required for the inline plugins that have preceding space, because otherwise CKEditor
             * would remove that space while parsing
             * html.
             *
             * Ref: https://github.com/ckeditor/ckeditor-dev/blob/master/core/htmlparser/fragment.js#L484
             */
            CKEDITOR.htmlParser.element = CKEDITOR.tools.override(CKEDITOR.htmlParser.element, function (original) {
                return function (name, attributes) {
                    original.call(this, name, attributes);

                    if (name === 'cms-plugin' && attributes['data-cke-real-element-type'] === 'span') {
                        this._.isBlockLike = false;
                    }
                };
            });

            /**
             * @function isBlockLikeChildren
             * @public
             * @param {CKEDITOR.htmlParser.element} element
             * @returns {Boolean}
             */
            function isBlockLikeChildren(element) {
                return element.attributes && element.attributes['data-cke-real-element-type'] === 'div';
            }

            editor.dataProcessor.dataFilter.addRules(
                {
                    elements: {
                        span: function (element) {
                            if (CKEDITOR.plugins.widget.isParserWidgetWrapper(element)) {
                                var cmsPluginNode = element.getFirst();

                                if (isBlockLikeChildren(cmsPluginNode)) {
                                    // eslint-disable-next-line new-cap
                                    var newWrapper = new CKEDITOR.htmlParser.element(
                                        'div',
                                        $.extend({}, element.attributes)
                                    );

                                    editor.widgets.registered.cmswidget.inline = false;
                                    newWrapper.children = element.children;
                                    newWrapper.removeClass('cke_widget_inline');
                                    newWrapper.removeClass('cke_widget_force_block');
                                    newWrapper.addClass('cke_widget_block');
                                    cmsPluginNode.attributes['data-cke-real-element-type'] = 'div';

                                    return newWrapper;
                                }

                                editor.widgets.registered.cmswidget.inline = true;
                                cmsPluginNode.attributes['data-cke-real-element-type'] = 'span';
                            }
                            return element;
                        }
                    }
                },
                {
                    priority: 1,
                    applyToAll: true
                }
            );

            // need to update cms-plugin-nodes with fake "real type" so
            // ckeditor treats them as flow / phrasing elements correctly
            // + we check if plugin markup should be rendered or not
            editor.on('toHtml', function (e) {
                // now i have two problems
                var newMarkup = e.data.dataValue.replace(
                    /<cms-plugin(.*?)>([\s\S]*?)<\/cms-plugin>/gi,
                    function (all, attributes, pluginMarkup) {
                        var fakeRealType = getFakePluginElement(pluginMarkup);

                        if (attributes.match(/render-plugin=["']?false/gi)) {
                            return '<cms-plugin data-cke-real-element-type="' + fakeRealType + '" ' + attributes + '>' +
                                    '<' + fakeRealType + ' class="cms-ckeditor-plugin-label">' +
                                        attributes.replace(/[\s\S]*alt=["']([\s\S]*?)['"][\s\S]*/, '$1') +
                                    '</' + fakeRealType + '>' +
                                '</cms-plugin>';
                        }

                        return '<cms-plugin data-cke-real-element-type="' + fakeRealType + '" ' + attributes + '>' +
                            pluginMarkup +
                            '</cms-plugin>';
                    }
                );

                // in case we have a stale markup with <p> tag wrapped around
                // we want to avoid a situation where browser would try to unwrap the tags in a way that would
                // break the markup. what we do is we replace <cms-plugin> tags with divs if that is necessary,
                // unwrap them with jQuery (which uses browser mechanism) and then replace the divs back
                if (newMarkup.match(/<cms-plugin[^>]*(?=data-cke-real-element-type=\"div)/)) {
                    // eslint-disable-next-line max-len
                    var blockLevelPluginRegex = /<cms-plugin([^>]*(?=data-cke-real-element-type=\"div)[\s\S]*?>[\s\S]*?<\/)cms-plugin>/g;

                    var unwrappedMarkup = newMarkup.replace(blockLevelPluginRegex, '<div$1div>');
                    // have to create a wrapper, otherwise we won't be able to return markup back
                    var unwrappedElementsWrapper = $(unwrappedMarkup).wrapAll('<div>').parent();
                    var wrappers = unwrappedElementsWrapper.find('div[data-cke-real-element-type="div"]');

                    replaceTagName(wrappers, 'cms-plugin');

                    newMarkup = unwrappedElementsWrapper.html();
                }

                e.data.dataValue = newMarkup;
            }, null, null, BEFORE_MARKUP_IS_PARSED);

            editor.on('toHtml', function () {
                // reset widgets to inline again to avoid creating block-level inline widget
                if (editor.widgets && editor.widgets.registered && editor.widgets.registered.cmswidget) {
                    editor.widgets.registered.cmswidget.inline = true;
                }
            }, null, null, BEFORE_PROCESSING_STARTED);
        }
    });
})(CMS.$);
