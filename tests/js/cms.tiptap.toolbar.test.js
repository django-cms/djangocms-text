import TiptapToolbar from "../../private/js/tiptap_plugins/cms.tiptap.toolbar";
import CMSEditor from '../../private/js/cms.editor';
import CMSTipTapPlugin from '../../private/js/cms.tiptap';

describe('Tiptap toolbar items', () => {
    let editor;

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="cms-editor-cfg">{"some": "config"}</div>
            <textarea class="CMS_Editor" id="editor1"></textarea>
        `;
        editor = window.CMS_Editor;
    });

    afterEach(() => {
        editor.destroyAll();
    });

    it('initializes a single editor', () => {
        const el = document.getElementById('editor1');
        editor.init(el);
        expect(editor._editors.length).toBe(1);
    });

    it('can execute all commands', () => {
        const el = document.getElementById('editor1');
        editor = window.CMS_Editor
        editor.init(el);
        const tiptap = window.cms_editor_plugin._editors.editor1;

        expect(tiptap).toBeDefined();

        for (const item of Object.keys(TiptapToolbar)) {
            const toolbarItem = TiptapToolbar[item];
            if (item !== 'Link' && item !== 'CMSPlugins' && toolbarItem.enabled && toolbarItem.enabled(tiptap)) {
                try {
                    toolbarItem.action(tiptap);
                } catch (e) {
                    throw new Error(`failed command ${item}: ${e}`);
                }
            }
        }
    });

});
