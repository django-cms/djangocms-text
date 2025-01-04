/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */


import {Mark, mergeAttributes,} from '@tiptap/core';


const _markElement = {
    addOptions() {
        'use strict';

        return {
            HTMLAttributes: {},
        };
    },
    parseHTML() {
        'use strict';

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

const InlineQuote = Mark.create({
    name: 'Q',
    ..._markElement,
});

const Highlight = Mark.create({
    name: 'Highlight',
    parseHTML() {
        'use strict';
        return [{tag: 'mark'}];
    },
    renderHTML({ HTMLAttributes }) {
        return ['mark', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
    },
});

const TextColor = Mark.create({
    name: 'textcolor',
    addOptions() {
        'use strict';
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
        'use strict';

        if (this.editor.options.textColors) {
            // Let editor options overwrite the default colors
            this.options.textColors = this.editor.options.textColors;
        }
    },

    addAttributes() {
        'use strict';

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
        'use strict';

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
        'use strict';
        return ['span',  mergeAttributes({}, attributes.HTMLAttributes), 0];
    },

    addCommands() {
        'use strict';
        return {
            setTextColor: (cls) => ({commands}) => {
                if (!(cls in this.options.textColors)) {
                    return false;
                }
                return commands.setMark(this.name, {"class": cls} );
            },
            toggleTextColor: (cls) => ({commands}) => {
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

export {TextColor, Small, Var, Kbd, Samp, Highlight, InlineQuote, TextColor as default};
