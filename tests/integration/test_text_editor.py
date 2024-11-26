from unittest import skipIf

import pytest
from cms.utils.urlutils import admin_reverse
from playwright.sync_api import expect

from tests.fixtures import DJANGO_CMS4


def login(page, live_server):
    page.goto(f"{live_server.url}/en/admin/")
    page.fill("input[name='username']", "admin")
    page.fill("input[name='password']", "admin")
    page.click("input[type='submit']")
    # Ensure success
    expect(page.locator("h1", has_text="Site administration")).to_be_visible()


def get_pagecontent(cms_page):
    return cms_page.pagecontent_set(manager="admin_manager").current_content(language="en").first()


@pytest.mark.django_db
@skipIf(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_editor_loads(live_server, page, text_plugin):
    """Test that tiptap editor loads and initializes properly"""
    # Navigate to the text plugin add view
    login(page, live_server)

    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")
    editor = page.locator(".ProseMirror.tiptap")

    expect(editor).to_be_visible()  # Editor
    expect(page.locator('div[role="menubar"]')).to_be_visible()  # its menu bar
    expect(page.locator('button[title="Bold"]')).to_be_visible()  # a button in the menu bar

    assert editor.inner_text() == "Test content"


@pytest.mark.django_db
@skipIf(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def _test_text_plugin_saves(live_server, page):
    """Test that text plugin content saves correctly"""
    # Navigate and login (reusing steps from above)
    page.goto(f"{live_server.url}/admin/cms/page/add/")
    page.fill("input[name='username']", "admin")
    page.fill("input[name='password']", "admin")
    page.click("input[type='submit']")

    # Add and fill text plugin
    page.click("text=Add plugin")
    page.click("text=Text")

    iframe_locator = page.frame_locator(".cke_wysiwyg_frame")
    iframe_locator.locator("body").fill("Content to save")

    # Save the plugin
    page.click("text=Save")

    # Verify saved content
    page.reload()
    saved_content = iframe_locator.locator("body").inner_text()
    assert saved_content == "Content to save"
