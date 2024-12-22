/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */


import {Mark, mergeAttributes,} from '@tiptap/core';

'use strict';


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
        'use strict';
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


const InlineColors = Mark.create({
    name: 'inlinestyle',
    addOptions() {
        return {
            styles: {
                primary: {"class": "text-primary"},
                secondary: {"class": "text-secondary"},
                success: {"class": "text-success"},
                danger: {"class": "text-danger"},
                warning: {"class": "text-warning"},
                info: {"class": "text-info"},
                light: {"class": "text-light"},
                dark: {"class": "text-dark"},
                body: {"class": "text-body"},
                muted: {"class": "text-muted"},
            },
        };
    },
    addAttributes() {
        return {
            class: {
                default: null,
            },
        };
    },

    parseHTML: element => [
        {
            tag: 'style',
            getAttrs: node => node.classList.filter((item) => item in this.options.styles)
        },
    ],
    renderHTML: attributes => {
        return ['span',  mergeAttributes({}, attributes.HTMLAttributes), 0]
    },

    addCommands() {
        return {
            setStyle: (style) => ({commands}) => {
                if (!this.options.styles.hasOwnProperty(style)) {
                    return false;
                }
                return commands.setMark(this.name, this.options.styles[style] );
            },
            toggleStyle: (style) => ({commands}) => {
                if (!this.options.styles.hasOwnProperty(style)) {
                    return false;
                }
                return commands.toggleMark(this.name, this.options.styles[style] );
            },
            unsetStyle: (style) => ({commands}) => {
                if (!this.options.styles.hasOwnProperty(style)) {
                    return false;
                }
                return commands.unsetMark(this.name, this.options.styles[style] );
            },
        };
    }
});

export {InlineColors, Small, Var, Kbd, Samp, InlineColors as default};
