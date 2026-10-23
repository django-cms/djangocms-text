import '../../private/js/cms.editor';
import '../../private/js/cms.tiptap';

describe('Escape in inline editors', () => {
    let destroy;

    beforeEach(() => {
        document.body.innerHTML = '<div id="field" class="cms-plugin-app-model-field-1 cms-editor-inline-wrapper"></div>';
        window.dispatchEvent(new Event('DOMContentLoaded'));
    });

    afterEach(() => {
        destroy?.();
        window.CMS_Editor._generic_editors = {};
        window.CMS_Editor._editor_settings = {};
        jest.restoreAllMocks();
        window.getSelection().removeAllRanges();
    });

    it.each(['CKEditor 4', 'CKEditor 5'])(
        'lets %s handle Escape before falling back to blur', (backend) => {
            const manager = window.CMS_Editor;
            const plugin = window.cms_editor_plugin;
            const el = document.getElementById('field');
            const save = jest.spyOn(manager, 'saveData').mockImplementation(() => {});
            const backendKey = jest.fn();
            let editable;
            // Model the backend contract: CKEditor 4 edits the wrapper itself;
            // CKEditor 5 may place its editable inside it. Both save on focus loss.
            jest.spyOn(plugin, 'create').mockImplementation((el, modal, content, settings, onSave) => {
                editable = backend === 'CKEditor 4' ? el : el.appendChild(document.createElement('div'));
                editable.setAttribute('contenteditable', 'true');
                editable.textContent = 'Changed text';
                editable.addEventListener('blur', onSave);
                editable.addEventListener('keydown', backendKey);
                plugin._editors[el.id] = {};
            });
            destroy = () => { delete plugin._editors[el.id]; };
            el.dataset.cmsType = 'HTMLField';
            manager._editor_settings[el.id] = {options: {}};
            manager.init(el);
            editable.focus();
            const range = document.createRange();
            range.selectNodeContents(editable);
            window.getSelection().addRange(range);

            editable.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Escape', bubbles: true, cancelable: true,
            }));

            expect(document.activeElement).not.toBe(editable);
            expect(window.getSelection().rangeCount).toBe(0);
            expect(editable.textContent).toBe('Changed text');
            expect(save).toHaveBeenCalledTimes(1);
            expect(backendKey).toHaveBeenCalledTimes(1);
        }
    );

    it.each([
        ['CharField', 'Text'], ['TextPlugin', 'Text'], ['HTMLField', 'Text'],
        ['CharField', ''], ['TextPlugin', ''], ['HTMLField', ''],
    ])(
        'deselects %s and saves edits on blur (original: %j)', async (type, original) => {
            const el = document.getElementById('field');
            const manager = window.CMS_Editor;
            const save = jest.spyOn(manager, 'saveData').mockImplementation(() => {});
            el.dataset.cmsType = type;
            el.innerHTML = original ? `<p>${original}</p>` : '';
            manager._editor_settings[el.id] = {options: {}};
            manager.init(el);
            let editable;
            if (type === 'CharField') {
                const editor = manager._generic_editors[el.id];
                destroy = () => editor.destroy();
                editable = el;
                editable.focus();
                el.textContent = 'Changed text';
                el.dispatchEvent(new Event('input'));
            } else {
                const plugin = window.cms_editor_plugin;
                const editor = plugin._editors[el.id];
                destroy = () => plugin.destroyEditor(el);
                editable = editor.view.dom;
                editable.focus();
                editor.commands.setContent('<p>Changed text</p>');
            }
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(editable);
            selection.removeAllRanges();
            selection.addRange(range);
            expect(document.activeElement).toBe(editable);
            expect(selection.toString()).toBe('Changed text');

            const event = new KeyboardEvent('keydown', {
                key: 'Escape', bubbles: true, cancelable: true,
            });
            editable.dispatchEvent(event);

            expect(event.defaultPrevented).toBe(true);
            expect(document.activeElement).not.toBe(editable);
            expect(selection.rangeCount).toBe(0);
            expect(editable.textContent).toBe('Changed text');
            expect(el.dataset.changed).toBe('true');
            await new Promise(resolve => setTimeout(resolve, 250));
            expect(save).toHaveBeenCalledTimes(1);
        }
    );
});
