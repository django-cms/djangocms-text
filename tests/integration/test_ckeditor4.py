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
def test_editor_saves(live_server, page, text_plugin, superuser, use_ckeditor4):
    """Test that tiptap editor loads and initializes properly"""
    # Navigate to the text plugin add view
    login(live_server, page, superuser)

    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")

    save_button = page.locator('input[type="submit"]')
    save_button.click()

    messagelist = page.locator("div.messagelist")
    assert '<div class="success"></div>' in messagelist.inner_html().strip()
