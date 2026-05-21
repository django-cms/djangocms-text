/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */
'use strict';

import { markInputRule } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import {Plugin} from '@tiptap/pm/state';


function DynLinkClickHandler(editor) {
    // Pin the cursor inside the link mark ourselves before extending
    // and opening the form. On the *first* click into an unfocused
    // editor, PM's own click handling may leave the selection
    // somewhere other than the link, so reading `editor.isActive('link')`
    // back later would be wrong.
    function openLinkForm(view, target) {
        const pos = view.posAtDOM(target, 0);
        if (pos == null || pos < 0) {
            return;
        }
        editor.chain().focus().setTextSelection(pos).extendMarkRange('link').run();
        if (editor.isActive('link')) {
            editor.commands.openCmsForm('Link');
        }
    }
    return new Plugin({
        props: {
            handleDOMEvents: {
                click (view, event) {
                    const target = event.target.closest('a[href]');
                    if (target) {
                        event.preventDefault();
                        setTimeout(() => openLinkForm(view, target), 0);
                        return true;
                    }
                    return false;
                },
                dblclick(view, event) {
                    const target = event.target.closest('a[href]');
                    if (target) {
                        event.preventDefault();
                        setTimeout(() => openLinkForm(view, target), 0);
                        return true;
                    }
                    return false;
                }
            }
        }
    });
}


const markdownLinkInputRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/;


const CmsDynLink = Link.extend({
    addAttributes() {
        return {
            'data-cms-href': {
                default: null
            },
            'href': {
                default: null
            },
            'target': {
                default: null
            },
        };
    },

    addProseMirrorPlugins() {
        return [DynLinkClickHandler(this.editor)];
    },

    onDestroy() {
        this.editor.parent?.();  // Call the parent implementation, if it exists
        this.editor.view.dom.removeEventListener('click', this);
    },
    addInputRules() {
        return [
             markInputRule({
                find: markdownLinkInputRegex,
                type: this.type,
                getAttributes: match => {
                    const url = match[2];
                    match.pop(); // Remove the text part
                    return { href: url };
                }
            }),
        ]
    },
}).configure({
    openOnClick: false,
    HTMLAttributes: {
        rel: 'noopener noreferrer',
    },
});


export default CmsDynLink;
