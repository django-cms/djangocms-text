import '../../private/js/cms.editor';
import '../../private/js/cms.tiptap';
import LinkField from '../../private/js/cms.linkfield';
import CmsDialog, {CmsForm} from '../../private/js/cms.dialog';

const key = (element, name, options = {}) => {
    const event = new KeyboardEvent('keydown', {key: name, bubbles: true, cancelable: true, ...options});
    element.dispatchEvent(event);
    return event;
};
const tick = () => new Promise(resolve => setTimeout(resolve, 40));

describe('editor accessibility', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div class="cms" id="cms-top"></div>';
        window.dispatchEvent(new Event('DOMContentLoaded'));
        // jsdom has no layout APIs for DOM ranges used by ProseMirror scrolling.
        Range.prototype.getClientRects = () => [];
        Range.prototype.getBoundingClientRect = () => new DOMRect();
        window.cms_editor_plugin.lang = Object.fromEntries(
            ['Bold', 'Italic', 'Format', 'Paragraph', 'Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6']
                .map(title => [title, {title, icon: `<span>${title}</span>`}])
        );
    });
    afterEach(() => {
        const plugin = window.cms_editor_plugin;
        for (const id of Object.keys(plugin._editors)) plugin.destroyEditor(id);
        window.CMS_Editor._generic_editors = {};
        window.CMS_Editor._editor_settings = {};
        jest.restoreAllMocks();
    });

    async function createEditor() {
        const form = document.createElement('form');
        form.innerHTML = '<label for="body">Article body</label><textarea id="body" aria-describedby="help" required></textarea><p id="help">Enter your article</p>';
        document.body.appendChild(form);
        const source = form.querySelector('textarea');
        const plugin = window.cms_editor_plugin;
        plugin.create(source, false, '<p>Hello</p>', {options: {toolbar: ['Bold', 'Italic', 'Format']}}, () => {});
        await tick();
        return plugin._editors.body;
    }

    it('preserves the field name, help text, required state and label activation', async () => {
        const editor = await createEditor();
        const editable = editor.view.dom;
        expect(editable).toHaveAccessibleName('Article body');
        expect(editable).toHaveAccessibleDescription('Enter your article');
        expect(editable).toHaveAttribute('aria-multiline', 'true');
        expect(editable).toHaveAttribute('aria-required', 'true');
        document.querySelector('label').click();
        expect(editable).toHaveFocus();
    });

    it('supports toolbar entry, roving focus, dropdown navigation and dismissal', async () => {
        const editor = await createEditor();
        editor.view.dom.focus();
        key(editor.view.dom, 'F10', {altKey: true});
        const toolbar = editor.options.topToolbar;
        const bold = toolbar.querySelector('[data-action="Bold"]');
        const italic = toolbar.querySelector('[data-action="Italic"]');
        expect(toolbar).toHaveAttribute('role', 'toolbar');
        expect(toolbar).toHaveClass('cms-text-toolbar');
        expect(toolbar).not.toHaveClass('cms-toolbar');
        expect(toolbar).toHaveAccessibleName();
        expect(bold).toHaveFocus();
        key(bold, 'ArrowRight');
        expect(italic).toHaveFocus();
        key(italic, 'End');
        const toggle = toolbar.querySelector('.dropdown-toggle');
        expect(toggle).toHaveFocus();
        key(toggle, 'ArrowDown');
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        const items = toolbar.querySelectorAll('.dropdown-content button');
        expect(items[0]).toHaveFocus();
        key(items[0], 'ArrowDown');
        expect(items[1]).toHaveFocus();
        key(items[1], 'Escape');
        expect(toggle).toHaveFocus();
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        key(toggle, 'Escape');
        await tick();
        expect(editor.view.dom).toHaveFocus();
    });

    it('exposes the pressed state of formatting buttons', async () => {
        const editor = await createEditor();
        editor.commands.setTextSelection({from: 1, to: 4});
        editor.commands.toggleBold();
        await tick();
        expect(editor.options.topToolbar.querySelector('[data-action="Bold"]')).toHaveAttribute('aria-pressed', 'true');
    });

    it.each(['pointer', 'keyboard'])('skips disabled choices when a menu opens via %s', async method => {
        const editor = await createEditor();
        const toolbar = editor.options.topToolbar;
        const toggle = toolbar.querySelector('.dropdown-toggle');
        const items = toolbar.querySelectorAll('.dropdown-content button');
        items[0].disabled = true;
        items[2].disabled = true;
        editor.view.dom.focus();
        if (method === 'pointer') toggle.dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 1}));
        else {
            toggle.focus();
            key(toggle, 'ArrowDown');
        }
        expect(items[1]).toHaveFocus();
        key(items[1], 'ArrowDown');
        expect(items[3]).toHaveFocus();
        key(items[3], 'ArrowUp');
        expect(items[1]).toHaveFocus();
        key(items[1], 'ArrowRight');
        const bold = toolbar.querySelector('[data-action="Bold"]');
        expect(bold).toHaveFocus();
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        key(bold, 'ArrowLeft');
        expect(toggle).toHaveFocus();
        key(toggle, 'ArrowUp');
        expect(items[items.length - 1]).toHaveFocus();
    });

    it('keeps focus on the menu button when all choices are disabled', async () => {
        const editor = await createEditor();
        const toolbar = editor.options.topToolbar;
        const toggle = toolbar.querySelector('.dropdown-toggle');
        toolbar.querySelectorAll('.dropdown-content button').forEach(button => { button.disabled = true; });
        editor.view.dom.focus();
        toggle.click();
        expect(toggle).toHaveFocus();
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        key(toggle, 'ArrowLeft');
        expect(toolbar.querySelector('[data-action="Italic"]')).toHaveFocus();
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it.each(['preventDefault', 'stopPropagation'])('lets backend popups consume Escape via %s', method => {
        const parent = document.createElement('section');
        parent.innerHTML = '<div id="inline" class="cms-editor-inline-wrapper cms-plugin-app-model-field-1" data-cms-type="CharField">Text</div>';
        document.body.appendChild(parent);
        const el = parent.firstElementChild;
        window.CMS_Editor.init(el);
        el.focus();
        el.addEventListener('keydown', event => event[method]());
        key(el, 'Escape');
        expect(el).toHaveFocus();
        window.CMS_Editor._generic_editors[el.id].destroy();
    });

    it('blurs the inline field without focusing its parent on Escape', () => {
        const parent = document.createElement('section');
        parent.innerHTML = '<div id="inline" class="cms-editor-inline-wrapper cms-plugin-app-model-field-1" data-cms-type="CharField">Text</div>';
        document.body.appendChild(parent);
        const el = parent.firstElementChild;
        window.CMS_Editor.init(el);
        jest.spyOn(window.CMS_Editor, 'saveData').mockImplementation(() => {});
        el.focus();
        key(el, 'Escape', {isComposing: true});
        expect(el).toHaveFocus();
        key(el, 'Escape');
        expect(el).not.toHaveFocus();
        expect(parent).not.toHaveFocus();
        expect(parent).not.toHaveAttribute('tabindex');
        window.CMS_Editor._generic_editors[el.id].destroy();
    });

    it('names form dialogs and restores focus after keyboard cancellation', () => {
        document.body.innerHTML += '<button id="opener">Edit link</button><div id="wrapper"></div>';
        const opener = document.getElementById('opener');
        opener.focus();
        const form = new CmsForm(document.getElementById('wrapper'), jest.fn(), jest.fn());
        form.formDialog('<label for="url">URL</label><input id="url">', {title: 'Edit link'});
        form.dialog.show = () => form.dialog.setAttribute('open', '');
        form.open();
        expect(form.dialog).toHaveAccessibleName('Edit link');
        expect(form.dialog.querySelector('input')).toHaveFocus();
        expect(form.dialog.querySelector('.submit')).toHaveAccessibleName('Save');
        expect(form.dialog.querySelector('.cancel').tagName).toBe('BUTTON');
        key(form.dialog.querySelector('input'), 'Escape');
        expect(opener).toHaveFocus();
        expect(form.dialog).not.toBeInTheDocument();
    });

    it('names plugin dialogs and supplies a keyboard accessible close button', () => {
        const el = document.createElement('div');
        el.id = 'plugin';
        document.body.appendChild(el);
        window.CMS_Editor._editor_settings.plugin = {lang: {edit: 'Edit plugin', toolbar: 'Text'}};
        jest.spyOn(window.CMS_Editor, 'getSettings').mockReturnValue(window.CMS_Editor._editor_settings.plugin);
        const dialog = new CmsDialog(el, jest.fn(), jest.fn());
        const iframe = dialog.pluginDialog();
        dialog.dialog.setAttribute('open', '');
        expect(dialog.dialog).toHaveAccessibleName('Edit plugin');
        expect(iframe).toHaveAttribute('title', 'Edit plugin');
        expect(dialog.dialog.querySelector('.cms-modal-close')).toHaveAccessibleName('Close');
        dialog.close();
    });
});

