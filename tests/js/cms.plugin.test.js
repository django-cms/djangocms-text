/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window, document */

import CMSEditor from '../../private/js/cms.editor';
import CMSTipTapPlugin from '../../private/js/cms.tiptap';

describe('CMS plugin menus use the current editor settings', () => {
    const linkPlugins = [{value: 'LinkPlugin', name: 'Link', module: 'Generic'}];
    const imagePlugins = [{value: 'ImagePlugin', name: 'Image', module: 'Generic'}];
    let originalSettings;
    let originalLang;
    let editors;

    beforeEach(() => {
        document.body.innerHTML = '';
        originalSettings = window.CMS_Editor._editor_settings;
        window.CMS_Editor._editor_settings = {};
        originalLang = window.cms_editor_plugin.lang;
        window.cms_editor_plugin.lang = {CMSPlugins: {title: 'Plugins'}};
        editors = [];
    });

    afterEach(() => {
        for (const editor of editors) {
            window.cms_editor_plugin.destroyEditor(editor.options.el);
        }
        window.CMS_Editor._editor_settings = originalSettings;
        window.cms_editor_plugin.lang = originalLang;
    });

    async function createInlineEditor(id, installedPlugins) {
        const el = document.createElement('div');
        el.id = id;
        el.className = 'cms-editor-inline-wrapper';
        document.body.appendChild(el);
        const settings = {installed_plugins: installedPlugins, options: {
            toolbar: ['CMSPlugins', 'LinkPlugin', 'ImagePlugin'],
        }};
        window.CMS_Editor._editor_settings[id] = settings;
        window.cms_editor_plugin.create(el, false, '<p>Text</p>', settings, () => {});
        const editor = window.cms_editor_plugin._editors[id];
        editors.push(editor);
        await new Promise(resolve => setTimeout(resolve, 40));
        return editor;
    }

    it.each([
        [[], linkPlugins],
        [linkPlugins, []],
        [linkPlugins, imagePlugins],
        [linkPlugins, undefined],
    ])('keeps each inline menu and standalone plugin buttons independent (%j, %j)', async (first, second) => {
        await createInlineEditor('first-inline', first);
        await createInlineEditor('second-inline', second);

        for (const [index, expected] of [first, second].entries()) {
            const editor = editors[index];
            // jsdom places the editor at x=0: the left-edge, top-toolbar-only path.
            expect(editor.options.blockToolbar).toBeUndefined();
            const toolbar = editor.options.topToolbar;
            const menu = toolbar.querySelector('.dropdown-content.plugins');
            if (expected?.length) {
                expect(menu).not.toBeNull();
                expect(Array.from(menu.querySelectorAll('button'), el => el.dataset.cmsplugin))
                    .toEqual(expected.map(plugin => plugin.value));
                menu.parentElement.dispatchEvent(new MouseEvent('click', {bubbles: true}));
                expect(menu.parentElement).toHaveClass('show');
            } else {
                expect(menu).toBeNull();
                expect(toolbar.querySelector('.dropdown')).toBeNull();
            }
            expect(Array.from(toolbar.querySelectorAll(':scope > button'), el => el.dataset.cmsplugin))
                .toEqual((expected || []).map(plugin => plugin.value));
        }
    });

    it('returns an empty list before any editor is registered', () => {
        expect(window.CMS_Editor.getInstalledPlugins()).toEqual([]);
    });

    it('preserves the legacy lookup when no editor is supplied', () => {
        window.CMS_Editor._editor_settings = {first: {installed_plugins: linkPlugins}};
        expect(window.CMS_Editor.getInstalledPlugins()).toEqual(linkPlugins);
    });
});


