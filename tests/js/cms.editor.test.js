/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window, document, fetch, IntersectionObserver, URLSearchParams, console */

import CMSEditor from '../../private/js/cms.editor';
import CMSTipTapPlugin from '../../private/js/cms.tiptap';


function mockFetch(data) {
    return jest.fn().mockImplementation(() =>
        Promise.resolve({
            ok: true,
            status: 200,
            text: () => data,
        }),
    );
}


describe('CMSEditor', () => {
    let editor;

    beforeEach(() => {
        document.body.innerHTML = `
            <script id="cms-editor-cfg" type="application/json">{"some": "config"}</script>
            <textarea class="CMS_Editor" id="editor1"></textarea>
            <textarea class="CMS_Editor" id="editor2"></textarea>
        `;

        window.dispatchEvent(new Event('DOMContentLoaded'));

        editor = window.CMS_Editor;
        editor._editor_settings = {};

    });

    afterEach(() => {
        editor.destroyAll();
    });

    it('reads global settings', () => {
        editor.initAll();
        expect(window.CMS_Editor._global_settings).toEqual({some: 'config'});
    });

    it('initializes all editors on the page', () => {
        editor.initAll();
        expect(Object.keys(editor._editor_settings).length).toBe(2);
    });

    it('initializes a single editor', () => {
        const el = document.getElementById('editor1');
        editor.init(el);
        expect(Object.keys(editor._editor_settings).length).toBe(1);
    });

    it('destroys all editors', () => {
        editor.initAll();
        editor.destroyAll();
        expect(Object.keys(editor._editor_settings).length).toBe(0);
    });

    it('destroyAll cleans up tiptap editor instances', () => {
        const plugin = window.cms_editor_plugin;
        editor.initAll();

        // Both editors should be created
        expect(plugin._editors.editor1).toBeDefined();
        expect(plugin._editors.editor2).toBeDefined();
        expect(plugin._editors.editor1.isDestroyed).toBe(false);
        expect(plugin._editors.editor2.isDestroyed).toBe(false);

        editor.destroyAll();

        // Tiptap instances should be destroyed and removed
        expect(plugin._editors.editor1).toBeUndefined();
        expect(plugin._editors.editor2).toBeUndefined();
        expect(Object.keys(plugin._editors).length).toBe(0);
    });

    it('cleans up after repeated init/destroy cycles', () => {
        const plugin = window.cms_editor_plugin;

        for (let i = 0; i < 5; i++) {
            editor.initAll();
            expect(Object.keys(plugin._editors).length).toBe(2);

            const tiptap1 = plugin._editors.editor1;
            const tiptap2 = plugin._editors.editor2;

            editor.destroyAll();
            expect(Object.keys(plugin._editors).length).toBe(0);
            expect(tiptap1.isDestroyed).toBe(true);
            expect(tiptap2.isDestroyed).toBe(true);

            // Re-show textareas for next cycle
            document.getElementById('editor1').style.display = '';
            document.getElementById('editor2').style.display = '';
        }
    });

    it('destroyRTE clears _editor_settings', () => {
        editor.initAll();
        expect(Object.keys(editor._editor_settings).length).toBe(2);

        editor.destroyRTE();
        expect(Object.keys(editor._editor_settings).length).toBe(0);
    });

    it('handles plugin form loading', (done) => {
        const iframe = document.createElement('iframe');
        const el = document.getElementById('editor1');
        document.body.appendChild(iframe);

        editor.loadPluginForm('about:blank', iframe, el, () => {
            expect(iframe.contentDocument).toBeTruthy();
            done();
        });
    });

    it('requests plugin markup', async () => {
        const fetchedMarkup = '<div>test</div>';
        window.fetch = mockFetch(fetchedMarkup);
        const el = document.getElementById('editor1');
        const markup = await editor.requestPluginMarkup(1, el);
        expect(markup).toBe(fetchedMarkup);
    });

    it('resets inline editors', () => {
        editor.initAll();
        editor._resetInlineEditors();
        expect(Object.keys(editor._editor_settings).length).toBe(2);
    });

    it('destroys orphaned editors when DOM is replaced', () => {
        const plugin = window.cms_editor_plugin;

        // Create editors
        editor.initAll();
        expect(plugin._editors.editor1).toBeDefined();
        expect(plugin._editors.editor1.isDestroyed).toBe(false);

        const oldEditor = plugin._editors.editor1;

        // Simulate CMS replacing the DOM: remove the editor's rendered element
        const editorElement = oldEditor.options.element;
        editorElement.remove();

        // _resetInlineEditors should detect the orphaned editor and destroy it
        editor._resetInlineEditors();

        expect(oldEditor.isDestroyed).toBe(true);
        expect(plugin._editors.editor1).toBeUndefined();
    });

    it('keeps editors whose DOM is still present', () => {
        const plugin = window.cms_editor_plugin;

        editor.initAll();
        expect(plugin._editors.editor1).toBeDefined();

        const oldEditor = plugin._editors.editor1;

        // DOM is NOT replaced — editor element still present
        editor._resetInlineEditors();

        // Editor should be kept, not destroyed
        expect(oldEditor.isDestroyed).toBe(false);
        expect(plugin._editors.editor1).toBe(oldEditor);
    });

    it('highlights text plugin', () => {
        const pluginId = 'test-plugin';
        document.body.innerHTML += `<div class="cms-draggable-${pluginId}"></div>`;
        editor._highlightTextplugin(pluginId);
        expect(document.querySelector(`.cms-draggable-${pluginId}`)).toBeTruthy();
    });

    describe('inline admin add row', () => {
        const flush = () => new Promise(resolve => setTimeout(resolve, 50));

        function setupInlineAdmin(inlineHTML) {
            document.body.innerHTML = `
                <script id="cms-editor-cfg" type="application/json">{"some": "config"}</script>
                ${inlineHTML}
            `;
            document.body.classList.add('change-form');

            // Recalculate the admin selector to exclude empty-form templates
            editor._admin_selector = 'textarea.CMS_Editor';
            if (document.querySelector(editor._inline_admin_selector + '.empty-form')) {
                editor._admin_selector = editor._inline_admin_selector +
                    ':not(.empty-form) ' + editor._admin_selector;
            }
            editor._editor_settings = {};
            editor.initAll();
        }

        it('initializes editors in stacked inline and adds new ones on add row click', async () => {
            setupInlineAdmin(`
                <div class="inline-group" id="stacked-group">
                    <div class="form-row">
                        <textarea class="CMS_Editor" id="stacked-editor-0"></textarea>
                    </div>
                    <div class="form-row empty-form">
                        <textarea class="CMS_Editor" id="stacked-editor-empty"></textarea>
                    </div>
                    <div class="add-row"><a href="#">Add another</a></div>
                </div>
            `);

            // The existing editor should be initialized, but not the empty-form template
            expect(editor._editor_settings['stacked-editor-0']).toBeDefined();
            expect(editor._editor_settings['stacked-editor-empty']).toBeUndefined();

            // Wait for the first setTimeout in initAll to attach click listeners
            await flush();

            // Simulate Django's add row: clone the empty form as a real row
            const emptyRow = document.querySelector('.form-row.empty-form');
            const newRow = emptyRow.cloneNode(true);
            newRow.classList.remove('empty-form');
            const newTextarea = newRow.querySelector('textarea');
            newTextarea.id = 'stacked-editor-1';
            emptyRow.parentNode.insertBefore(newRow, emptyRow);

            // Click the "Add another" link
            document.querySelector('.add-row a').click();

            // Wait for the second setTimeout inside the click handler
            await flush();

            expect(editor._editor_settings['stacked-editor-1']).toBeDefined();
            // Empty form template should still not be initialized
            expect(editor._editor_settings['stacked-editor-empty']).toBeUndefined();
        });

        it('initializes editors in tabular inline and adds new ones on add row click', async () => {
            setupInlineAdmin(`
                <div class="inline-group" id="tabular-group">
                    <table>
                        <tbody>
                            <tr class="form-row">
                                <td><textarea class="CMS_Editor" id="tabular-editor-0"></textarea></td>
                            </tr>
                            <tr class="form-row empty-form">
                                <td><textarea class="CMS_Editor" id="tabular-editor-empty"></textarea></td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="add-row"><a href="#">Add another</a></div>
                </div>
            `);

            // The existing editor should be initialized, but not the empty-form template
            expect(editor._editor_settings['tabular-editor-0']).toBeDefined();
            expect(editor._editor_settings['tabular-editor-empty']).toBeUndefined();

            // Wait for the first setTimeout in initAll to attach click listeners
            await flush();

            // Simulate Django's add row: clone the empty form as a real row
            const emptyRow = document.querySelector('tr.form-row.empty-form');
            const newRow = emptyRow.cloneNode(true);
            newRow.classList.remove('empty-form');
            const newTextarea = newRow.querySelector('textarea');
            newTextarea.id = 'tabular-editor-1';
            emptyRow.parentNode.insertBefore(newRow, emptyRow);

            // Click the "Add another" link
            document.querySelector('.add-row a').click();

            // Wait for the second setTimeout inside the click handler
            await flush();

            expect(editor._editor_settings['tabular-editor-1']).toBeDefined();
            // Empty form template should still not be initialized
            expect(editor._editor_settings['tabular-editor-empty']).toBeUndefined();
        });
    });

    describe('_initInlineRichText', () => {
        it('returns undefined for empty element list', () => {
            const result = editor._initInlineRichText([], '/edit/1/', 'cms-plugin-1');
            expect(result).toBeUndefined();
        });

        it('uses a single DIV element as wrapper directly', () => {
            const div = document.createElement('div');
            div.classList.add('cms-plugin', 'cms-plugin-1');
            document.body.appendChild(div);

            const result = editor._initInlineRichText([div], '/edit/1/', 'cms-plugin-1');
            expect(result).toBe(div);
            expect(result.classList.contains('cms-editor-inline-wrapper')).toBe(true);
            expect(result.dataset.cmsEditUrl).toBe('/edit/1/');
        });

        it('uses a single SECTION element as wrapper directly', () => {
            const section = document.createElement('section');
            section.classList.add('cms-plugin', 'cms-plugin-1');
            document.body.appendChild(section);

            const result = editor._initInlineRichText([section], '/edit/1/', 'cms-plugin-1');
            expect(result).toBe(section);
            expect(result.classList.contains('cms-editor-inline-wrapper')).toBe(true);
        });

        it('uses a single ARTICLE element as wrapper directly', () => {
            const article = document.createElement('article');
            document.body.appendChild(article);

            const result = editor._initInlineRichText([article], '/edit/1/', 'cms-plugin-1');
            expect(result).toBe(article);
            expect(result.classList.contains('cms-editor-inline-wrapper')).toBe(true);
        });

        it('wraps a single P element in a new DIV', () => {
            const p = document.createElement('p');
            p.textContent = 'Hello';
            document.body.appendChild(p);

            const result = editor._initInlineRichText([p], '/edit/1/', 'cms-plugin-1');
            expect(result.tagName).toBe('DIV');
            expect(result.classList.contains('cms-editor-inline-wrapper')).toBe(true);
            expect(result.classList.contains('wrapped')).toBe(true);
            expect(result.contains(p)).toBe(true);
        });

        it('wraps a single H1 element in a new DIV', () => {
            const h1 = document.createElement('h1');
            h1.textContent = 'Title';
            document.body.appendChild(h1);

            const result = editor._initInlineRichText([h1], '/edit/1/', 'cms-plugin-1');
            expect(result.tagName).toBe('DIV');
            expect(result.classList.contains('wrapped')).toBe(true);
        });

        it('wraps multiple elements in a new DIV', () => {
            const container = document.createElement('div');
            document.body.appendChild(container);
            const p1 = document.createElement('p');
            const p2 = document.createElement('p');
            p1.classList.add('cms-plugin', 'cms-plugin-1');
            p2.classList.add('cms-plugin', 'cms-plugin-1');
            container.appendChild(p1);
            container.appendChild(p2);

            const result = editor._initInlineRichText([p1, p2], '/edit/1/', 'cms-plugin-1');
            expect(result.tagName).toBe('DIV');
            expect(result.classList.contains('wrapped')).toBe(true);
            expect(result.contains(p1)).toBe(true);
            expect(result.contains(p2)).toBe(true);
        });

        it('uses .cms-content-start as editing base when present inside a wrapper tag', () => {
            const div = document.createElement('div');
            const contentStart = document.createElement('div');
            contentStart.classList.add('cms-content-start');
            contentStart.textContent = 'Editable content';
            div.appendChild(contentStart);
            document.body.appendChild(div);

            const result = editor._initInlineRichText([div], '/edit/1/', 'cms-plugin-1');
            expect(result).toBe(contentStart);
            expect(result.classList.contains('cms-editor-inline-wrapper')).toBe(true);
            expect(result.dataset.cmsEditUrl).toBe('/edit/1/');
        });

        it('uses .cms-content-start inside a SECTION element', () => {
            const section = document.createElement('section');
            const header = document.createElement('h1');
            header.textContent = 'Title';
            const contentStart = document.createElement('div');
            contentStart.classList.add('cms-content-start');
            contentStart.textContent = 'Content here';
            section.appendChild(header);
            section.appendChild(contentStart);
            document.body.appendChild(section);

            const result = editor._initInlineRichText([section], '/edit/1/', 'cms-plugin-1');
            expect(result).toBe(contentStart);
            expect(result.classList.contains('cms-editor-inline-wrapper')).toBe(true);
        });

        it('ignores .cms-content-start when element is not a wrapper tag', () => {
            const p = document.createElement('p');
            const span = document.createElement('span');
            span.classList.add('cms-content-start');
            p.appendChild(span);
            document.body.appendChild(p);

            const result = editor._initInlineRichText([p], '/edit/1/', 'cms-plugin-1');
            // P is not a wrapper tag, so it gets wrapped in a new DIV
            expect(result.tagName).toBe('DIV');
            expect(result.classList.contains('wrapped')).toBe(true);
            // The .cms-content-start check only applies to the already-wrapped case
            expect(result).not.toBe(span);
        });

        it('falls back to wrapper when no .cms-content-start is present', () => {
            const div = document.createElement('div');
            div.textContent = 'Plain content';
            document.body.appendChild(div);

            const result = editor._initInlineRichText([div], '/edit/1/', 'cms-plugin-1');
            expect(result).toBe(div);
            expect(result.classList.contains('cms-editor-inline-wrapper')).toBe(true);
        });
    });

    describe('saveData', () => {
        let fetchMock;

        beforeEach(() => {
            fetchMock = mockFetch(
                '<html><body><div class="messagelist"><div class="success">OK</div></div></body></html>'
            );
            window.fetch = fetchMock;
        });

        it('does not call cms_editor_plugin for CharField editors', () => {
            const el = document.createElement('div');
            el.id = 'char-editor-1';
            el.textContent = 'Updated title';
            el.dataset.changed = 'true';
            el.dataset.cmsEditUrl = '/edit/1/';
            el.dataset.cmsCsrfToken = 'test-token';
            el.dataset.cmsField = 'title';
            el.dataset.cmsType = 'CharField';
            document.body.appendChild(el);

            // Mock cms_editor_plugin with spies
            const getHTMLSpy = jest.fn();
            const getJSONSpy = jest.fn();
            window.cms_editor_plugin = {
                _editors: {},
                create: jest.fn(),
                getHTML: getHTMLSpy,
                getJSON: getJSONSpy,
                destroyEditor: jest.fn(),
            };

            editor.saveData(el);

            // Should NOT call cms_editor_plugin for CharField
            expect(getHTMLSpy).not.toHaveBeenCalled();
            expect(getJSONSpy).not.toHaveBeenCalled();

            // Should have called fetch with the textContent
            expect(fetchMock).toHaveBeenCalled();
            const body = fetchMock.mock.calls[0][1].body;
            expect(body.get('title')).toBe('Updated title');
        });

        it('calls cms_editor_plugin for TextPlugin editors', () => {
            const el = document.createElement('div');
            el.id = 'text-editor-1';
            el.dataset.changed = 'true';
            el.dataset.cmsEditUrl = '/edit/1/';
            el.dataset.cmsCsrfToken = 'test-token';
            el.dataset.cmsType = 'TextPlugin';
            document.body.appendChild(el);

            window.cms_editor_plugin = {
                _editors: {},
                create: jest.fn(),
                getHTML: jest.fn().mockReturnValue('<p>Rich text</p>'),
                getJSON: jest.fn().mockReturnValue({type: 'doc'}),
                destroyEditor: jest.fn(),
            };

            editor.saveData(el);

            expect(window.cms_editor_plugin.getHTML).toHaveBeenCalledWith(el);
            expect(window.cms_editor_plugin.getJSON).toHaveBeenCalledWith(el);

            const body = fetchMock.mock.calls[0][1].body;
            expect(body.get('body')).toBe('<p>Rich text</p>');
        });

        it('calls cms_editor_plugin for HTMLField editors', () => {
            const el = document.createElement('div');
            el.id = 'html-editor-1';
            el.dataset.changed = 'true';
            el.dataset.cmsEditUrl = '/edit/1/';
            el.dataset.cmsCsrfToken = 'test-token';
            el.dataset.cmsField = 'content';
            el.dataset.cmsType = 'HTMLField';
            document.body.appendChild(el);

            window.cms_editor_plugin = {
                _editors: {},
                create: jest.fn(),
                getHTML: jest.fn().mockReturnValue('<p>HTML content</p>'),
                getJSON: jest.fn().mockReturnValue(undefined),
                destroyEditor: jest.fn(),
            };

            editor.saveData(el);

            expect(window.cms_editor_plugin.getHTML).toHaveBeenCalledWith(el);

            const body = fetchMock.mock.calls[0][1].body;
            expect(body.get('content')).toBe('<p>HTML content</p>');
        });
    });

    describe('inline dblclick guard', () => {
        // The guard installs document-level listeners exactly once per
        // page load (`_inlineDblclickGuardInstalled` flag); since the
        // module is imported by the outer suite, the listeners are
        // already wired before this block runs. Each test just sets up
        // the wrapper / "editor" registry state it needs.
        let docDblclick;
        let wrapper;

        beforeEach(() => {
            // jsdom doesn't ship `IntersectionObserver`; the rest of
            // `initInlineEditors` constructs one. We don't exercise the
            // observer path here, so a no-op stub is enough.
            if (typeof window.IntersectionObserver === 'undefined') {
                window.IntersectionObserver = class {
                    observe() {}
                    unobserve() {}
                    disconnect() {}
                };
            }
            // Trigger `_installInlineDblclickGuard` (idempotent after
            // the first call). Without this we'd be relying on a side
            // effect of an unrelated earlier test.
            editor.CMS = { _plugins: [] };
            editor.initInlineEditors();

            // Stand-in for an inline-editor wrapper. The guard considers
            // it editor-enabled when its id exists in
            // `cms_editor_plugin._editors` or `_generic_editors`.
            wrapper = document.createElement('div');
            wrapper.id = 'inline-wrapper-1';
            wrapper.classList.add('cms-editor-inline-wrapper');
            document.body.appendChild(wrapper);

            window.cms_editor_plugin = window.cms_editor_plugin || {};
            window.cms_editor_plugin._editors =
                window.cms_editor_plugin._editors || {};
            window.cms_editor_plugin._editors[wrapper.id] = { fake: true };

            // Per-wrapper guard is what `initInlineEditors` does for each
            // editor it sets up — call it directly here.
            editor.attachInlineDblclickGuard(wrapper);

            docDblclick = jest.fn();
            // Bubble-phase document listener stands in for jQuery's
            // delegated `dblclick.cms.plugin` handler — if it fires, the
            // CMS modal would have been opened.
            document.addEventListener('dblclick', docDblclick);
        });

        afterEach(() => {
            document.removeEventListener('dblclick', docDblclick);
            wrapper.remove();
            delete window.cms_editor_plugin._editors[wrapper.id];
        });

        function dispatchDblclick(target) {
            // Real gesture: mousedown then dblclick. The mousedown lets
            // the guard track the originating wrapper for the
            // drag-extend fallback path.
            target.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true, cancelable: true, button: 0,
            }));
            target.dispatchEvent(new MouseEvent('dblclick', {
                bubbles: true, cancelable: true, button: 0,
            }));
        }

        it('lets bubble-phase listeners between target and wrapper still fire', () => {
            // Simulate ProseMirror's `view.dom` (a descendant of the
            // wrapper, ancestor of the actual click target).
            const viewDom = document.createElement('div');
            const target = document.createElement('span');
            viewDom.appendChild(target);
            wrapper.appendChild(viewDom);

            const viewDomDblclick = jest.fn();
            viewDom.addEventListener('dblclick', viewDomDblclick);

            dispatchDblclick(target);

            // Editor-side bubble listener fired...
            expect(viewDomDblclick).toHaveBeenCalledTimes(1);
            // ...but the event was stopped at the wrapper before
            // reaching document, so the modal-opening delegate never sees it.
            expect(docDblclick).not.toHaveBeenCalled();
        });

        it('lets dblclicks on nested cms-plugin tags reach the document delegate', () => {
            const nested = document.createElement('cms-plugin');
            wrapper.appendChild(nested);

            dispatchDblclick(nested);

            // Pass-through: the modal editor for the nested plugin
            // should still open.
            expect(docDblclick).toHaveBeenCalledTimes(1);
        });

        it('still suppresses when the wrapper itself is a cms-plugin tag', () => {
            // Text plugins are inline-edited *in place*, so the
            // wrapper is the cms-plugin element itself. A naive
            // `closest('cms-plugin')` would walk up to the wrapper and
            // misclassify every interior dblclick as "nested plugin",
            // letting the modal handler open on every word-select.
            const pluginWrapper = document.createElement('cms-plugin');
            pluginWrapper.id = 'plugin-wrapper-1';
            pluginWrapper.classList.add('cms-editor-inline-wrapper');
            document.body.appendChild(pluginWrapper);
            window.cms_editor_plugin._editors[pluginWrapper.id] = { fake: true };
            editor.attachInlineDblclickGuard(pluginWrapper);

            const viewDom = document.createElement('div');
            const target = document.createElement('img');
            viewDom.appendChild(target);
            pluginWrapper.appendChild(viewDom);

            const editorHandler = jest.fn();
            viewDom.addEventListener('dblclick', editorHandler);

            // Real gesture for this scoped wrapper.
            target.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true, cancelable: true, button: 0,
            }));
            target.dispatchEvent(new MouseEvent('dblclick', {
                bubbles: true, cancelable: true, button: 0,
            }));

            expect(editorHandler).toHaveBeenCalledTimes(1);
            expect(docDblclick).not.toHaveBeenCalled();

            delete window.cms_editor_plugin._editors[pluginWrapper.id];
            pluginWrapper.remove();
        });

        it('suppresses dblclicks landing outside the wrapper when the gesture started inside', () => {
            const outside = document.createElement('div');
            document.body.appendChild(outside);

            // Gesture starts inside the wrapper, dblclick lands outside
            // (drag-extend-by-word browser behaviour).
            wrapper.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true, cancelable: true, button: 0,
            }));
            outside.dispatchEvent(new MouseEvent('dblclick', {
                bubbles: true, cancelable: true, button: 0,
            }));

            expect(docDblclick).not.toHaveBeenCalled();
            outside.remove();
        });

        it('does not suppress unrelated dblclicks outside any inline wrapper', () => {
            const unrelated = document.createElement('div');
            document.body.appendChild(unrelated);

            dispatchDblclick(unrelated);

            expect(docDblclick).toHaveBeenCalledTimes(1);
            unrelated.remove();
        });

        it('does not suppress wrappers that never had the guard attached', () => {
            // If editor creation failed (or simply hasn't run yet), the
            // per-wrapper guard isn't installed and dblclicks reach the
            // document delegate — preserving the modal-editor fallback.
            const bareWrapper = document.createElement('div');
            bareWrapper.id = 'wrapper-without-editor';
            bareWrapper.classList.add('cms-editor-inline-wrapper');
            document.body.appendChild(bareWrapper);

            const target = document.createElement('span');
            bareWrapper.appendChild(target);

            dispatchDblclick(target);

            expect(docDblclick).toHaveBeenCalledTimes(1);
            bareWrapper.remove();
        });

        it('attachInlineDblclickGuard is idempotent', () => {
            // Calling twice must not stack listeners — otherwise a
            // second call from a re-init path would double the work
            // (and could break if the first call already self-removed).
            editor.attachInlineDblclickGuard(wrapper);
            editor.attachInlineDblclickGuard(wrapper);

            const target = document.createElement('span');
            wrapper.appendChild(target);
            dispatchDblclick(target);

            expect(docDblclick).not.toHaveBeenCalled();
        });
    });
});
