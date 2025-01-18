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

        editor.loadForm('about:blank', iframe, el, () => {
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
});
