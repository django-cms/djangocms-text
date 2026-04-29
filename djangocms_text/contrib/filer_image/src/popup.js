/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window, document */

// Popup window plumbing for the filer-image contrib.
//
// django-filer's directory listing in popup mode dispatches the chosen
// file by calling `window.opener.dismissRelatedImageLookupPopup(win, ...)`.
// We open the popup with a window name of the shape
// `cms_filer_image_<editorId>__<rnd>` so we can later route the chosen
// file into the editor that triggered the popup. Filer also sets a
// global handler for `dismissRelatedImageLookupPopup` on DOMContentLoaded
// — we wrap it so foreign popups (real filer form widgets) keep working.

const POPUP_PREFIX = 'cms_filer_image_';


// Encode an editor id into a window.name that filer's `windowname_to_id`
// will decode (replacing dots/dashes with `__dot__`/`__dash__` and
// stripping the trailing `__<random>` segment).
function encodeWindowName(editorId) {
    const encoded = String(editorId)
        .replace(/\./g, '__dot__')
        .replace(/-/g, '__dash__');
    return `${POPUP_PREFIX}${encoded}__${Math.floor(Math.random() * 1e9)}`;
}


function decodeEditorId(windowName) {
    if (!windowName || !windowName.startsWith(POPUP_PREFIX)) {
        return null;
    }
    let id = windowName.slice(POPUP_PREFIX.length);
    const last = id.lastIndexOf('__');
    if (last !== -1) {
        id = id.slice(0, last);
    }
    return id.replace(/__dot__/g, '.').replace(/__dash__/g, '-');
}


function getLookupUrl(editor) {
    return (
        editor.options.settings?.filer_image_lookup_url ||
        editor.options.settings?.options?.filer_image_lookup_url ||
        window.cms_editor_plugin?.filer_image_lookup_url ||
        ''
    );
}


function getInfoUrl() {
    // Set by apps.py via additional_context. Without it we have no way
    // to upgrade the picker's thumbnail URL to the original.
    const settings = window.CMS_Editor && window.CMS_Editor._global_settings;
    return (settings && settings.filer_image_info_url) || '';
}


// First configured image class, or `null` if none is published. The
// class form's options live on `lang.FilerImage.form[0].options` —
// see __init__.py. We use the first entry as the default for newly
// inserted images so authors don't have to set it manually every
// time.
function getDefaultImageClass() {
    const lang = window.cms_editor_plugin && window.cms_editor_plugin.lang;
    const entry = lang && lang.FilerImage;
    if (!entry || !Array.isArray(entry.form)) {
        return null;
    }
    const classField = entry.form.find((field) => field && field.name === 'class');
    if (!classField || !Array.isArray(classField.options) || classField.options.length === 0) {
        return null;
    }
    return classField.options[0].value || null;
}


// Filer's picker hands us the *thumbnail* URL of the chosen file (it's
// computed from `{% file_icon_url %}` in filer's directory listing
// template). Fetch the original URL from the JSON endpoint that
// apps.py registers on filer's FileAdmin. Falls back to the thumbnail
// if the endpoint isn't reachable.
function fetchFileInfo(chosenId, fallbackUrl) {
    const infoUrl = getInfoUrl();
    if (!infoUrl || chosenId == null) {
        return Promise.resolve({ id: chosenId, url: fallbackUrl });
    }
    return fetch(`${infoUrl}?id=${encodeURIComponent(chosenId)}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    })
        .then((resp) => (resp.ok ? resp.json() : null))
        .then((data) => ({
            id: chosenId,
            url: (data && data.url) || fallbackUrl,
        }))
        .catch(() => ({ id: chosenId, url: fallbackUrl }));
}


export function openFilerPopup(editor) {
    const url = getLookupUrl(editor);
    if (!url) {
        // No filer URL configured — fail soft with a console warning so
        // a misconfigured install is debuggable but does not throw.
        // eslint-disable-next-line no-console
        console.warn('[cms.filer_image] no filer_image_lookup_url configured');
        return;
    }
    const editorId = editor.options.el ? editor.options.el.id : '';
    const name = encodeWindowName(editorId);
    const features = 'popup=1,height=600,width=900,resizable=yes,scrollbars=yes';
    const popup = window.open(url, name, features);
    if (popup) {
        popup.focus();
    }
}


// Async core: resolves the picker's thumbnail URL to the original via
// info-json and writes the chosen file into the editor. Exposed
// separately from `installPopupHandler` so tests can await it.
export async function applyChosenFile(
    editor,
    chosenId,
    chosenThumbnailUrl,
    chosenDescriptionTxt
) {
    const info = await fetchFileInfo(chosenId, chosenThumbnailUrl);
    // Dynamic src reference resolved server-side by
    // `render_dynamic_attributes`: lets the rendered URL follow the
    // underlying filer file when it's moved or renamed.
    // Pattern: `<model>:<pk>`.
    const dataCmsSrc = chosenId != null ? `filer.image:${chosenId}` : null;
    if (editor.isActive('image')) {
        // Reselect flow (double-click on existing image): swap the
        // file but keep alt, title, class, width, height, and any
        // other attributes the user already set. `updateAttributes`
        // only writes the keys we pass.
        editor.chain().focus().updateAttributes('image', {
            src: info.url,
            'data-cms-src': dataCmsSrc,
        }).run();
    } else {
        // Insert flow (toolbar button): create a fresh image node
        // populated with the picker metadata.
        const defaultClass = getDefaultImageClass();
        const attrs = {
            src: info.url,
            alt: chosenDescriptionTxt || '',
            title: chosenDescriptionTxt || '',
            'data-cms-src': dataCmsSrc,
        };
        if (defaultClass) {
            attrs.class = defaultClass;
        }
        editor.chain().focus().setImage(attrs).run();
    }
}


// Wrap filer's `dismissRelatedImageLookupPopup` so that popups opened by
// us route the chosen file into the editor instead of into a hidden form
// input. Foreign popups (filer's normal form widgets) keep using filer's
// original handler unchanged.
//
// Filer assigns its handler at DOMContentLoaded; calling this once at
// IIFE load *and* once on the next tick guarantees we're the outermost
// wrapper regardless of script order.
//
// The wrapper returns the promise from `applyChosenFile` so tests (and
// any callers that care) can await the editor mutation.
export function installPopupHandler() {
    const original = window.dismissRelatedImageLookupPopup;
    window.dismissRelatedImageLookupPopup = function (
        win,
        chosenId,
        chosenThumbnailUrl,
        chosenDescriptionTxt,
        chosenAdminChangeUrl
    ) {
        const editorId = decodeEditorId(win && win.name);
        if (editorId) {
            const editor = window.cms_editor_plugin?._editors?.[editorId];
            if (editor) {
                const done = applyChosenFile(
                    editor,
                    chosenId,
                    chosenThumbnailUrl,
                    chosenDescriptionTxt
                );
                if (win && !win.closed) {
                    win.close();
                }
                return done;
            }
        }
        if (typeof original === 'function') {
            return original(
                win,
                chosenId,
                chosenThumbnailUrl,
                chosenDescriptionTxt,
                chosenAdminChangeUrl
            );
        }
    };
}


export function bootPopupHandler() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', installPopupHandler);
    } else {
        installPopupHandler();
    }
    // Filer also installs its handler at DOMContentLoaded — re-wrap on
    // the next tick to guarantee we are the outermost wrapper.
    setTimeout(installPopupHandler, 0);
}
