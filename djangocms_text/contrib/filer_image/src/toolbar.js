/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window */

import { openFilerPopup } from './popup';


// Toolbar item definition for the filer-image contrib. Registered via
// `window.CMS_Editor.tiptap.registerToolbarItem('FilerImage', ...)`.
//
// The button is dual-purpose, mirroring the link button:
//
//   * No image selected: clicking opens filer's directory listing in a
//     popup window so the user can pick a file to insert.
//   * An image is selected: clicking opens a `cms.formextension`
//     dialog (the same UI the dynamic-link extension uses) populated
//     with the form schema published from the server side via
//     `register_toolbar_labels()` — currently a single `class` select
//     listing the entries from `TEXT_FILER_IMAGE_CLASSES`. The form is
//     skipped entirely if no class options are configured server-side
//     (no `form` key on the lang entry), so the button effectively
//     becomes a no-op while an image is selected — that is fine: the
//     dblclick path on the image still lets the user swap files.
//
// `enabled` only requires the `image` schema node, so the button stays
// usable independently of the filer-image data-cms-src extension — the
// underlying tiptap image extension is what actually decides whether
// images can be inserted at the current selection.
//
// `title` here is the English fallback. The translated label comes from
// the server-side `register_toolbar_labels()` call in __init__.py and
// overrides this when present (see _getRepresentation()).


function hasFormSchema() {
    // The form schema is published via `lang.FilerImage.form` from
    // `register_toolbar_labels()`. If the server didn't register one
    // (e.g. `TEXT_FILER_IMAGE_CLASSES` is empty), don't try to open
    // an empty dialog.
    const lang = window.cms_editor_plugin && window.cms_editor_plugin.lang;
    return !!(lang && lang.FilerImage && Array.isArray(lang.FilerImage.form));
}


export const FilerImageToolbarItem = {
    type: 'mark',
    title: 'Filer image',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" ' +
          'fill="currentColor" viewBox="0 0 16 16">' +
          '<path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>' +
          '<path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 ' +
          '2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 ' +
          '0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 ' +
          '12V3a1 1 0 0 1 1-1z"/></svg>',
    action: (editor) => {
        if (editor.isActive('image')) {
            if (hasFormSchema()) {
                // Defer to next tick to match the link toolbar item:
                // gives any pending blur/focus a chance to settle so
                // the dialog positions itself relative to a stable
                // selection rect.
                setTimeout(() => editor.commands.openCmsForm('FilerImage'), 0);
            }
            return;
        }
        openFilerPopup(editor);
    },
    enabled: (editor) => !!editor.schema.nodes.image,
    active: (editor) => editor.isActive('image'),
    attributes: (editor) => {
        // Used by `openCmsForm` -> `populateForm` to prefill the
        // dialog. The form's only field today is `class`; we still
        // return the rest of the attributes in case integrators
        // extend the schema.
        const attrs = editor.getAttributes('image');
        return { ...attrs, class: attrs.class || '' };
    },
    formAction: (editor, data) => {
        if (!data) {
            return;
        }
        // Normalise blank/whitespace to `null` so the renderHTML for
        // the `class` global attribute drops the attribute entirely
        // rather than emitting `class=""`.
        const raw = (data.get('class') || '').trim();
        editor.chain().focus().updateAttributes('image', {
            class: raw || null,
        }).run();
    },
};
