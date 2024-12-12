import pytest
from cms.utils.urlutils import admin_reverse
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
            console_errors.append(msg.text)

    page.on("console", handle_console_message)

    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")

    editor = page.locator(".cke.cke_reset")
    expect(editor).to_be_visible()  # Editor

    expect(page.locator(".cke_top.cke_reset_all")).to_be_visible()  # its menu bar
    expect(page.locator(".cke_button.cke_button__bold")).to_be_visible()  # a button in the menu bar

    assert not console_errors, f"Console errors found: {console_errors}"
