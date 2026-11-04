import json

import pytest

try:
    from cms.utils.urlutils import admin_reverse
except ModuleNotFoundError:

    def admin_reverse(viewname, args=None, kwargs=None, current_app=None):
        from django.urls import reverse

        return reverse(f"admin:{viewname}", args, kwargs, current_app)


from playwright.sync_api import expect

from tests.fixtures import DJANGO_CMS4
from tests.integration.utils import login


@pytest.fixture
def use_ckeditor4(settings):
    settings.TEXT_EDITOR = "djangocms_text.contrib.text_ckeditor4.ckeditor4"
    yield
    del settings.TEXT_EDITOR


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_editor_loads(live_server, page, text_plugin, superuser, use_ckeditor4):
    """Test that tiptap editor loads and initializes properly"""
    # Navigate to the text plugin add view
    login(live_server, page, superuser)

    console_errors = []

    def handle_console_message(msg):
        if msg.type == "error":
            console_errors.append(f"{msg.text}: {msg.location} - {msg.args}")

    page.on("console", handle_console_message)

    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")

    basepath = page.locator("script[data-ckeditor-basepath]").get_attribute("data-ckeditor-basepath")

    assert basepath == "/static/djangocms_text/vendor/ckeditor4/"

    editor = page.locator(".cke.cke_reset")
    expect(editor).to_be_visible()  # Editor

    cms_plugins_dropdown = page.locator("span.cke_button_label.cke_button__cmsplugins_label")
    expect(cms_plugins_dropdown).to_be_visible()  # CMS Plugins dropdown

    expect(page.locator(".cke_top.cke_reset_all")).to_be_visible()  # its menu bar
    expect(page.locator(".cke_button.cke_button__bold")).to_be_visible()  # a button in the menu bar

    assert not console_errors, f"Console errors found: {console_errors}"


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
@pytest.mark.parametrize(
    "attributes,os_theme,admin_brightness,expected",
    [
        ({"data-theme": "dark"}, "light", None, "brightness(3)"),
        ({"data-theme": "light"}, "dark", None, "brightness(1.35)"),
        ({"data-theme": "auto"}, "dark", None, "brightness(3)"),
        ({"data-theme": "auto"}, "light", None, "brightness(1.35)"),
        ({"data-color-scheme": "dark"}, "light", None, "brightness(3)"),
        ({"data-color-scheme": "auto"}, "dark", None, "brightness(3)"),
        ({"data-color-scheme": "light", "data-theme": "dark"}, "dark", None, "brightness(1.35)"),
        ({}, "dark", None, "brightness(3)"),
        ({}, "light", None, "brightness(1.35)"),
        ({"data-theme": "dark"}, "dark", "1.6", "brightness(2.4)"),
        ({"data-theme": "light"}, "light", "0.9", "brightness(1.35)"),
    ],
    ids=[
        "django-dark",
        "django-light",
        "django-auto-dark",
        "django-auto-light",
        "cms-dark",
        "cms-auto-dark",
        "cms-overrides-django",
        "os-dark",
        "os-light",
        "admin-brightness-dark",
        "admin-brightness-light",
    ],
)
def test_icon_brightness_without_admin_theme_variable(
    live_server, page, text_plugin, superuser, use_ckeditor4, attributes, os_theme, admin_brightness, expected
):
    # The function-scoped page fixture gives each theme case a fresh browser context.
    page.emulate_media(color_scheme=os_theme)
    login(live_server, page, superuser)
    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")
    icon = page.locator(".cke_button__bold_icon")
    expect(icon).to_be_visible()

    page.evaluate(
        """([attributes, brightness]) => {
            const root = document.documentElement;
            root.removeAttribute('data-theme');
            root.removeAttribute('data-color-scheme');
            for (const [name, value] of Object.entries(attributes)) root.setAttribute(name, value);
            // A CSS-wide initial value simulates an absent theme variable,
            // even when the installed admin stylesheet normally defines it.
            root.style.setProperty('--active-brightness', brightness || 'initial');
        }""",
        [attributes, admin_brightness],
    )
    try:
        expect(icon).to_have_css("filter", expected)
    except AssertionError as error:
        diagnostics = icon.evaluate(
            """icon => {
                const root = document.documentElement;
                const snapshot = element => {
                    const style = getComputedStyle(element);
                    return {
                        inlineStyle: element.getAttribute('style'),
                        activeBrightness: style.getPropertyValue('--active-brightness'),
                        fallbackBrightness: style.getPropertyValue('--cms-text-ckeditor-icon-brightness'),
                        filter: style.filter,
                    };
                };
                return {
                    theme: root.getAttribute('data-theme'),
                    colorScheme: root.getAttribute('data-color-scheme'),
                    prefersDark: matchMedia('(prefers-color-scheme: dark)').matches,
                    root: snapshot(root),
                    editor: snapshot(icon.closest('.cke')),
                    icon: snapshot(icon),
                };
            }"""
        )
        raise AssertionError(f"{error}\nBrightness diagnostics:\n{json.dumps(diagnostics, indent=2)}") from error


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_editor_saves(live_server, page, text_plugin, superuser, use_ckeditor4):
    """Test that tiptap editor loads and initializes properly"""
    # Navigate to the text plugin add view
    login(live_server, page, superuser)

    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")

    save_button = page.locator('input[type="submit"]')
    save_button.click()

    messagelist = page.locator("div.messagelist")
    assert '<div class="success"></div>' in messagelist.inner_html().strip()


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_editor_keeps_child_plugin_images(live_server, page, text_plugin, superuser, use_ckeditor4):
    """Rendered child plugin previews (e.g., images) must not be removed by CKEditor's content filter (#218)"""
    from cms.api import add_plugin

    from djangocms_text.utils import plugin_to_tag

    image_plugin = add_plugin(text_plugin.placeholder, "DummyImagePlugin", "en", target=text_plugin)
    text_plugin.body = f"<p>Before {plugin_to_tag(image_plugin)} after</p>"
    text_plugin.save()

    login(live_server, page, superuser)
    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")

    frame = page.frame_locator("iframe.cke_wysiwyg_frame")
    image = frame.locator(f'cms-plugin[id="{image_plugin.pk}"] picture img.dummy-image')
    expect(image).to_have_count(1)
    expect(image).to_have_attribute("alt", "Dummy image")
    expect(frame.locator(f'cms-plugin[id="{image_plugin.pk}"] picture source')).to_have_count(1)
    # Event handlers are still removed
    assert image.get_attribute("onerror") is None
    assert not page.evaluate("() => !!document.querySelector('iframe.cke_wysiwyg_frame').contentWindow.dummyImageXss")
