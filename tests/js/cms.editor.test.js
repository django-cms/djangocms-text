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
});
