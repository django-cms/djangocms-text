/* eslint-env es6 */
/* jshint esversion: 6 */
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
    }
});


export default CmsDynLink;
