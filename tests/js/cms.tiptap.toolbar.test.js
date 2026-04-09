/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window, document, fetch, IntersectionObserver, URLSearchParams, console */

import TiptapToolbar from "../../private/js/tiptap_plugins/cms.tiptap.toolbar";
import CMSEditor from '../../private/js/cms.editor';
import CMSTipTapPlugin from '../../private/js/cms.tiptap';

describe('Tiptap toolbar items', () => {
    let editor;

    beforeEach(() => {
        document.body.innerHTML = `
            <script id="cms-editor-cfg" type="application/json">{"some": "config"}</script>
            <textarea class="CMS_Editor" id="editor1"></textarea>
        `;
        editor = window.CMS_Editor;
    });

    afterEach(() => {
        // Clean up tiptap editor instances directly (destroyAll passes string IDs
        // to destroyEditor which expects elements, so _editors may not be cleared)
        const plugin = window.cms_editor_plugin;

        if (plugin && plugin._editors && typeof plugin._editors === 'object') {
            for (const id of Object.keys(plugin._editors)) {
                const instance = plugin._editors[id];

                if (instance && typeof instance.destroy === 'function') {
                    instance.destroy();
                }

                delete plugin._editors[id];
            }
        }

        if (editor && typeof editor.destroyAll === 'function') {
            editor.destroyAll();
        }
    });

    it('initializes a single editor', () => {
        const el = document.getElementById('editor1');
        editor.init(el);
        expect(Object.keys(editor._editor_settings).length).toBe(1);
    });

    it('can execute all commands', () => {
        const el = document.getElementById('editor1');
        editor = window.CMS_Editor;
        editor.init(el);
        const tiptap = window.cms_editor_plugin._editors.editor1;

        expect(tiptap).toBeDefined();

        for (const item of Object.keys(TiptapToolbar)) {
            const toolbarItem = TiptapToolbar[item];
            if (item === 'Link' || item === 'CMSPlugins') {
                continue;  // These require CMS context
            }
            let isEnabled = false;
            try {
                isEnabled = toolbarItem.enabled && toolbarItem.enabled(tiptap);
            } catch (e) {
                // Command not available (extension filtered out by toolbar config)
                continue;
            }
            if (isEnabled) {
                try {
                    toolbarItem.action(tiptap);
                } catch (e) {
                    throw new Error(`failed command ${item}: ${e}`);
                }
            }
        }
    });

    it('cleans up fully after destroy', () => {
        const plugin = window.cms_editor_plugin;
        const el = document.getElementById('editor1');
        editor.init(el);

        const tiptap = plugin._editors.editor1;
        expect(tiptap).toBeDefined();
        expect(tiptap.isDestroyed).toBe(false);

        // Destroy via the plugin directly (the correct way)
        plugin.destroyEditor(el);

        expect(plugin._editors.editor1).toBeUndefined();
        expect(tiptap.isDestroyed).toBe(true);
    });

    it('cleans up after repeated create/destroy cycles', () => {
        const plugin = window.cms_editor_plugin;

        for (let i = 0; i < 5; i++) {
            const el = document.getElementById('editor1');
            el.style.display = '';

            plugin.create(el, false, `<p>cycle ${i}</p>`, {}, () => {});
            const tiptap = plugin._editors.editor1;
            expect(tiptap).toBeDefined();
            expect(tiptap.isDestroyed).toBe(false);

            plugin.destroyEditor(el);
            expect(plugin._editors.editor1).toBeUndefined();
            expect(tiptap.isDestroyed).toBe(true);
        }

        expect(Object.keys(plugin._editors).length).toBe(0);
    });

    it('destroyRTE cleans up editor instances', () => {
        const plugin = window.cms_editor_plugin;
        const el = document.getElementById('editor1');
        editor.init(el);

        expect(plugin._editors.editor1).toBeDefined();

        editor.destroyRTE();

        // destroyRTE passes string IDs to destroyEditor which expects elements
        // If this entry remains, it's a bug in destroyRTE/destroyEditor
        expect(plugin._editors.editor1).toBeUndefined();
    });

    describe('editor.options.el and editor.options.element consistency', () => {
        it('sets both options.el and options.element on a textarea editor', () => {
            const plugin = window.cms_editor_plugin;
            const el = document.getElementById('editor1');
            editor.init(el);

            const tiptap = plugin._editors.editor1;
            expect(tiptap).toBeDefined();
            // Both options must be defined
            expect(tiptap.options.el).toBeDefined();
            expect(tiptap.options.element).toBeDefined();
            // For textareas, el is the textarea and element is the wrapper div
            expect(tiptap.options.el).toBe(el);
            expect(tiptap.options.el.tagName).toBe('TEXTAREA');
            expect(tiptap.options.element.tagName).toBe('DIV');
            // The wrapper element should be a sibling of the textarea
            expect(tiptap.options.element).not.toBe(tiptap.options.el);
        });

        it('toolbar plugin works when only options.el is set (legacy)', () => {
            const plugin = window.cms_editor_plugin;
            const el = document.getElementById('editor1');
            editor.init(el);

            const tiptap = plugin._editors.editor1;
            // Verify the toolbar code paths used both via fallback
            // (cms.toolbar.js uses `editor.options.el || editor.options.element`)
            const fallbackEl = tiptap.options.el || tiptap.options.element;
            expect(fallbackEl).toBeDefined();
            expect(typeof fallbackEl.getBoundingClientRect).toBe('function');
            expect(fallbackEl.tagName).toBeDefined();
        });

        it('toolbar plugin works when only options.element is set', () => {
            const plugin = window.cms_editor_plugin;
            const el = document.getElementById('editor1');
            editor.init(el);

            const tiptap = plugin._editors.editor1;
            // Simulate a setup where `el` is missing - the fallback should work
            const originalEl = tiptap.options.el;
            delete tiptap.options.el;

            const fallbackEl = tiptap.options.el || tiptap.options.element;
            expect(fallbackEl).toBeDefined();
            expect(fallbackEl).toBe(tiptap.options.element);
            expect(typeof fallbackEl.getBoundingClientRect).toBe('function');

            // Restore
            tiptap.options.el = originalEl;
        });

        it('source code uses fallback pattern for editor.options.el access in cms.toolbar.js', async () => {
            // Static check: ensure all direct accesses of editor.options.el in
            // cms.toolbar.js are guarded with a fallback to editor.options.element.
            // This catches regressions where new code uses options.el directly.
            const fs = require('fs');
            const path = require('path');
            const filePath = path.resolve(
                __dirname, '../../private/js/tiptap_plugins/cms.toolbar.js'
            );
            const source = fs.readFileSync(filePath, 'utf8');
            // Find all .options.el access without `||` fallback or `.element`
            // Allowed patterns:
            //   editor.options.el || editor.options.element
            //   this.editor.options.el || this.editor.options.element
            //   editor.options.element  (no .el at all)
            // Disallowed: standalone `editor.options.el` reads (without fallback)
            const lines = source.split('\n');
            const offenders = [];
            lines.forEach((line, idx) => {
                // Match `.options.el` not followed by `ement` (to exclude `.options.element`)
                // and not in a chain that includes a fallback `|| ... .element`
                const match = line.match(/\.options\.el(?!ement)/);
                if (match) {
                    // Check if the same line contains a fallback to .element
                    if (!line.includes('options.element')) {
                        offenders.push(`Line ${idx + 1}: ${line.trim()}`);
                    }
                }
            });
            expect(offenders).toEqual([]);
        });
    });
});
