/* eslint-env es11, jest */
/* jshint esversion: 11 */
/* global window, document, require */

// Demo contrib extension: strip Microsoft Office markup on paste.
//
// The extension only removes what would actually survive ProseMirror's
// schema-based parser: `mso-*` declarations inside `style` and `Mso*`
// names inside `class`. Everything else Office emits — namespaced
// tags, <xml>/<style>/<meta>/<link> wrappers, HTML comments including
// conditional comments and StartFragment/EndFragment markers — is
// dropped by the schema and does not need explicit stripping. Tests
// below focus on the two leaks that matter.
//
// Order matters: the cms.tiptap import below sets up the registry on
// window, and only then can the IIFE in cms.officepaste.js find it.
import '../../private/js/cms.editor';
import '../../private/js/cms.tiptap';

describe('Office paste dynamic extension (contrib/officepaste)', () => {
    let plugin;

    beforeAll(() => {
        require('../../djangocms_text/contrib/officepaste/static/djangocms_text/tiptap_plugins/cms.officepaste.js');
    });

    beforeEach(() => {
        document.body.innerHTML = `
            <script id="cms-editor-cfg" type="application/json">{"some": "config"}</script>
        `;
        window.dispatchEvent(new Event('DOMContentLoaded'));
        plugin = window.cms_editor_plugin;
    });

    afterEach(() => {
        for (const id of Object.keys(plugin._editors)) {
            plugin.destroyEditor(document.getElementById(id));
        }
    });

    function createEditor(id, content = '') {
        const el = document.createElement('textarea');
        el.id = id;
        el.classList.add('CMS_Editor');
        document.body.appendChild(el);
        plugin.create(el, false, content, {options: {}}, () => {});
        return plugin._editors[id];
    }

    function strip(editor, html) {
        return editor.storage.officePaste.strip(html);
    }

    it('exposes the strip helper on editor storage', () => {
        const editor = createEditor('op-storage');
        expect(typeof editor.storage.officePaste.strip).toBe('function');
    });

    it('strips mso-* declarations from style attributes', () => {
        const editor = createEditor('op-style');
        const out = strip(editor, '<p style="mso-style-name: Foo; color: red;">x</p>');
        expect(out).not.toMatch(/mso-/i);
        expect(out).toContain('color: red');
    });

    it('removes the style attribute entirely when only mso-* declarations remain', () => {
        const editor = createEditor('op-style-only');
        const out = strip(editor, '<p style="mso-style-name: Foo">x</p>');
        expect(out).not.toContain('style=');
    });

    it('removes Mso* classes but keeps other classes', () => {
        const editor = createEditor('op-class');
        const out = strip(editor, '<p class="MsoNormal important">x</p>');
        expect(out).toContain('class="important"');
        expect(out).not.toMatch(/Mso/);
    });

    it('removes the class attribute entirely when only Mso classes remain', () => {
        const editor = createEditor('op-class-only');
        const out = strip(editor, '<p class="MsoNormal MsoBodyText">x</p>');
        expect(out).not.toContain('class=');
    });

    it('does not touch attribute values that happen to contain "Mso" or "mso-"', () => {
        const editor = createEditor('op-false-positive');
        // Regex-based stripping would wrongly match inside `title`.
        const html = '<p title="class=&quot;MsoNormal&quot;">x</p>';
        const out = strip(editor, html);
        expect(out).toContain('MsoNormal');
    });

    it('passes non-Office HTML through unchanged (modulo serialization)', () => {
        const editor = createEditor('op-plain');
        const html = '<p><strong>Hello</strong> <em>world</em></p>';
        expect(strip(editor, html)).toBe(html);
    });

    it('returns non-string input unchanged', () => {
        const editor = createEditor('op-nonstring');
        expect(strip(editor, null)).toBe(null);
        expect(strip(editor, undefined)).toBe(undefined);
        expect(strip(editor, '')).toBe('');
    });

    it('is wired into the ProseMirror paste pipeline', () => {
        const editor = createEditor('op-wire');
        let transformFn = null;
        for (const p of editor.view.state.plugins) {
            if (p.props && typeof p.props.transformPastedHTML === 'function') {
                transformFn = p.props.transformPastedHTML;
                break;
            }
        }
        expect(transformFn).not.toBeNull();
        const result = transformFn('<p class="MsoNormal">x</p>', editor.view);
        expect(result).not.toMatch(/Mso/);
    });
});
