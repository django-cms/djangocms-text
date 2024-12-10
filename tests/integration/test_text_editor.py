import pytest
from cms.utils.urlutils import admin_reverse
from playwright.sync_api import expect

from tests.fixtures import DJANGO_CMS4
from tests.integration.utils import login


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_editor_loads(live_server, page, text_plugin, superuser):
    """Test that tiptap editor loads and initializes properly"""
    # Navigate to the text plugin add view
    login(live_server, page, superuser)

    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")

    editor = page.locator(".cms-editor-inline-wrapper.fixed")
    expect(editor).to_be_visible()  # Editor

    tiptap = page.locator(".ProseMirror.tiptap")
    expect(tiptap).to_be_visible()  # Editor

    expect(page.locator('div[role="menubar"]')).to_be_visible()  # its menu bar
    expect(page.locator('button[title="Bold"]')).to_be_visible()  # a button in the menu bar

    assert tiptap.inner_text() == "Test content"
