/* eslint-env es11 */
/* jshint esversion: 11 */
/* global window, document */

import CMSEditor from '../../private/js/cms.editor';
import CMSTipTapPlugin from '../../private/js/cms.tiptap';


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
