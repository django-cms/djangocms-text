/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window, document, console */

// Demo dynamic Tiptap extension: strip Microsoft Office markup on paste.
//
// This file is a plain IIFE. It has no Tiptap imports — it uses the
// primitives handed to its factory by the host's registry contract.
// See tiptap-extensions.md for the full contract.
//
// Scope note: ProseMirror's schema-based parser already drops anything
// unknown — namespaced tags (<o:p>, <w:*>), wrapper blocks (<xml>,
// <style>, <meta>, <link>), HTML comments (including <!--[if mso]>…-->
// and StartFragment/EndFragment markers), and any unregistered
// attribute. What *survives* is Office payload embedded in attributes
// the schema does register: `mso-*` declarations inside `style` and
// `Mso*` names inside `class`. Those are what this extension removes.

(function () {
    'use strict';

    if (!window.CMS_Editor || !window.CMS_Editor.tiptap) {
        console.warn('[cms.officepaste] window.CMS_Editor.tiptap registry not found, skipping');
        return;
    }

    const api = window.CMS_Editor.tiptap;

    function cleanClassAttr(el) {
        const kept = el.className.split(/\s+/).filter((c) => c && !/^Mso/i.test(c));
        if (kept.length) {
            el.className = kept.join(' ');
        } else {
            el.removeAttribute('class');
        }
    }

    function cleanStyleAttr(el) {
        const kept = el.getAttribute('style').split(';')
            .map((s) => s.trim())
            .filter((s) => s && !/^mso-/i.test(s));
        if (kept.length) {
            el.setAttribute('style', kept.join('; '));
        } else {
            el.removeAttribute('style');
        }
    }

    function stripOfficeHtml(html) {
        if (typeof html !== 'string' || !html) {
            return html;
        }
        // <template> is inert: no script execution, no resource loading.
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        const root = tpl.content;

        root.querySelectorAll('[class]').forEach(cleanClassAttr);
        root.querySelectorAll('[style]').forEach(cleanStyleAttr);

        return tpl.innerHTML;
    }

    api.register('office-paste', ({Extension, pm: {Plugin, PluginKey}}) => Extension.create({
        name: 'officePaste',

        addStorage() {
            return {strip: stripOfficeHtml};
        },

        addProseMirrorPlugins() {
            const strip = this.storage.strip;
            return [
                new Plugin({
                    key: new PluginKey('officePaste'),
                    props: {
                        transformPastedHTML(html) {
                            return strip(html);
                        },
                    },
                }),
            ];
        },
    }), {apiVersion: 1});
})();
