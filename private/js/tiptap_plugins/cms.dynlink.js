/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */
'use strict';

import { InputRule } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import {Plugin} from '@tiptap/pm/state';


function DynLinkClickHandler(editor) {
    return new Plugin({
        props: {
            handleDOMEvents: {
                click (view, event) {
                    const target = event.target.closest('a[href]');
                    if (target) {
                        event.preventDefault();
                        return true;
                    }
                    return false;
                },
                dblclick(view, event) {
                    const target = event.target.closest('a[href]');
                    if (target) {
                        event.preventDefault();
                        setTimeout(() => {
                            if (editor.isActive('link')) {
                                editor.commands.extendMarkRange('link');
                                editor.commands.openCmsForm('Link');
                            }
                        }, 0);
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
            new InputRule({
                find: markdownLinkInputRegex,
                handler: ({ state, range, match }) => {
                    const insert = match[1];
                    const href = match[2];
                    const start = range.from;
                    const end = range.to;
                    const {tr} = state;

                    if (insert && href) {
                        tr.insertText(insert, start, end);
                        tr.addMark(
                            start,
                            start + insert.length,
                            this.type.create({ href })
                        );
                        // Remove the mark, so that additional typing is outside the mark
                        tr.removeStoredMark(this.type)
                      }
                }
             }),
        ];
    },
}).configure({
    openOnClick: false,
    HTMLAttributes: {
        rel: 'noopener noreferrer',
    },
});


export default CmsDynLink;