describe('accessible link suggestions', () => {
    let field;
    beforeEach(async () => {
        document.body.innerHTML = '<form><label for="url">URL</label><input id="url" name="href" value="https://example.com"><input name="href_select"></form>';
        global.IntersectionObserver = jest.fn(() => ({observe: jest.fn(), disconnect: jest.fn()}));
        field = new LinkField(document.getElementById('url'), {});
        field.inputElement.focus();
        await tick();
        field.showResults({results: [{id: '1', text: 'First', url: '/first/'}, {id: '2', text: 'Second', url: '/second/'}]});
        field.openDropdown();
    });
    afterEach(() => { field.closeDropdown(); });

    it('retains the label and exposes popup relationships', () => {
        expect(field.inputElement).toHaveAccessibleName('URL');
        expect(field.inputElement).toHaveAttribute('role', 'combobox');
        expect(field.inputElement).toHaveAttribute('aria-controls', field.dropdown.id);
        expect(field.inputElement).toHaveAttribute('aria-expanded', 'true');
        document.querySelector('label').click();
        expect(field.inputElement).toHaveFocus();
    });

    it('navigates results, selects with Enter, and retains focus', () => {
        key(field.inputElement, 'ArrowDown');
        key(field.inputElement, 'ArrowDown');
        const active = field.dropdown.querySelector('[aria-selected="true"]');
        expect(active.textContent).toBe('Second');
        expect(field.inputElement).toHaveAttribute('aria-activedescendant', active.id);
        key(field.inputElement, 'Enter');
        expect(field.inputElement.value).toBe('Second');
        expect(field.urlElement.value).toBe('/second/');
        expect(field.selectElement.value).toBe('2');
        expect(field.inputElement).toHaveFocus();
        expect(field.inputElement).toHaveAttribute('aria-expanded', 'false');
        expect(field.inputElement).not.toHaveAttribute('aria-activedescendant');
    });

    it('dismisses suggestions with Escape without closing the surrounding form', () => {
        const parentKey = jest.fn();
        field.form.addEventListener('keydown', parentKey);
        key(field.inputElement, 'Escape');
        expect(field.inputElement).toHaveFocus();
        expect(field.inputElement).toHaveAttribute('aria-expanded', 'false');
        expect(parentKey).not.toHaveBeenCalled();
    });
});
