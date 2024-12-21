/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */

import Link from '@tiptap/extension-link';


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

    onCreate({editor})  {
        editor.parent?.();  // Call the parent implementation, if it exists
        this.handleEvent = ((event) => {
            'use strict';
            const target = event.target.closest('a[href]');
            if (target) {
                event.preventDefault();
                setTimeout(() => {
                    if (this.editor.isActive('link')) {
                        this.editor.commands.openCmsForm('Link');
                    }
                }, 0);
            }
        }).bind(this);  // hacky: move the eventHandler to the Mark object (this) to be able to remove it later
        console.log("Event", editor.view.dom);
        editor.view.dom.addEventListener('click', this);
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
