import CmsTextEditor from '../../private/js/cms.texteditor';

describe('plain text editor Space handling', () => {
    let editor;
    let field;
    let accordionKey;

    beforeEach(() => {
        document.body.innerHTML = '<section><div class="cms-plugin-app-model-title-1">Text</div></section>';
        field = document.querySelector('div');
        accordionKey = jest.fn();
        for (const name of ['keydown', 'keypress', 'keyup']) {
            field.parentElement.addEventListener(name, accordionKey);
        }
        // Construct directly: Space protection belongs to CmsTextEditor and
        // must work without a CMS manager or inline-wrapper registration.
        editor = new CmsTextEditor(field, {}, jest.fn());
    });

    afterEach(() => editor.destroy());

    it.each([
        {key: ' ', code: 'Space'},
        {key: 'Spacebar'},
        {key: 'Unidentified', code: 'Space'},
    ])('keeps Space events local without preventing text input (%j)', init => {
        for (const name of ['keydown', 'keypress', 'keyup']) {
            const event = new KeyboardEvent(name, {...init, bubbles: true, cancelable: true});
            field.dispatchEvent(event);
            expect(event.defaultPrevented).toBe(name === 'keyup');
        }
        expect(accordionKey).not.toHaveBeenCalled();
    });

    it('allows other keys to propagate', () => {
        field.dispatchEvent(new KeyboardEvent('keydown', {key: 'a', bubbles: true}));
        expect(accordionKey).toHaveBeenCalledTimes(1);
    });

    it('removes all Space handlers when destroyed', () => {
        editor.destroy();
        for (const name of ['keydown', 'keypress', 'keyup']) {
            field.dispatchEvent(new KeyboardEvent(name, {key: ' ', code: 'Space', bubbles: true}));
        }
        expect(accordionKey).toHaveBeenCalledTimes(3);
    });
});
