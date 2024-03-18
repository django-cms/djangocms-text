/* eslint-env es6 */
/* jshint esversion: 6 */
/* global document, window, console */

import { Node } from '@tiptap/core';
import CmsDialog from "../cms.dialog.js";
import TiptapToolbar from "./cms.tiptap.toolbar";

function addCmsPluginDialog(editor, pluginType, selectionText) {
    'use strict';

     new CmsDialog(editor.options.el, data => {
        if (data.plugin_id) {
            window.CMS_Editor.requestPluginMarkup(data.plugin_id, editor.options.el)
                .then(markup => {
                    const ghost = document.createElement("div");
                    ghost.innerHTML = markup;

                    const plugin = ghost.firstChild;

                    let attrs = {};
                    Array.from(plugin.attributes).forEach(attr => {
                        attrs[attr.name] = attr.value;
                    });
                    editor.chain().focus().insertContent({
                        type: 'cmsPlugin',
                        attrs: {
                            HTMLAttributes: attrs,
                            HTMLContent: plugin.innerHTML,
                            type: attrs.type
                        },
                    }).run();
                })
                .catch(error => {
                    console.error(error);
                });
        }
    }, () => editor.commands.focus()).addDialog(pluginType, selectionText);
}



function editCmsPluginDialog(editor, id, position) {
    "use strict";

    new CmsDialog(editor.options.el, saveSuccess => {
        if (saveSuccess) {
            window.CMS_Editor.requestPluginMarkup(id, editor.options.el)
                .then(markup => {
                    const ghost = document.createElement("div");
                    ghost.innerHTML = markup;

                    const plugin = ghost.firstChild;  // cms-plugin tag

                    let attrs = {};
                    Array.from(plugin.attributes).forEach(attr => {
                        attrs[attr.name] = attr.value;
                    });

                    let transaction = editor.state.tr;
                    transaction.setNodeMarkup(position, null, {
                        HTMLAttributes: attrs,
                        HTMLContent: plugin.innerHTML,
                        type: attrs.type
                    });

                    editor.view.dispatch(transaction);
                    editor.commands.focus();
                })
                .catch(error => {
                    console.warn(error);
                });
        }
        editor.commands.focus();
    }, () => editor.commands.focus()).editDialog(id);
}


function renderCmsPluginMenu(editor, item, filter) {
    "use strict";

    if (filter === 'block') {
        return '';
    }
    const title = item.title && item.icon ? `title='${item.title}' ` : '';
    const icon = item.icon || item.title;
    let dropdown = '';

    const plugins = window.CMS_Editor.getInstalledPlugins();

    if (!plugins) {
        return '';
    }
    let module = '';

    for (const plugin of plugins) {
        if (module !== plugin.module) {
            module = plugin.module;
            dropdown += `<em class="header">${module}</em>`;
        }
        dropdown += `<button data-cmsplugin="${plugin.value}" data-action="CMSPlugins">${plugin.icon || '<span class="icon"></span>'}${plugin.name}</button>`;
        console.log(plugin);
    }
    return `<span ${title}class="dropdown" role="button">${icon}<div class="dropdown-content vertical plugins">${dropdown}</div></span>`;

}

TiptapToolbar['CMSPlugins'].render = renderCmsPluginMenu;


export default Node.create({

    name: 'cmsPlugin',

    addOptions() {
        'use strict';
        return {
            editor: null,
        };
    },

    addAttributes() {
        'use strict';
        return {
            HTMLAttributes: {},
            HTMLContent: null,
            type: "",
        };
    },

    group() {
        'use strict';
        let group = 'inline';
        try {
            group = this.firstChild.type.spec.group;
        } catch (e) {
            console.warn(e);
        }
        console.log("group", group);
        return group;
    },

    inline() {
        'use strict';
        try {
            return this.firstChild.type.spec.inline.contains('inline');
        } catch (e) { }
        return true;
    },

    atom: true,

    draggable: true,

    parseHTML() {
        'use strict';
        return [
            {
                tag: 'cms-plugin',
                getAttrs: (dom) => {
                    // get all attributes
                    let attrs = {};
                    Array.from(dom.attributes).forEach(attr => {
                        attrs[attr.name] = attr.value;
                    });
                    // return attributes and content
                    return {
                        HTMLAttributes: attrs,
                        HTMLContent: dom.innerHTML,
                        type: attrs.type || "CMSPlugin"
                    };
                }
            },
        ];
    },

    renderHTML({node}) {
        return [
            'cms-plugin',
            node.attrs.HTMLAttributes,
            node.attrs.HTMLContent,
        ];
    },

    addNodeView() {
        'use strict';
        return ({editor, node, view, getPos}) => {
            const dom = document.createElement("cms-plugin");

            // insert HTML
            if (node.attrs.HTMLAttributes["render-plugin"] === "true") {
                dom.innerHTML = node.attrs.HTMLContent;
            }
            // add attributes
            for (const [attr, value] of Object.entries(node.attrs.HTMLAttributes)) {
                dom.setAttribute(attr, value);
            }
            // Capture and stop click events
            dom.addEventListener('click', (event) => {
                event.stopPropagation();
                event.preventDefault();
            });
            dom.addEventListener('dblclick', (event) => {
                event.stopPropagation();
                event.preventDefault();

                editCmsPluginDialog(editor, node.attrs.HTMLAttributes.id, getPos());
            });
            // store the getPos function in the node to be able to edit the node from the menu bar later
            node.getPos = getPos;
            return {dom};
        };
    },

    addCommands() {
        'use strict';
        return {
            addCmsPlugin: (pluginType, dryRun) => ({editor, commands}) => {
                if (!pluginType) {
                    return false;
                }
                if (dryRun) {
                    return true;
                }

                if (editor.isActive('cmsPlugin', {type: pluginType})) {
                    // Already plugin of this type active? Edit it.
                    // const position = editor.state.doc.resolve(editor.state.selection.from);
                    editCmsPluginDialog(
                        editor,
                        editor.state.selection.node.attrs.HTMLAttributes.id,
                        editor.state.selection.node.getPos()
                    );
                } else {
                    const { view } = editor;
                    const { selection } = view.state;
                    const selectionText = view.state.doc.textBetween(selection.from, selection.to, ' ');

                    addCmsPluginDialog(editor, pluginType, selectionText);
                }
                return true;
            },
        };
    },
});

