import pytest
from django.urls import reverse
from cms.api import create_page, add_plugin
from cms.models import Page
from djangocms_text.cms_plugins import TextPlugin

@pytest.mark.django_db
async def test_text_plugin_rendering(live_server, admin_client, page):
    """Test that the text plugin renders correctly in the browser."""
    # Create a test page with text plugin
    cms_page = create_page(
        title="Test Page",
        template="fullwidth.html",
        language="en",
        published=True
    )
    
    placeholder = cms_page.placeholders.get(slot="content")
    plugin = add_plugin(
        placeholder,
        TextPlugin,
        "en",
        body="<p>Test content</p>"
    )
    
    cms_page.publish("en")
    
    # Visit the page with Playwright
    url = f"{live_server.url}{cms_page.get_absolute_url()}"
    await page.goto(url)
    
    # Check that plugin content is rendered
    content = await page.inner_text(f"#plugin-{plugin.id}")
    assert "Test content" in content

@pytest.mark.django_db
async def test_text_plugin_editing(live_server, admin_client, page):
    """Test that the text plugin can be edited through the admin interface."""
    # Create a test page with text plugin
    cms_page = create_page(
        title="Test Page",
        template="fullwidth.html",
        language="en"
    )
    
    # Login to admin
    await page.goto(f"{live_server.url}/admin/")
    await page.fill("input[name=username]", "admin")
    await page.fill("input[name=password]", "password")
    await page.click("input[type=submit]")
    
    # Go to page edit mode
    edit_url = f"{live_server.url}/admin/cms/page/{cms_page.id}/en/edit/"
    await page.goto(edit_url)
    
    # Add text plugin
    await page.click(".cms-add-plugin")
    await page.click("text=Text")
    
    # Fill in content
    frame = await page.frame("cke_id_body")
    await frame.fill("body", "<p>New content</p>")
    
    # Save plugin
    await page.click("text=Save")
    
    # Verify content is saved
    cms_page.refresh_from_db()
    plugin = cms_page.placeholders.get(slot="content").get_plugins()[0]
    assert "<p>New content</p>" in plugin.body
