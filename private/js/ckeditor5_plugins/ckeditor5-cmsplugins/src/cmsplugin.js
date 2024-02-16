/**
 * @module userstyle/userstyle
 */

import { Plugin } from 'ckeditor5/src/core';

import CMSPluginUI from "./cmspluginui";
import CMSPluginEditing from "./cmspluginediting";


/**
 * The userstyle plugin.
 *
 * For a detailed overview, check the {@glink features/userstyle UserStyle feature} documentation.
 *
 * This is a "glue" plugin which loads the {@link module:userstyle/userstyleediting~UserStyleEditing} and
 * {@link module:userstyle/userstyleui~UserStyleUI} plugins.
 *
 * @extends module:core/plugin~Plugin
 */

export default class CMSPlugin extends Plugin {
    static get requires() {
        return [ CMSPluginEditing, CMSPluginUI ];
    }

    init() {
        console.log("CmsPlugin.init");
    }
}