describe('CmsPluginNode addNodeView', () => {
    let plugin;
    let originalGetInstalledPlugins;

    beforeEach(() => {
        document.body.innerHTML = `
            <script id="cms-editor-cfg" type="application/json">{"some": "config"}</script>
        `;
        window.dispatchEvent(new Event('DOMContentLoaded'));
        plugin = window.cms_editor_plugin;
        // Stub getInstalledPlugins so it doesn't depend on _editor_settings
        originalGetInstalledPlugins = window.CMS_Editor.getInstalledPlugins;
        window.CMS_Editor.getInstalledPlugins = () => [];
    });

    afterEach(() => {
        window.CMS_Editor.getInstalledPlugins = originalGetInstalledPlugins;
        for (const id of Object.keys(plugin._editors)) {
            plugin.destroyEditor(document.getElementById(id));
        }
    });

    function createEditor(id, content) {
        const el = document.createElement('textarea');
        el.id = id;
        el.classList.add('CMS_Editor');
        document.body.appendChild(el);
        plugin.create(el, false, content, {options: {}}, () => {});
        return plugin._editors[id];
    }

    // Helper: wait for requestAnimationFrame to fire (jsdom uses setTimeout for RAF)
    const flush = () => new Promise(resolve => setTimeout(resolve, 20));

    it('marks zero-width plugins with .cms-plugin-empty and inserts a placeholder', async () => {
        // jsdom doesn't compute layout, so offsetWidth is always 0 — every plugin
        // will be detected as "empty" and get the placeholder.
        const content =
            '<p><cms-plugin id="42" type="LinkPlugin" render-plugin="true"></cms-plugin></p>';
        const editor = createEditor('test-empty-plugin', content);

        await flush();

        const cmsPluginEl = editor.options.element.querySelector('cms-plugin');
        expect(cmsPluginEl).not.toBeNull();
        expect(cmsPluginEl.classList.contains('cms-plugin-empty')).toBe(true);

        const placeholder = cmsPluginEl.querySelector('.cms-plugin-placeholder');
        expect(placeholder).not.toBeNull();
    });

    it('uses the plugin-specific icon if available via getInstalledPlugins', async () => {
        // Override the default empty stub with a plugin that has a custom icon
        const customIcon = '<svg class="custom-icon"><path/></svg>';
        window.CMS_Editor.getInstalledPlugins = () => [
            { value: 'LinkPlugin', name: 'Link', icon: customIcon },
        ];

        const content =
            '<p><cms-plugin id="1" type="LinkPlugin" render-plugin="true"></cms-plugin></p>';
        const editor = createEditor('test-custom-icon', content);

        await flush();

        const placeholder = editor.options.element.querySelector('.cms-plugin-placeholder');
        expect(placeholder).not.toBeNull();
        expect(placeholder.querySelector('.custom-icon')).not.toBeNull();
    });

    it('falls back to the generic puzzle icon when no plugin-specific icon is available', async () => {
        // Default beforeEach stub returns an empty plugin list
        const content =
            '<p><cms-plugin id="2" type="UnknownPlugin" render-plugin="true"></cms-plugin></p>';
        const editor = createEditor('test-fallback-icon', content);

        await flush();

        const placeholder = editor.options.element.querySelector('.cms-plugin-placeholder');
        expect(placeholder).not.toBeNull();
        // Falls back to the bi-puzzle SVG from TiptapToolbar.CMSPlugins.icon
        expect(placeholder.querySelector('svg.bi-puzzle')).not.toBeNull();
    });

    it('placeholder is a real DOM child so the selection outline can wrap it', async () => {
        const content =
            '<p><cms-plugin id="3" type="LinkPlugin" render-plugin="true"></cms-plugin></p>';
        const editor = createEditor('test-selection-wrap', content);

        await flush();

        const cmsPluginEl = editor.options.element.querySelector('cms-plugin');
        const placeholder = cmsPluginEl.querySelector('.cms-plugin-placeholder');

        // The placeholder must be a direct child element (not a pseudo-element)
        // so the existing `.ProseMirror-selectednode > *` outline rule applies.
        expect(placeholder.parentElement).toBe(cmsPluginEl);
        expect(Array.from(cmsPluginEl.children)).toContain(placeholder);
    });
});
