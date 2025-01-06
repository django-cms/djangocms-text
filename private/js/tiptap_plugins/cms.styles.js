/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */

'use strict';

import {Mark, Node, mergeAttributes, getAttributes,} from '@tiptap/core';
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

const Small = Mark.create({
    name: 'Small',
    ..._markElement,
});

const Kbd = Mark.create({
    name: 'Kbd',
    ..._markElement,
});

const Var = Mark.create({
    name: 'Var',
    ..._markElement,
});

const Samp = Mark.create({
    name: 'Samp',
    ..._markElement,
});

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
            class: {
                default: null,
            },
            style: {
                default: null,
            }
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

function renderStyleMenu(styles, editor) {
    let menu = '';
    for (let i = 0; i < styles.length; i++) {
        const action = blockTags.includes(styles[i].element.toUpperCase()) ? 'BlockStyles' : 'InlineStyles';
        menu += `<button data-action="${action}" data-id="${i}">${styles[i].name}</button>`;
    }
    return menu;
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
        if (this.name === 'blockstyle') {
            if (this.editor.options.stylesSet || this.editor.options.blockStyles) {
                // Let editor options overwrite the default styles, stylesSet has preference
                this.options.styles = this.editor.options.stylesSet || this.editor.options.blockStyles;
            }

        } else if (this.editor.options.stylesSet || this.editor.options.inlineStyles) {
            // Let editor options overwrite the default styles, inlineStyles has preference
            this.options.styles = this.editor.options.inlineStyles || this.editor.options.stylesSet;
            console.log("Inline", this.options.styles);

        }

        return this.options.styles.map(style => {
            return {
                tag: style.element || '*',
                getAttrs: node => {
                    for (const [key, value] of Object.entries(style.attributes)) {
                        if (key === 'class') {
                            if (!(style.attributes?.class || '').split(' ').every(cls => node.classList.contains(cls))) {
                                return false;
                            }
                        } else if (node.getAttribute(key) !== value) {
                            return false;
                        }
                    }
                    if (style.element) {
                        return {tag: style.element, attributes: style.attributes};
                    }
                    return {attributes: style.attributes}
                }
            };
        });
    },

   renderHTML({HTMLAttributes}) {
        return [HTMLAttributes.tag || this.defaultTag,  mergeAttributes({}, HTMLAttributes.attributes), 0];
    }
};


const InlineStyle = Mark.create({
    name: 'inlinestyle',
    defaultTag: 'span',
    ...Style,

    renderHTML: ({HTMLAttributes}) => {
        return [HTMLAttributes.tag || 'span',  mergeAttributes({}, HTMLAttributes.attributes), 0];
    },

    addCommands() {
        return {
            setInlineStyle: (id) => ({commands}) => {
                const style = this.options.styles[id];
                if (!style) {
                    return false;
                }
                return commands.setMark(this.name, {
                    tag: style.element || this.defaultTag,
                    attributes: style.attributes,
                });
            },
            unsetInlineStyle: () => ({commands}) => {
                return commands.unsetMark(this.name);
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
                if (!style) {
                    console.warn("Block style not found");
                    return false;
                }
                console.log(style);
                return commands.toggleWrap(this.name, {
                        tag: style.element || 'div',
                        attributes: style.attributes,
                    });
            },
            blockStyleActive: (id) => ({editor}) => {
                const style = this.options.styles[id];
                if (!style) {
                    return false;
                }
                return editor.isActive(this.name, {
                    tag: style.element,
                    attributes: style.attributes,
                });
            }
        };
    }
});

TiptapToolbar.Styles.items = (editor, builder) => renderStyleMenu(editor.options.stylesSet || [], editor);
TiptapToolbar.InlineStyles.items = (editor, builder) => renderStyleMenu(editor.options.inlineStyles || editor.options.stylesSet || [], editor);
TiptapToolbar.BlockStyles.items = (editor, builder) => renderStyleMenu(editor.options.blockStyles || editor.options.stylesSet || [], editor);

export {TextColor, Small, Var, Kbd, Samp, Highlight, InlineQuote, InlineStyle, BlockStyle, TextColor as default};
