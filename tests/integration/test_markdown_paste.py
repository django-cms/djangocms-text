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


def clear_tiptap(page, tiptap):
    """Clear all content in the tiptap editor."""
    tiptap.click()
    # Use tiptap's commands API to clear all content reliably
    page.evaluate(
        """() => {
            const el = document.querySelector('.ProseMirror.tiptap');
            // Access the tiptap editor instance attached to the element
            if (el.editor) {
                el.editor.commands.clearContent();
            } else {
                el.innerHTML = '';
            }
        }"""
    )


def paste_text(page, text):
    """Paste plain text into the focused tiptap editor via a synthetic clipboard event."""
    page.evaluate(
        """(text) => {
            const clipboardData = new DataTransfer();
            clipboardData.setData('text/plain', text);
            const event = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: clipboardData,
            });
            document.querySelector('.ProseMirror.tiptap').dispatchEvent(event);
        }""",
        text,
    )


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_paste_markdown_converts_to_html(live_server, page, text_plugin, superuser):
    """Test that pasting markdown text into the tiptap editor converts it to HTML."""
    login(live_server, page, superuser)

    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")

    tiptap = page.locator(".ProseMirror.tiptap")
    expect(tiptap).to_be_visible()

    clear_tiptap(page, tiptap)
    paste_text(page, "## Hello World\n\nThis is **bold** and *italic* text.")

    # Scope assertions to editor content only (exclude toolbar/plugin-selector elements)
    content = tiptap.locator("> h2")
    expect(content).to_have_text("Hello World")

    expect(tiptap.locator("> p strong")).to_have_text("bold")
    expect(tiptap.locator("> p em")).to_have_text("italic")


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_paste_plain_text_not_converted(live_server, page, text_plugin, superuser):
    """Test that pasting plain text without markdown patterns is not converted."""
    login(live_server, page, superuser)

    page.goto(f"{live_server.url}{admin_reverse('cms_placeholder_edit_plugin', args=(text_plugin.pk,))}")

    tiptap = page.locator(".ProseMirror.tiptap")
    expect(tiptap).to_be_visible()

    clear_tiptap(page, tiptap)

    plain_text = "Just some regular text without any formatting."
    paste_text(page, plain_text)

    # Verify text was pasted as plain text (no markdown conversion)
    expect(tiptap.locator("> p").first).to_have_text(plain_text)
    assert tiptap.locator("> h1, > h2, > h3").count() == 0
    assert tiptap.locator("> p strong, > p em").count() == 0
