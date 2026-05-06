/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window, console */

// Demo dynamic Tiptap extension: insert django-filer images.
//
// This is the entry point that webpack bundles into the IIFE delivered
// from `static/`. The bundled output has **no** `@tiptap/*` imports —
// we use only the primitives handed to us by the host's registry
// contract on `window.CMS_Editor.tiptap`.
//
// See ../README.rst and ../../../tiptap-extensions.md for the full
// integration story.

import { createFilerImageExtensionFactory } from './extension';
import { bootPopupHandler } from './popup';
import { FilerImageToolbarItem } from './toolbar';


function boot() {
    if (!window.CMS_Editor || !window.CMS_Editor.tiptap) {
        console.warn('[cms.filer_image] window.CMS_Editor.tiptap registry not found, skipping');
        return;
    }
    const api = window.CMS_Editor.tiptap;

    api.register(
        'filer-image-data-cms-src',
        createFilerImageExtensionFactory(),
        { apiVersion: 1 }
    );

    api.registerToolbarItem('FilerImage', FilerImageToolbarItem);

    bootPopupHandler();
}


boot();
