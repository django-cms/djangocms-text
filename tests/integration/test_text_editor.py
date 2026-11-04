import pytest

try:
    from cms.utils.urlutils import admin_reverse
except ModuleNotFoundError:

    def admin_reverse(viewname, args=None, kwargs=None, current_app=None):
        from django.urls import reverse

        return reverse(f"admin:{viewname}", args, kwargs, current_app)


from playwright.sync_api import expect

from tests.fixtures import DJANGO_CMS4
from tests.integration.utils import get_pagecontent, login


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_editor_loads(live_server, page, text_plugin, superuser):
    """Test that tiptap editor loads and initializes properly"""
    # Navigate to the text plugin add view
    login(live_server, page, superuser)

    console_errors = []

    def handle_console_message(msg):
        if msg.type == "error":
            console_errors.append(f"{msg.text}: {msg.location} - {msg.args}")

    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")

    editor = page.locator(".cms-editor-inline-wrapper.fixed")
    expect(editor).to_be_visible()  # Editor

    tiptap = page.locator(".ProseMirror.tiptap")
    expect(tiptap).to_be_visible()  # Editor

    expect(page.locator('div[role="toolbar"]')).to_be_visible()  # its menu bar
    expect(page.locator('button[title="Bold"]')).to_be_visible()  # a button in the menu bar

    content = tiptap.locator("> :not(div)")  # only look at content
    assert content.inner_text() == "Test content"
    assert not console_errors, f"Console errors found: {console_errors}"


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_editor_keyboard_accessibility(live_server, page, text_plugin, superuser):
    login(live_server, page, superuser)
    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")
    editable = page.get_by_role("textbox").filter(has=page.locator("p"))
    expect(editable).to_have_attribute("aria-multiline", "true")
    assert editable.get_attribute("aria-label") or editable.get_attribute("aria-labelledby")
    editable.focus()
    toolbar = page.get_by_role("toolbar")
    expect(toolbar).to_be_visible()
    editable.press("Alt+F10")
    first = toolbar.locator("button:visible:not([disabled])").first
    expect(first).to_be_focused()
    first.press("ArrowRight")
    assert toolbar.evaluate("el => el.contains(document.activeElement)")
    assert not first.evaluate("el => el === document.activeElement")

    toggle = toolbar.locator(".dropdown-toggle").first
    toggle.focus()
    toggle.press("Enter")
    expect(toggle).to_have_attribute("aria-expanded", "true")
    option = toggle.locator("..").locator(".dropdown-content button:not([disabled])").first
    expect(option).to_be_focused()
    option.press("Escape")
    expect(toggle).to_be_focused()
    expect(toggle).to_have_attribute("aria-expanded", "false")
    toggle.press("Escape")
    expect(editable).to_be_focused()

    link_button = page.get_by_role("button", name="Link", exact=True)
    link_button.focus()
    link_button.press("Enter")
    dialog = page.locator(".cms-form-dialog")
    expect(dialog).to_be_visible()
    expect(dialog).to_have_attribute("aria-label", "Link")
    dialog.get_by_role("button", name="Cancel", exact=True).click()
    expect(dialog).to_have_count(0)
    expect(link_button).to_be_focused()

    editable.focus()
    toggle.click()
    expect(toggle).to_have_attribute("aria-expanded", "true")
    editable.focus()
    expect(editable).to_be_focused()
    editable.press("Escape")
    expect(toggle).to_have_attribute("aria-expanded", "false")
    expect(editable).to_be_focused()

    editable.focus()
    editable.press("ControlOrMeta+a")
    bold = toolbar.get_by_role("button", name="Bold", exact=True)
    bold.focus()
    bold.press("Enter")
    expect(editable.locator("strong")).to_have_text("Test content")
    expect(editable.locator("p")).to_have_count(1)


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_inline_block_toolbar_keyboard(live_server, page, text_plugin, superuser):
    login(live_server, page, superuser)
    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")
    expect(page.get_by_role("toolbar")).to_be_visible()
    page.evaluate("""() => {
        const wrapper = document.createElement('div');
        wrapper.id = 'inline-a11y';
        wrapper.className = 'cms-editor-inline-wrapper';
        wrapper.dataset.cmsType = 'TextPlugin';
        wrapper.style.cssText = 'margin: 100px 60px; min-height: 100px';
        wrapper.innerHTML = '<p>Inline text</p>';
        document.body.appendChild(wrapper);
        window.CMS_Editor.init(wrapper);
    }""")
    wrapper = page.locator("#inline-a11y")
    editable = wrapper.get_by_role("textbox")
    editable.focus()
    editable.press("Alt+F10")
    inline_toolbar = page.locator('[role="toolbar"]').last
    first_main = inline_toolbar.locator("button:visible:not([disabled])").first
    expect(first_main).to_be_focused()
    # Use the keyboard directly: Locator.press() refocuses its target and can
    # hide a focus-loss bug. Cross the inline editor's delayed blur handling.
    page.wait_for_timeout(300)
    top_controls = inline_toolbar.locator("button:visible:not([disabled])")
    for index in range(1, min(top_controls.count(), 5)):
        page.keyboard.press("ArrowRight")
        expect(top_controls.nth(index)).to_be_focused()
    for index in reversed(range(min(top_controls.count(), 5) - 1)):
        page.keyboard.press("ArrowLeft")
        expect(top_controls.nth(index)).to_be_focused()
    first_main.press("Escape")
    expect(editable).to_be_focused()
    trigger = wrapper.get_by_role("button", name="Block actions", exact=True)
    expect(trigger).to_be_visible()
    trigger.focus()
    trigger.press("Alt+F10")
    expect(first_main).to_be_focused()
    first_main.press("Escape")
    expect(editable).to_be_focused()
    trigger.focus()
    trigger.press("ArrowDown")
    expect(trigger).to_have_attribute("aria-expanded", "true")
    first = wrapper.locator(".cms-block-dropdown button:visible:not([disabled])").first
    expect(first).to_be_focused()
    block_choices = wrapper.locator(".cms-block-dropdown button:visible:not([disabled])")
    disabled = block_choices.nth(1)
    disabled.evaluate("""el => {
        el._cachedRepr = {...el._cachedRepr, enabled: () => false};
        el.disabled = true;
    }""")
    for index in range(1, min(block_choices.count(), 5)):
        page.keyboard.press("ArrowRight")
        expect(block_choices.nth(index)).to_be_focused()
    for index in reversed(range(min(block_choices.count(), 5) - 1)):
        page.keyboard.press("ArrowLeft")
        expect(block_choices.nth(index)).to_be_focused()
    page.keyboard.press("ArrowLeft")
    expect(block_choices.last).to_be_focused()
    page.keyboard.press("ArrowRight")
    expect(first).to_be_focused()
    expect(trigger).to_have_attribute("aria-expanded", "true")
    first.press("Escape")
    expect(trigger).to_be_focused()
    expect(trigger).to_have_attribute("aria-expanded", "false")
    trigger.press("Escape")
    expect(editable).to_be_focused()

    # Enter and Space in the embedded toolbar must activate controls without
    # reaching ProseMirror's text insertion handlers.
    for activation in ("Enter", "Space"):
        trigger.focus()
        trigger.press(activation)
        expect(trigger).to_have_attribute("aria-expanded", "true")
        paragraph = wrapper.locator('.cms-block-dropdown button[data-action="Paragraph"]')
        paragraph.focus()
        paragraph.press(activation)
        expect(editable).to_be_focused()
        expect(editable.locator("p")).to_have_count(1)
        expect(editable).to_have_text("Inline text")

    trigger.click()
    expect(trigger).to_have_attribute("aria-expanded", "true")
    editable.focus()
    expect(editable).to_be_focused()
    editable.press("Escape")
    expect(trigger).to_have_attribute("aria-expanded", "false")
    expect(editable).to_be_focused()
    editable.press("Escape")
    expect(editable).not_to_be_focused()


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_menu_navigation_with_disabled_first_choice(live_server, page, text_plugin, superuser):
    login(live_server, page, superuser)
    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")
    toolbar = page.get_by_role("toolbar")
    toggle = toolbar.get_by_role("button", name="Format", exact=True)
    menu = toggle.locator("..").locator(".dropdown-content")
    choices = menu.locator("button")
    expect(toggle).to_be_visible()
    expect(choices.first).to_have_attribute("aria-pressed", "true")
    choices.first.evaluate("""el => {
        el._cachedRepr = {...el._cachedRepr, enabled: () => false};
        el.disabled = true;
    }""")
    toggle.click()
    expect(choices.first).to_be_disabled()
    expect(choices.nth(1)).to_be_focused()
    assert choices.nth(1).evaluate("el => parseFloat(getComputedStyle(el).outlineWidth) > 0")
    choices.nth(1).press("ArrowDown")
    expect(choices.nth(2)).to_be_focused()
    choices.nth(2).press("ArrowUp")
    expect(choices.nth(1)).to_be_focused()
    choices.nth(1).press("ArrowLeft")
    expect(toggle).to_have_attribute("aria-expanded", "false")
    assert toolbar.evaluate("el => el.contains(document.activeElement)")
    page.keyboard.press("ArrowRight")
    expect(toggle).to_be_focused()
    toggle.press("ArrowDown")
    expect(choices.nth(1)).to_be_focused()
    choices.nth(1).press("End")
    expect(choices.last).to_be_focused()
    choices.last.press("ArrowDown")
    expect(choices.nth(1)).to_be_focused()
    choices.nth(1).press("Enter")
    expect(page.locator(".ProseMirror h1")).to_have_text("Test content")


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_text_color_swatches(live_server, page, text_plugin, superuser):
    login(live_server, page, superuser)
    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")
    toggle = page.get_by_role("toolbar").get_by_role("button", name="Text color", exact=True)
    toggle.click()
    menu = toggle.locator("..").locator(".dropdown-content")
    primary = menu.get_by_role("button", name="Primary", exact=True)
    danger = menu.get_by_role("button", name="Danger", exact=True)
    swatch = primary.locator(".cms-color-swatch")
    expect(swatch).to_have_css("background-color", "rgb(0, 0, 205)")
    expect(danger.locator(".cms-color-swatch")).to_have_css("background-color", "rgb(255, 0, 0)")
    color = swatch.evaluate("el => getComputedStyle(el).backgroundColor")
    assert color != danger.locator(".cms-color-swatch").evaluate("el => getComputedStyle(el).backgroundColor")
    box = primary.bounding_box()
    assert box["width"] >= 36 and box["height"] >= 36
    primary.hover()
    assert swatch.evaluate("el => getComputedStyle(el).backgroundColor") == color
    primary.focus()
    assert swatch.evaluate("el => getComputedStyle(el).backgroundColor") == color
    assert primary.evaluate("el => parseFloat(getComputedStyle(el).outlineWidth) > 0")


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_frontend_inline_toolbar_navigation(live_server, page, cms_page, text_plugin, superuser, settings):
    from copy import deepcopy

    from cms.toolbar.utils import get_object_edit_url

    templates = deepcopy(settings.TEMPLATES)
    templates[0]["OPTIONS"]["context_processors"].append("sekizai.context_processors.sekizai")
    settings.TEMPLATES = templates
    login(live_server, page, superuser)
    page.goto(f"{live_server.url}{get_object_edit_url(get_pagecontent(cms_page))}")
    editable = page.locator(".cms-editor-inline-wrapper .tiptap").first
    expect(editable).to_be_visible(timeout=10000)
    # Newer CMS versions claim .cms-toolbar keyboard events in capture phase.
    # The editor UI must have its own namespace so those keys reach its handler.
    page.evaluate("""() => {
        window.cmsToolbarKeyEvents = 0;
        document.addEventListener('keydown', event => {
            if (event.target.closest('.cms-toolbar') && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                window.cmsToolbarKeyEvents++;
                event.preventDefault();
                event.stopPropagation();
            }
        }, true);
    }""")
    editable.focus()
    page.keyboard.press("Alt+F10")
    toolbar = page.locator('.has-focused-editor [role="toolbar"]')
    controls = toolbar.locator("button:visible:not([disabled])")
    expect(controls.first).to_be_focused()
    page.wait_for_timeout(300)
    for index in range(1, min(controls.count(), 5)):
        page.keyboard.press("ArrowRight")
        expect(controls.nth(index)).to_be_focused()
    for index in reversed(range(min(controls.count(), 5) - 1)):
        page.keyboard.press("ArrowLeft")
        expect(controls.nth(index)).to_be_focused()
    assert page.evaluate("window.cmsToolbarKeyEvents") == 0


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_plain_text_space_does_not_toggle_accordion(live_server, page, text_plugin, superuser):
    login(live_server, page, superuser)
    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")
    expect(page.get_by_role("toolbar")).to_be_visible()
    page.evaluate("""() => {
        const accordion = document.createElement('button');
        accordion.type = 'button';
        accordion.id = 'space-accordion';
        accordion.tabIndex = 0;
        accordion.setAttribute('role', 'button');
        accordion.dataset.toggles = '0';
        accordion.addEventListener('click', () => {
            accordion.dataset.toggles = String(Number(accordion.dataset.toggles) + 1);
        });
        for (const name of ['keydown', 'keypress', 'keyup']) {
            accordion.addEventListener(name, event => {
                if (event.code === 'Space') accordion.dataset.toggles = String(Number(accordion.dataset.toggles) + 1);
            });
        }
        const wrapper = document.createElement('div');
        wrapper.id = 'space-field';
        wrapper.className = 'cms-editor-inline-wrapper cms-plugin-app-model-title-1';
        accordion.appendChild(wrapper);
        document.body.appendChild(accordion);
        new window.CMS_Editor.API.CmsTextEditor(wrapper, {}, () => {});
    }""")
    accordion = page.locator("#space-accordion")
    editable = page.locator("#space-field")
    editable.focus()
    page.keyboard.type("Hello world")
    expect(editable).to_have_text("Hello world")
    expect(accordion).to_have_attribute("data-toggles", "0")
    accordion.focus()
    page.keyboard.press("Space")
    assert int(accordion.get_attribute("data-toggles")) > 0
