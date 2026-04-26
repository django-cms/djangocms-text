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
// The same extension also installs two ProseMirror plugins:
//
//   - dblclick handler that selects the image and opens the filer
//     popup so the user can swap the underlying file in place.
//   - selection watcher that auto-opens the class form whenever an
//     image becomes the active NodeSelection — replaces the floating
//     balloon the contrib used to ship while still using the same
//     `cms.formextension` dialog the link extension uses.

import { openFilerPopup } from './popup';


function imageDblClickPlugin({ Plugin, PluginKey }, editor) {
    return new Plugin({
        key: new PluginKey('filerImageDblClick'),
        props: {
            handleDOMEvents: {
                dblclick(view, event) {
                    const target = event.target;
                    if (!target || target.tagName !== 'IMG') {
                        return false;
                    }
                    const pos = view.posAtDOM(target, 0);
                    if (pos == null || pos < 0) {
                        return false;
                    }
                    // Select the image node so the popup-dismiss handler
                    // updates it in place rather than inserting a new one.
                    const $pos = view.state.doc.resolve(pos);
                    const node = $pos.nodeAfter;
                    if (!node || node.type.name !== 'image') {
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


function imageAutoFormPlugin({ Plugin, PluginKey }, editor) {
    // Open the class form on the *transition* into an image
    // NodeSelection rather than on every transaction while one is
    // active — otherwise simply pressing a key while the image is
    // selected would re-spawn the dialog.
    return new Plugin({
        key: new PluginKey('filerImageAutoForm'),
        view() {
            let wasImageSelected = false;
            let pending = null;
            return {
                update() {
                    const isSelected = editor.isActive('image');
                    if (isSelected && !wasImageSelected) {
                        const lang = window.cms_editor_plugin
                            && window.cms_editor_plugin.lang;
                        const hasForm = !!(lang && lang.FilerImage
                            && Array.isArray(lang.FilerImage.form));
                        const root = editor.options.element;
                        const alreadyOpen = root
                            && root.querySelector('dialog.FilerImage-form');
                        if (hasForm && !alreadyOpen) {
                            // Defer one tick so ProseMirror's selection
                            // change is fully committed before
                            // `coordsAtPos` runs to position the dialog.
                            pending = setTimeout(() => {
                                pending = null;
                                // Editor may have been torn down between
                                // schedule and fire (esp. in tests); the
                                // view-getter throws in that case.
                                if (editor.isDestroyed) {
                                    return;
                                }
                                if (editor.isActive('image')) {
                                    editor.commands.openCmsForm('FilerImage');
                                }
                            }, 0);
                        }
                    }
                    wasImageSelected = isSelected;
                },
                destroy() {
                    if (pending != null) {
                        clearTimeout(pending);
                        pending = null;
                    }
                },
            };
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
            return [
                imageDblClickPlugin(pm, this.editor),
                imageAutoFormPlugin(pm, this.editor),
            ];
        },
    });
}
