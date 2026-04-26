/* eslint-env es11, jest */
/* jshint esversion: 11 */
/* global window, document, require */

// Demo contrib extension: insert django-filer images.
//
// Like the youtube and officepaste tests, this test loads the IIFE
// (the *built* output, not the src/) so it exercises the same artefact
// that ships in production. The IIFE registers an Extension that adds
// `data-cms-src` to the existing image node and a `FilerImage` toolbar
// item, then wraps `window.dismissRelatedImageLookupPopup`.
//
// Order matters: the cms.tiptap import below sets up the registry on
// window, and only then can the IIFE find it.
import '../../private/js/cms.editor';
import '../../private/js/cms.tiptap';
import TiptapToolbar from '../../private/js/tiptap_plugins/cms.tiptap.toolbar';

const FILER_BUNDLE_PATH =
    '../../djangocms_text/contrib/filer_image/static/djangocms_text/tiptap_plugins/cms.filer_image.js';

describe('Filer image dynamic extension (contrib/filer_image)', () => {
    let plugin;
    let originalDismiss;
    let originalOpen;
    let openedPopup;
    let originalFetch;
    let fetchMock;

    beforeAll(() => {
        // Loading the IIFE registers the extension factory, the toolbar
        // item, and wraps `dismissRelatedImageLookupPopup`.
        require(FILER_BUNDLE_PATH);
    });

    beforeEach(() => {
        document.body.innerHTML = `
            <script id="cms-editor-cfg" type="application/json">{"some": "config"}</script>
        `;
        window.dispatchEvent(new Event('DOMContentLoaded'));
        plugin = window.cms_editor_plugin;
        plugin.lang = null;

        // Stub out window.open so we can assert the popup was triggered
        // without a real one being spawned.
        originalOpen = window.open;
        openedPopup = { focus: jest.fn(), close: jest.fn(), closed: false };
        window.open = jest.fn().mockReturnValue(openedPopup);

        // Default fetch stub: resolves to {url: '<full-url>'} so the
        // dismiss handler upgrades the picker thumbnail to the
        // original. Tests that need a different response override it.
        originalFetch = window.fetch;
        fetchMock = jest.fn((url) => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                id: 42,
                url: '/media/full/cat.jpg',
                label: 'cat',
            }),
        }));
        window.fetch = fetchMock;
        // Have to publish the info-url base so popup.js's getInfoUrl()
        // returns something — without it the handler skips the fetch
        // and falls back to the picker thumbnail.
        window.CMS_Editor._global_settings = window.CMS_Editor._global_settings || {};
        window.CMS_Editor._global_settings.filer_image_info_url =
            '/admin/filer/file/info-json/';

        // Capture filer's "original" handler so we can verify the wrapper
        // delegates for foreign popups.
        originalDismiss = jest.fn();
        // Re-install our wrapper on top of a known mock so we can probe
        // the delegation behaviour. Re-requiring is safe because the IIFE
        // re-wraps whatever `dismissRelatedImageLookupPopup` is currently
        // set to.
        window.dismissRelatedImageLookupPopup = originalDismiss;
        jest.isolateModules(() => {
            require(FILER_BUNDLE_PATH);
        });
    });

    afterEach(() => {
        window.open = originalOpen;
        if (originalFetch) {
            window.fetch = originalFetch;
        } else {
            delete window.fetch;
        }
        // Trigger every open form dialog's `close` handler *before*
        // destroying its editor — the handler removes the document
        // click listener CmsForm installs (which would otherwise fire
        // on the next test's clicks and crash trying to call back into
        // the now-destroyed editor).
        document.querySelectorAll('dialog.FilerImage-form').forEach(
            (d) => d.dispatchEvent(new Event('close'))
        );
        for (const id of Object.keys(plugin._editors)) {
            plugin.destroyEditor(document.getElementById(id));
        }
    });

    // Drains microtasks so awaited fetch promises in the dismiss
    // handler resolve before assertions run.
    function flushPromises() {
        // Two ticks: first to settle the fetch's resolved Promise,
        // second to settle the .then chain that mutates the editor.
        return Promise.resolve().then(() => Promise.resolve());
    }

    function createEditor(id, content = '', options = {}) {
        const el = document.createElement('textarea');
        el.id = id;
        el.classList.add('CMS_Editor');
        document.body.appendChild(el);
        plugin.create(el, false, content, { options }, () => {});
        return plugin._editors[id];
    }

    it('registers the FilerImage toolbar item', () => {
        expect(TiptapToolbar.FilerImage).toBeDefined();
        expect(typeof TiptapToolbar.FilerImage.action).toBe('function');
        expect(TiptapToolbar.FilerImage.type).toBe('mark');
    });

    it('FilerImage is enabled when the image schema node is present', () => {
        const editor = createEditor('filer-enabled');
        expect(TiptapToolbar.FilerImage.enabled(editor)).toBe(true);
    });

    it('action opens a popup with the configured filer URL', () => {
        const editor = createEditor('filer-popup');
        editor.options.settings = editor.options.settings || {};
        editor.options.settings.filer_image_lookup_url =
            '/admin/filer/folder/last/?_popup=1&_pick=file';

        TiptapToolbar.FilerImage.action(editor);

        expect(window.open).toHaveBeenCalledTimes(1);
        const [url, name] = window.open.mock.calls[0];
        expect(url).toBe('/admin/filer/folder/last/?_popup=1&_pick=file');
        expect(name).toMatch(/^cms_filer_image_/);
    });

    it('inserts an image with the full URL fetched from info-json', async () => {
        const editor = createEditor('filer-insert');
        editor.options.settings = editor.options.settings || {};
        editor.options.settings.filer_image_lookup_url = '/admin/filer/?_popup=1&_pick=file';

        TiptapToolbar.FilerImage.action(editor);
        const popupName = window.open.mock.calls[0][1];

        const fakeWin = { name: popupName, closed: false, close: jest.fn() };
        await window.dismissRelatedImageLookupPopup(
            fakeWin,
            42,
            '/media/thumbs/cat__90x90.jpg', // picker hands us the thumb
            'A fluffy cat',
            '/admin/filer/file/42/'
        );

        expect(fakeWin.close).toHaveBeenCalled();
        expect(originalDismiss).not.toHaveBeenCalled();
        // fetch is async; let the dismiss handler's promise resolve.
        await flushPromises();

        const html = editor.getHTML();
        // The fetched URL — not the thumbnail — ends up in the editor.
        expect(html).toContain('src="/media/full/cat.jpg"');
        expect(html).not.toContain('thumbs/cat');
        expect(html).toContain('alt="A fluffy cat"');
        expect(html).toContain('data-cms-src="filer.image:42"');
        expect(fetchMock).toHaveBeenCalledWith(
            '/admin/filer/file/info-json/?id=42',
            expect.objectContaining({ credentials: 'same-origin' }),
        );
    });

    it('falls back to the thumbnail URL if info-json is unreachable', async () => {
        // Endpoint not configured: the handler must not block on a
        // missing endpoint and should keep using the thumbnail URL.
        delete window.CMS_Editor._global_settings.filer_image_info_url;

        const editor = createEditor('filer-insert-fallback');
        editor.options.settings = editor.options.settings || {};
        editor.options.settings.filer_image_lookup_url = '/admin/filer/?_popup=1&_pick=file';

        TiptapToolbar.FilerImage.action(editor);
        const popupName = window.open.mock.calls.at(-1)[1];
        const fakeWin = { name: popupName, closed: false, close: jest.fn() };
        await window.dismissRelatedImageLookupPopup(
            fakeWin, 42, '/media/thumbs/cat.jpg', 'cat', '/admin/filer/file/42/'
        );

        await flushPromises();

        const html = editor.getHTML();
        expect(html).toContain('src="/media/thumbs/cat.jpg"');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('forwards to filer\'s original handler for unknown popups', () => {
        const fakeWin = { name: 'something_else__123', close: jest.fn() };
        window.dismissRelatedImageLookupPopup(fakeWin, 1, 'x', 'y', 'z');
        expect(originalDismiss).toHaveBeenCalledWith(fakeWin, 1, 'x', 'y', 'z');
    });

    it('round-trips data-cms-src through parseHTML', () => {
        // Image is a block node by default in @tiptap/extension-image.
        const content = '<img src="/media/cat.jpg" alt="cat" ' +
            'data-cms-src="filer.image:42">';
        const editor = createEditor('filer-roundtrip', content);
        const html = editor.getHTML();
        expect(html).toContain('data-cms-src="filer.image:42"');
        expect(html).toContain('src="/media/cat.jpg"');
    });

    it('updates an existing image in place when dblclicked', async () => {
        // Pre-populated image with author-set alt/title/class. After
        // the popup returns, only src and data-cms-src should change —
        // the other schema-level attributes must survive. Dblclick
        // (not the toolbar action) is the swap trigger now: the
        // toolbar action with an image selected opens the class form
        // instead.
        const content = '<img src="/media/old.jpg" alt="custom alt" ' +
            'title="custom title" class="img-fluid rounded" ' +
            'data-cms-src="filer.image:1">';
        const editor = createEditor('filer-reselect', content);
        editor.options.settings = editor.options.settings || {};
        editor.options.settings.filer_image_lookup_url =
            '/admin/filer/?_popup=1&_pick=file';

        fetchMock.mockReturnValueOnce(Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                id: 99, url: '/media/full/new.jpg', label: 'new',
            }),
        }));

        // Drive the contrib's dblclick plugin: it selects the image
        // and opens the filer popup.
        const imgDom = editor.view.dom.querySelector('img');
        imgDom.dispatchEvent(new MouseEvent('dblclick', {
            bubbles: true, cancelable: true,
        }));
        expect(editor.isActive('image')).toBe(true);

        const popupName = window.open.mock.calls.at(-1)[1];
        const fakeWin = { name: popupName, closed: false, close: jest.fn() };
        await window.dismissRelatedImageLookupPopup(
            fakeWin,
            99,
            '/media/thumbs/new__90x90.jpg', // picker thumb
            'picker description',
            '/admin/filer/file/99/'
        );

        await flushPromises();

        const html = editor.getHTML();
        // src and data-cms-src updated to the fetched original...
        expect(html).toContain('src="/media/full/new.jpg"');
        expect(html).toContain('data-cms-src="filer.image:99"');
        // ...but the user's attributes survive.
        expect(html).toContain('alt="custom alt"');
        expect(html).toContain('title="custom title"');
        expect(html).toContain('class="img-fluid rounded"');
        // The picker description must NOT overwrite the existing alt.
        expect(html).not.toContain('alt="picker description"');
    });

    it('round-trips the class attribute through parseHTML', () => {
        const content = '<img src="/media/cat.jpg" alt="cat" ' +
            'class="img-fluid rounded">';
        const editor = createEditor('filer-class-roundtrip', content);
        const html = editor.getHTML();
        expect(html).toContain('class="img-fluid rounded"');
    });

    describe('class picker via openCmsForm', () => {
        // jsdom does not implement HTMLDialogElement.show / close —
        // CmsForm.open() calls show() right after mounting the dialog
        // DOM. Polyfill the bare minimum so we can exercise the path.
        beforeAll(() => {
            const proto = window.HTMLDialogElement.prototype;
            if (!proto.show) {
                proto.show = function () { this.open = true; };
            }
            if (!proto.close) {
                proto.close = function () { this.open = false; };
            }
        });

        // Server-side `register_toolbar_labels()` publishes the form
        // schema as `lang.FilerImage.form`. Mock the same shape here so
        // `_getRepresentation('FilerImage')` returns a representation
        // that `openCmsForm` can render. We deliberately do NOT include
        // a synthetic empty/"None" option — integrators add one
        // themselves if they want a no-class entry.
        const FORM_SCHEMA = [
            {
                name: 'class',
                label: 'Image class',
                type: 'select',
                options: [
                    { value: 'img-fluid', label: 'Responsive' },
                    { value: 'rounded', label: 'Rounded' },
                ],
                required: false,
            },
        ];

        beforeEach(() => {
            plugin.lang = {
                FilerImage: {
                    title: 'Filer image',
                    form: FORM_SCHEMA,
                },
            };
        });

        function tickAction() {
            // The toolbar action wraps `openCmsForm` in `setTimeout(0)`
            // — drain the queue so the dialog is mounted before assertions.
            return new Promise((resolve) => setTimeout(resolve, 0));
        }

        function tickThroughDblclickGuard() {
            // The click-form is deferred by ~250ms so a dblclick can
            // cancel it. Drain that timer in tests.
            return new Promise((resolve) => setTimeout(resolve, 300));
        }

        it('opens the form on a single click on an image', async () => {
            const content = '<img src="/media/cat.jpg" alt="cat">';
            const editor = createEditor('filer-form-click', content);

            const imgDom = editor.view.dom.querySelector('img');
            imgDom.dispatchEvent(new MouseEvent('click', {
                bubbles: true, cancelable: true,
            }));
            await tickThroughDblclickGuard();

            const dialog = editor.options.element
                .querySelector('dialog.FilerImage-form');
            expect(dialog).not.toBeNull();
            expect(dialog.querySelector('select[name="class"]')).not.toBeNull();
        });

        it('does not open the form on selection change alone', async () => {
            // Programmatic selection (keyboard nav, API call) must NOT
            // trigger the form — only an actual click does.
            const content = '<img src="/media/cat.jpg" alt="cat">';
            const editor = createEditor('filer-form-no-auto', content);
            editor.chain().focus().setNodeSelection(0).run();
            await tickThroughDblclickGuard();

            expect(editor.options.element
                .querySelector('dialog.FilerImage-form')).toBeNull();
        });

        it('does not open the form on a dblclick — the picker wins', async () => {
            // A dblclick fires two clicks first; the click-form must be
            // cancelled so the user only sees the picker.
            const content = '<img src="/media/cat.jpg" alt="cat">';
            const editor = createEditor('filer-form-dblclick-cancels', content);
            editor.options.settings = editor.options.settings || {};
            editor.options.settings.filer_image_lookup_url =
                '/admin/filer/?_popup=1&_pick=file';

            const imgDom = editor.view.dom.querySelector('img');
            // Browser order on a real dblclick: click, click, dblclick.
            imgDom.dispatchEvent(new MouseEvent('click', {
                bubbles: true, cancelable: true,
            }));
            imgDom.dispatchEvent(new MouseEvent('click', {
                bubbles: true, cancelable: true,
            }));
            imgDom.dispatchEvent(new MouseEvent('dblclick', {
                bubbles: true, cancelable: true,
            }));
            await tickThroughDblclickGuard();

            // Picker opened, form did not.
            expect(window.open).toHaveBeenCalledTimes(1);
            expect(editor.options.element
                .querySelector('dialog.FilerImage-form')).toBeNull();
        });

        it('does not open the form on click when the form schema is missing', async () => {
            plugin.lang = { FilerImage: { title: 'Filer image' } };
            const content = '<img src="/media/cat.jpg" alt="cat">';
            const editor = createEditor('filer-form-click-no-schema', content);

            const imgDom = editor.view.dom.querySelector('img');
            imgDom.dispatchEvent(new MouseEvent('click', {
                bubbles: true, cancelable: true,
            }));
            await tickThroughDblclickGuard();

            expect(editor.options.element
                .querySelector('dialog.FilerImage-form')).toBeNull();
        });

        it('opens the class form when the toolbar action runs with an image selected', async () => {
            const content = '<img src="/media/cat.jpg" alt="cat">';
            const editor = createEditor('filer-form-show', content);
            editor.chain().focus().setNodeSelection(0).run();
            expect(editor.isActive('image')).toBe(true);

            TiptapToolbar.FilerImage.action(editor);
            await tickAction();

            const dialog = editor.options.element
                .querySelector('dialog.FilerImage-form');
            expect(dialog).not.toBeNull();
            const select = dialog.querySelector('select[name="class"]');
            expect(select).not.toBeNull();
            const options = Array.from(select.options).map(
                (o) => [o.value, o.textContent]
            );
            expect(options).toEqual([
                ['img-fluid', 'Responsive'],
                ['rounded', 'Rounded'],
            ]);
            // No popup should be opened in this branch — the picker is
            // only triggered by inserts (no image selected) or dblclick.
            expect(window.open).not.toHaveBeenCalled();
        });

        it('falls back to the filer popup when no image is selected', () => {
            // Same lang config (form schema present), but cursor is not
            // on an image: the action must still route to the picker.
            const editor = createEditor('filer-form-fallback');
            editor.options.settings = editor.options.settings || {};
            editor.options.settings.filer_image_lookup_url =
                '/admin/filer/?_popup=1&_pick=file';

            TiptapToolbar.FilerImage.action(editor);
            expect(window.open).toHaveBeenCalledTimes(1);
            expect(editor.options.element
                .querySelector('dialog.FilerImage-form')).toBeNull();
        });

        it('writes the picked class onto the image via formAction', () => {
            const content = '<img src="/media/cat.jpg" alt="cat">';
            const editor = createEditor('filer-form-set', content);
            editor.chain().focus().setNodeSelection(0).run();

            const data = new FormData();
            data.set('class', 'img-fluid');
            TiptapToolbar.FilerImage.formAction(editor, data);

            expect(editor.getHTML()).toContain('class="img-fluid"');
        });

        it('clears the class when formAction receives an empty value', () => {
            const content = '<img src="/media/cat.jpg" alt="cat" class="img-fluid">';
            const editor = createEditor('filer-form-clear', content);
            editor.chain().focus().setNodeSelection(0).run();

            const data = new FormData();
            data.set('class', '');
            TiptapToolbar.FilerImage.formAction(editor, data);

            expect(editor.getHTML()).not.toContain('class=');
        });

        it('prefills the form with the image\'s current class via attributes()', () => {
            const content = '<img src="/media/cat.jpg" alt="cat" class="rounded">';
            const editor = createEditor('filer-form-prefill', content);
            editor.chain().focus().setNodeSelection(0).run();

            const attrs = TiptapToolbar.FilerImage.attributes(editor);
            expect(attrs.class).toBe('rounded');
        });

        it('applies the first configured class to newly inserted images', async () => {
            // With a form schema published, the insert flow uses the
            // first option as the default class — saves the author from
            // having to set it manually after every insert.
            const editor = createEditor('filer-form-default-class');
            editor.options.settings = editor.options.settings || {};
            editor.options.settings.filer_image_lookup_url =
                '/admin/filer/?_popup=1&_pick=file';

            TiptapToolbar.FilerImage.action(editor);
            const popupName = window.open.mock.calls.at(-1)[1];
            const fakeWin = { name: popupName, closed: false, close: jest.fn() };
            await window.dismissRelatedImageLookupPopup(
                fakeWin, 7, '/media/thumbs/x.jpg', 'x', '/admin/filer/file/7/'
            );
            await flushPromises();

            // First option in FORM_SCHEMA is `img-fluid`.
            expect(editor.getHTML()).toContain('class="img-fluid"');
        });

        it('does nothing on a selected image when the form schema is missing', async () => {
            // No `form` published — the toolbar should NOT open a dialog
            // and should NOT fall through to the picker either, because
            // an image is selected.
            plugin.lang = { FilerImage: { title: 'Filer image' } };
            const content = '<img src="/media/cat.jpg" alt="cat">';
            const editor = createEditor('filer-form-noop', content);
            editor.chain().focus().setNodeSelection(0).run();

            TiptapToolbar.FilerImage.action(editor);
            await tickAction();

            expect(editor.options.element
                .querySelector('dialog.FilerImage-form')).toBeNull();
            expect(window.open).not.toHaveBeenCalled();
        });
    });
});
