/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */

'use strict';

import {Mark, Node, mergeAttributes} from '@tiptap/core';
import TiptapToolbar from "./cms.tiptap.toolbar";


const _markElement = {
    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },
    parseHTML() {
        return [
            {
                tag: this.name.toLowerCase()
            },
        ];
    },
    renderHTML({ HTMLAttributes }) {
        return [this.name.toLowerCase(), mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },

    addCommands() {
        let commands = {};

        commands[`set${this.name}`] = () => ({ commands }) => {
            return commands.setMark(this.name);
        };
        commands[`toggle${this.name}`] = () => ({ commands }) => {
            return commands.toggleMark(this.name);
        };
        commands[`unset${this.name}`] = () => ({ commands }) => {
            return commands.unsetMark(this.name);
        };
        return commands;
    },
};

const InlineQuote = Mark.create({
    name: 'Q',
    ..._markElement,
});

const Highlight = Mark.create({
    name: 'Highlight',
    parseHTML() {
        return [{tag: 'mark'}];
    },
    renderHTML({ HTMLAttributes }) {
        return ['mark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
});


function renderColorMenu(editor, builder) {
    const items = [];
    const mark = editor.extensionManager.extensions.find(extension => extension.name === 'textcolor');
    for (const [cls, def] of Object.entries(mark.options?.textColors || {})) {
        items.push(`<button data-action="TextColor" data-class="${cls}" title="${def.name}" class="${cls}"></button>`);
    }
    return items.join('');

}

const TextColor = Mark.create({
    name: 'textcolor',
    addOptions() {
        return {
            textColors: {
                'text-primary': {name: "Primary"},
                'text-secondary': {name: "Secondary"},
                'text-success': {name: "Success"},
                'text-danger': {name: "Danger"},
                'text-warning': {name: "Warning"},
                'text-info': {name: "Info"},
                'text-light': {name: "Light"},
                'text-dark': {name: "Dark"},
                'text-body': {name: "Body"},
                'text-muted': {name: "Muted"},
            },
        };
    },

    onCreate() {
        if (this.editor.options.textColors) {
            // Let editor options overwrite the default colors
            this.options.textColors = this.editor.options.textColors;
        }
    },

    addAttributes() {
        return {
            class: { default: null },
            style: { default: null}
        };
    },

    parseHTML() {
        return [
            {
                tag: '*',
                getAttrs: (node) => {
                    for (const cls of Object.keys(this.options?.textColors || {})) {
                        if (node.classList.contains(cls)) {
                            return {class: cls};
                        }
                    }
                    return false;
                }
            },
            {
                tag: '*',
                getAttrs: node => {
                    if (node.style.color) {
                        return {style: node.style.color};
                    }
                    return false;
                }
            }
        ];
    },

    renderHTML: attributes => {
        return ['span',  mergeAttributes({}, attributes.HTMLAttributes), 0];
    },

    addCommands() {
        return {
            setTextColor: (cls) => ({commands}) => {
                if (!(cls in this.options.textColors)) {
                    return false;
                }
                return commands.setMark(this.name, {"class": cls} );
            },
            toggleTextColor: (cls) => ({commands}) => {
                if (!cls) {
                    cls = Object.keys(this.options.textColors)[0];
                }
                if (!(cls in this.options.textColors)) {
                    return false;
                }
                return commands.toggleMark(this.name, {"class": cls} );
            },
            unsetTextColor: (cls) => ({commands}) => {
                if (!(cls in this.options.textColors)) {
                    return false;
                }
                return commands.unsetMark(this.name, {"class": cls} );
            },
        };
    }
});


const blockTags = ((str) => str.toUpperCase().substring(1, str.length-1).split("><"))(
    "<address><article><aside><blockquote><canvas><dd><div><dl><dt><fieldset><figcaption><figure><footer><form>" +
    "<h1><h2><h3><h4><h5><h6><header><hr><li><main><nav><noscript><ol><p><pre><section><table><tfoot><ul><video>"
);

function renderStyleMenu(styles, editor, defaultTag = 'span') {
    const allStyles = styles || InlineStyle.options.styles;
    const menu = [];
    for (let i = 0; i < allStyles.length; i++) {
        const action = blockTags.includes((allStyles[i].element || defaultTag).toUpperCase()) ? 'BlockStyles' : 'InlineStyles';
        menu.push(`<button data-action="${action}" data-id="${i}">${allStyles[i].name}</button>`);
    }
    return menu.join('');
}

function validateAttributes(node, styleAttributes) {
    if (!styleAttributes) {
        return true;
    }

    if (styleAttributes.class) {
        const requiredClasses = styleAttributes.class.split(' ');
        if (!requiredClasses.every(cls => node.classList.contains(cls))) {
            return false;
        }
    }
    return Object.entries(styleAttributes)
        .every(([key, value]) => key === 'class' || node.getAttribute(key) === value);
}


/**
 * Represents a utility or configuration object for managing and applying styles.
 * Provides methods for adding options and attributes, parsing HTML styles, and rendering
 * HTML with specific styles and attributes.
 *
 * @type {Object}
 *
 * @property {Function} addOptions
 *     Adds configuration options for styles. Returns an object with an array of styles.
 *
 * @property {Function} addAttributes
 *     Adds default attributes for tags. Returns an object containing default settings
 *     for `tag` and `attributes`.
 *
 * @property {Function} parseHTML
 *     Parses the HTML to match and apply styles based on the context (block or inline).
 *     Adjusts styles using editor options and validates them against node attributes.
 *     Returns a mapped array of style objects, including tag and attribute configurations.
 *
 * @property {Function} renderHTML
 *     Renders the HTML by merging provided attributes with the default ones. Outputs
 *     a structured array containing the tag, merged attributes, and content placeholder.
 */
const Style = {
    addOptions() {
        return { styles: [] };
    },

    addAttributes() {
        return {
            tag: { default: null },
            attributes: { default: {} },
        };
    },

    parseHTML() {
        const styles = this.name === 'blockstyle' ?
            this.editor.options.blockStyles :
            this.editor.options.inlineStyles;
        if (styles) {
            this.options.styles = styles;
        }

       return (this.options.styles || []).map(style => {
           return {
               tag: style.element || '*',
               getAttrs: node => validateAttributes(node, style.attributes) && (
                   style.element ?
                       {tag: style.element, attributes: style.attributes} :
                       {attributes: style.attributes}
               )
           };
        });
    },

   renderHTML({HTMLAttributes}) {
        return [HTMLAttributes.tag || this.defaultTag,  mergeAttributes({}, HTMLAttributes.attributes), 0];
    }
};


/**
 * InlineStyle is an extension for defining inline styles as marks in an editor.
 * It allows toggling and checking the activation state of specific inline styles.
 * The extension creates customizable inline styles applied via specified HTML elements
 * or attributes.
 *
 * Properties:
 * - `name`: Specifies the name of the mark, "inlinestyle".
 * - `defaultTag`: Defines the default HTML element tag ("span") used when no specific tag is provided.
 * - `styles`: A set of predefined inline styles with names and corresponding HTML elements or attributes
 *   (e.g., "Small" mapped to `<small>`).
 *
 * Methods:
 * - `addOptions`: Provides configuration options for the extension, including the predefined styles and their mappings.
 * - `addCommands`: Adds custom commands for managing inline styles:
 *    - `toggleInlineStyle(id)`: Toggles the inline style based on the provided ID. Applies the corresponding tag
 *      and attributes if the style exists.
 *    - `activeInlineStyle(id)`: Checks if the specified inline style is currently active in the editor
 *      by evaluating the tag and attributes against the style definition.
 */
const InlineStyle = Mark.create({
    name: 'inlinestyle',
    defaultTag: 'span',
    ...Style,

    addOptions() {
        return {
            styles: [
                { name: 'Small', element: 'small' },
                { name: 'Kbd', element: 'kbd' },
                { name: 'Var', element: 'var' },
                { name: 'Samp', element: 'samp' },
            ]
        };
    },

    addCommands() {
        return {
            toggleInlineStyle: (id) => ({commands}) => {
                const style = this.options.styles[id];
                if (!style) {
                    return false;
                }
                if (commands.activeInlineStyle(id)) {
                    commands.extendMarkRange(this.name, {tag: style.element});
                    return commands.unsetMark(this.name);
                }
                return commands.setMark(this.name, {
                    tag: style.element || this.defaultTag,
                    attributes: style.attributes,
                });
            },
            activeInlineStyle: (id) => ({editor}) => {
                const style = this.options.styles[id];
                if (!style || !editor.isActive(this.name)) {
                    return false;
                }

                const activeAttr = editor.getAttributes(this.name);
                if ((activeAttr.tag || style.element) && activeAttr.tag !== style.element) {
                    return false;
                }
                if (activeAttr.attributes === style.attributes || !style.attributes) {
                    return true;
                }
                return JSON.stringify(activeAttr.attributes) === JSON.stringify(style.attributes);
            }
        };
    }
});

/**
 * BlockStyle is a custom node extension used in a content editor framework.
 * It defines a block-level node that can contain other block-level nodes and
 * provides functionality for applying and managing custom styles on block elements.
 *
 * Properties:
 * - `name`: The name identifier for this node extension, used in editor schema.
 * - `group`: Specifies the category or group for the node, classified under "block".
 * - `content`: Defines the content model, allowing inclusion of one or more block nodes.
 * - `defaultTag`: Sets the default HTML tag for this node, which is "div".
 * - `options.styles`: Expects an object containing custom style definitions, where each
 *   style includes information like the HTML tag (`element`) and any associated attributes.
 *
 * Methods:
 * - `addCommands`: Provides custom commands for interacting with the node. Includes:
 *     - `toggleBlockStyle(id)`: Toggles the styling of the block based on the provided style ID.
 *        Requires the presence of a matching style in `options.styles`. Utilizes `toggleWrap`
 *        to update the editor state with the specified tag and attributes.
 *     - `activeBlockStyle(id)`: Checks if the current block is active with a specific style,
 *        based on the tag and attributes defined in the style ID.
 *
 * This extension is designed to work in conjunction with style configurations and allows
 * for easy application of predefined block styles in a WYSIWYG editor.
 */
const BlockStyle = Node.create({
    name: 'blockstyle',
    group: 'block',
    content: 'block+',
    defaultTag: 'div',
    ...Style,

    addCommands() {
        return {
            toggleBlockStyle: (id) => ({commands}) => {
                const style = this.options.styles[id];
                return style && commands.toggleWrap(this.name, {
                        tag: style.element,
                        attributes: style.attributes,
                    });
            },
            activeBlockStyle: (id) => ({editor}) => {
                const style = this.options.styles[id];
                return style && editor.isActive(this.name, {
                    tag: style.element,
                    attributes: style.attributes,
                });
            }
        };
    }
});


TiptapToolbar.InlineStyles.items = (editor, builder) => renderStyleMenu(editor.options.inlineStyles, editor, 'span');
TiptapToolbar.BlockStyles.items = (editor, builder) => renderStyleMenu(editor.options.blockStyles || [], editor, 'div');
TiptapToolbar.TextColor.items = renderColorMenu;

export {TextColor, Highlight, InlineQuote, InlineStyle, BlockStyle, TextColor as default};
