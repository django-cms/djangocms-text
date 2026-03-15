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
