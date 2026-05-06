/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window */

// Tiptap extension factory for the filer-image contrib.
//
// We do not redefine the `image` node — the main bundle already ships
// `@tiptap/extension-image`. Instead we register a small `Extension`
// that adds the attributes we need to the existing image node via
// `addGlobalAttributes`:
//
//   - `data-cms-src` — round-trip dynamic-src reference
//     (`filer.image:<pk>`) resolved server-side at render time.
//   - `class` — utility classes picked through the class form (see
//     ./toolbar.js). The upstream image schema does not declare it,
//     so without this round-trip the class would be dropped.
//
// The same extension also installs a single ProseMirror plugin that
// owns the image's mouse interactions:
//
//   - single click on an image opens the class form (deferred briefly
//     so a second click can promote the gesture into a dblclick);
//   - dblclick selects the image and opens the filer popup so the user
//     can swap the underlying file in place — and cancels any pending
//     click-form so the form does not flash open before the picker.
//
// We deliberately do NOT auto-open the form on selection change:
// users want a stable "image is selected" state without the dialog
// re-spawning every time, and the click trigger gives them an
// intentional, predictable way to invoke it.

import { openFilerPopup } from './popup';


// Browser dblclick threshold. We defer the click-form by this much so
// a follow-up click can cancel it and the dblclick handler wins.
const DBLCLICK_GUARD_MS = 250;


function imageMousePlugin({ Plugin, PluginKey }, editor) {
    let pendingFormOpen = null;

    const cancelPendingForm = () => {
        if (pendingFormOpen != null) {
            clearTimeout(pendingFormOpen);
            pendingFormOpen = null;
        }
    };

    const hasFormSchema = () => {
        const lang = window.cms_editor_plugin && window.cms_editor_plugin.lang;
        return !!(lang && lang.FilerImage && Array.isArray(lang.FilerImage.form));
    };

    const resolveImagePos = (view, target) => {
        const pos = view.posAtDOM(target, 0);
        if (pos == null || pos < 0) {
            return null;
        }
        const $pos = view.state.doc.resolve(pos);
        const node = $pos.nodeAfter;
        if (!node || node.type.name !== 'image') {
            return null;
        }
        return pos;
    };

    return new Plugin({
        key: new PluginKey('filerImageMouse'),
        view() {
            return {
                destroy() {
                    cancelPendingForm();
                },
            };
        },
        props: {
            handleDOMEvents: {
                click(view, event) {
                    const target = event.target;
                    if (!target || target.tagName !== 'IMG') {
                        return false;
                    }
                    if (!hasFormSchema()) {
                        return false;
                    }
                    const pos = resolveImagePos(view, target);
                    if (pos == null) {
                        return false;
                    }
                    cancelPendingForm();
                    pendingFormOpen = setTimeout(() => {
                        pendingFormOpen = null;
                        if (editor.isDestroyed) {
                            return;
                        }
                        if (!hasFormSchema()) {
                            return;
                        }
                        // Pin the NodeSelection ourselves before
                        // opening the form: on the *first* click into
                        // the editor (no prior selection), PM's own
                        // click handling may leave the selection
                        // somewhere other than the image, so reading
                        // it back here would be wrong.
                        editor.chain().focus().setNodeSelection(pos).run();
                        editor.commands.openCmsForm('FilerImage');
                    }, DBLCLICK_GUARD_MS);
                    return false;
                },
                dblclick(view, event) {
                    cancelPendingForm();
                    const target = event.target;
                    if (!target || target.tagName !== 'IMG') {
                        return false;
                    }
                    const pos = resolveImagePos(view, target);
                    if (pos == null) {
                        return false;
                    }
                    event.preventDefault();
                    editor.chain().focus().setNodeSelection(pos).run();
                    openFilerPopup(editor);
                    return true;
                },
            },
        },
    });
}


export function createFilerImageExtensionFactory() {
    return ({ Extension, pm }) => Extension.create({
        name: 'filerImageDataCmsSrc',

        addGlobalAttributes() {
            return [
                {
                    types: ['image'],
                    attributes: {
                        'data-cms-src': {
                            default: null,
                            parseHTML: (el) => el.getAttribute('data-cms-src'),
                            renderHTML: (attrs) => attrs['data-cms-src']
                                ? { 'data-cms-src': attrs['data-cms-src'] }
                                : {},
                        },
                        // Persist the `class` attribute through HTML
                        // round-trip — the upstream image schema does not
                        // declare it, so without this `<img class="...">`
                        // would parse but be dropped on render.
                        class: {
                            default: null,
                            parseHTML: (el) => el.getAttribute('class') || null,
                            renderHTML: (attrs) => attrs.class
                                ? { class: attrs.class }
                                : {},
                        },
                    },
                },
            ];
        },

        addProseMirrorPlugins() {
            return [imageMousePlugin(pm, this.editor)];
        },
    });
}
