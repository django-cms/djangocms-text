/* eslint-env es6 */
/* jshint esversion: 9 */
/* global document, window, console, DOMParser */

import { Node } from '@tiptap/core';
import CmsDialog from "../cms.dialog.js";
import TiptapToolbar from "./cms.tiptap.toolbar";

const blockTags = ((str) => str.toUpperCase().substring(1, str.length-1).split("><"))(
    "<address><article><aside><blockquote><canvas><dd><div><dl><dt><fieldset><figcaption><figure><footer><form>" +
    "<h1><h2><h3><h4><h5><h6><header><hr><li><main><nav><noscript><ol><p><pre><section><table><tfoot><ul><video>"
);


function getNodeType(plugin) {
    'use strict';
    if (plugin) {
        return blockTags.includes(plugin.tagName) ? 'cmsBlockPlugin': 'cmsPlugin';
    }
    return 'cmsPlugin';
}


/**
 * Turn a trusted SVG icon *string* (from the server-side plugin registry,
 * never user input) into a DOM node without going through an `innerHTML`
 * sink. The string is parsed as XML (`image/svg+xml`), which does not
 * execute scripts, then the resulting <svg> element is imported.
 *
 * @param {string} svg - The SVG markup string.
 * @return {SVGElement|null} - The imported <svg> node, or null if invalid.
 */
function svgStringToNode(svg) {
    'use strict';
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    if (doc.querySelector('parsererror') || doc.documentElement.tagName.toLowerCase() !== 'svg') {
        return null;
    }
    return document.importNode(doc.documentElement, true);
}


function addCmsPluginDialog(editor, pluginType, selectionText) {
    'use strict';

     new CmsDialog(editor.options.el, data => {
        if (data.plugin_id) {
            window.CMS_Editor.requestPluginMarkup(data.plugin_id, editor.options.el)
                .then(markup => {
                    const ghost = document.createElement("div");
                    ghost.innerHTML = markup || "<cms-plugin></cms-plugin>";

                    const plugin = ghost.firstChild;

                    let attrs = {};
                    Array.from(plugin.attributes).forEach(attr => {
                        attrs[attr.name] = attr.value;
                    });
                    attrs["data-node"] = getNodeType(plugin.firstElementChild);

                    editor.chain().focus().insertContent({
                        type: getNodeType(plugin.firstElementChild),
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
                    attrs["data-node"] = getNodeType(plugin.firstElementChild);

                    let transaction = editor.state.tr;
                    let node = editor.schema.nodes[getNodeType(plugin.firstElementChild)];
                    transaction.setNodeMarkup(position, node, {
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
    }
    return `<span ${title}class="dropdown" role="button">${icon}<div class="dropdown-content vertical plugins">${dropdown}</div></span>`;

}

TiptapToolbar.CMSPlugins.render = renderCmsPluginMenu;

// Common node properties for both inline and block nodes
const cmsPluginNodes = {
    atom: true,
    draggable: true,

    addAttributes() {
        'use strict';
        return {
            HTMLAttributes: {},
            HTMLContent: null,
            HTMLBlock: false,
            type: "",
        };
    },

    addOptions() {
        'use strict';
        return {
            editor: null,
        };
    },

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
                    if (getNodeType(dom.firstElementChild) !== this.name) {
                        // Node types need to match
                        return false;
                    }
                    attrs['data-node'] = this.name;
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
        // render the node as HTML
        // If a block HTML tag comes, wrap it in a span to avoid issues with the editor
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
                event.preventDefault();
            });
            dom.addEventListener('dblclick', (event) => {
                event.stopPropagation();
                event.preventDefault();

                editCmsPluginDialog(editor, node.attrs.HTMLAttributes.id, getPos());
            });
            // store the getPos function in the node to be able to edit the node from the menu bar later
            node.getPos = getPos;
            // Detect descendant visiblilty after layout. Insert the plugin's icon
            // (or a generic puzzle icon) as a real DOM child so the user can
            // still see, select, and edit the plugin.
	    function hasVisibleContent(el){
	        for (const child of el.querySelectorAll('*')){
		        const rect = child.getBoundingClientRect();
		        if (rect.width > 0 && rect.height > 0) 
                    return true;
		}
		return false;
	    }
            requestAnimationFrame(() => {
                if (!hasVisibleContent(dom)){
                    dom.classList.add('cms-plugin-empty');
                    const placeholder = document.createElement('span');
                    placeholder.classList.add('cms-plugin-placeholder');
                    // Look up the plugin's own icon from the installed plugins list
                    const pluginType = node.attrs.HTMLAttributes.type;
                    const installed = window.CMS_Editor?.getInstalledPlugins?.() || [];
                    const pluginDef = installed.find(p => p.value === pluginType);
                    // Icons are trusted SVG strings from the plugin registry;
                    // parse and append them as nodes rather than via innerHTML.
                    // Fall back to the plugin type as plain text.
                    const icon = pluginDef?.icon || TiptapToolbar.CMSPlugins?.icon;
                    const iconNode = icon ? svgStringToNode(icon) : null;
                    if (iconNode) {
                        placeholder.appendChild(iconNode);
                    } else {
                        placeholder.textContent = pluginType || '';
                    }
                    dom.appendChild(placeholder);
                }
            });
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
};

const CmsPluginNode = Node.create({
    ...cmsPluginNodes,

    name: 'cmsPlugin',
    inline: () => true,
    group:() => 'inline',
});

const CmsBlockPluginNode = Node.create({
    ...cmsPluginNodes,

    name: 'cmsBlockPlugin',
    inline: () => false,
    group: () => 'block',
});

export { CmsPluginNode, CmsBlockPluginNode, CmsPluginNode as default };
