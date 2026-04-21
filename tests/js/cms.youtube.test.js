/* eslint-env es11, jest */
/* jshint esversion: 11 */
/* global window, document, require */

// Demo contrib extension: YouTube video embed.
// Exercises the dynamic registry via window.CMS_Editor.tiptap.
//
// Order matters: the cms.tiptap import below sets up the registry on
// window, and only then can the IIFE in cms.youtube.js find it.
import '../../private/js/cms.editor';
import '../../private/js/cms.tiptap';
import TiptapToolbar from '../../private/js/tiptap_plugins/cms.tiptap.toolbar';

describe('YouTube dynamic extension (contrib/youtube)', () => {
    let plugin;

    beforeAll(() => {
        // Loading the IIFE registers the node factory and toolbar item.
        require('../../djangocms_text/contrib/youtube/static/djangocms_text/tiptap_plugins/cms.youtube.js');
    });

    beforeEach(() => {
        document.body.innerHTML = `
            <script id="cms-editor-cfg" type="application/json">{"some": "config"}</script>
        `;
        window.dispatchEvent(new Event('DOMContentLoaded'));
        plugin = window.cms_editor_plugin;
        // Reset the cached lang so each test can supply its own.
        plugin.lang = null;
    });

    afterEach(() => {
        for (const id of Object.keys(plugin._editors)) {
            plugin.destroyEditor(document.getElementById(id));
        }
    });

    function createEditor(id, content = '', options = {}) {
        const el = document.createElement('textarea');
        el.id = id;
        el.classList.add('CMS_Editor');
        document.body.appendChild(el);
        plugin.create(el, false, content, {options}, () => {});
        return plugin._editors[id];
    }

    it('registers the Youtube toolbar item', () => {
        expect(TiptapToolbar.Youtube).toBeDefined();
        expect(typeof TiptapToolbar.Youtube.action).toBe('function');
        expect(TiptapToolbar.Youtube.type).toBe('block');
    });

    it('adds the youtubeVideo node to the editor schema', () => {
        const editor = createEditor('yt-schema');
        expect(editor.schema.nodes.youtubeVideo).toBeDefined();
    });

    it('inserts a YouTube iframe via the setYoutubeVideo command', () => {
        const editor = createEditor('yt-insert');
        const ok = editor.chain().focus()
            .setYoutubeVideo({src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'})
            .run();
        expect(ok).toBe(true);
        const html = editor.getHTML();
        expect(html).toContain('data-youtube-video');
        expect(html).toContain('youtube.com/embed/dQw4w9WgXcQ');
        // Modern embed boilerplate — missing `encrypted-media` triggers
        // YouTube error 153 in the player.
        expect(html).toContain('encrypted-media');
        expect(html).toContain('referrerpolicy="strict-origin-when-cross-origin"');
    });

    it('normalizes short youtu.be URLs', () => {
        const editor = createEditor('yt-short');
        editor.chain().focus()
            .setYoutubeVideo({src: 'https://youtu.be/dQw4w9WgXcQ'})
            .run();
        expect(editor.getHTML()).toContain('youtube.com/embed/dQw4w9WgXcQ');
    });

    it('rejects unparseable URLs', () => {
        const editor = createEditor('yt-bad');
        const ok = editor.chain().focus()
            .setYoutubeVideo({src: 'https://example.com/not-a-video'})
            .run();
        expect(ok).toBe(false);
        expect(editor.getHTML()).not.toContain('youtube.com/embed');
    });

    it('produces a representation when server lang provides a label', () => {
        const el = document.createElement('textarea');
        el.id = 'yt-repr';
        el.classList.add('CMS_Editor');
        document.body.appendChild(el);
        // lang is normally populated by the server (see register_toolbar_labels
        // in djangocms_text.contrib.youtube); simulate that here.
        plugin.create(el, false, '', {
            lang: {Youtube: {title: 'YouTube'}},
            options: {toolbar: [['Bold', 'Youtube']]},
        }, () => {});

        const repr = plugin._getRepresentation('Youtube');
        expect(repr).toBeTruthy();
        expect(repr.title).toBe('YouTube');
        expect(typeof repr.action).toBe('function');
        expect(repr.type).toBe('block');
    });

    it('falls back to the failed representation without a lang entry', () => {
        const el = document.createElement('textarea');
        el.id = 'yt-nolang';
        el.classList.add('CMS_Editor');
        document.body.appendChild(el);
        plugin.create(el, false, '', {
            lang: {Bold: {title: 'Bold'}},  // no Youtube entry
            options: {toolbar: [['Bold']]},
        }, () => {});

        const repr = plugin._getRepresentation('Youtube');
        expect(repr).toBeUndefined();
    });

    it('round-trips an existing YouTube iframe through parseHTML', () => {
        const content =
            '<div data-youtube-video>' +
            '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" ' +
            'width="560" height="315"></iframe></div>';
        const editor = createEditor('yt-roundtrip', content);
        const html = editor.getHTML();
        expect(html).toContain('youtube.com/embed/dQw4w9WgXcQ');
        expect(html).toContain('data-youtube-video');
    });
});
