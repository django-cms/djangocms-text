/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */
'use strict';

import Link from '@tiptap/extension-link';
import {Plugin} from '@tiptap/pm/state';


function DynLinkClickHandler(editor) {
    return new Plugin({
        props: {
            handleDOMEvents: {
                click(view, event) {
                    console.log(view);
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


const CmsDynLink = Link.extend({
    addAttributes() {
        'use strict';
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
}).configure({
    openOnClick: false,
    HTMLAttributes: {
        rel: 'noopener noreferrer',
    },
});


export default CmsDynLink;
