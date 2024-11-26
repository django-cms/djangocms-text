import pytest
from playwright.sync_api import expect

def test_ckeditor_loads(live_server, page):
    """Test that CKEditor loads and initializes properly"""
    # Navigate to the text plugin add view
    page.goto(f"{live_server.url}/admin/cms/page/add/")
    
    # Login first
    page.fill("input[name='username']", "admin")
    page.fill("input[name='password']", "admin")
    page.click("input[type='submit']")
    
    # Add text plugin
    page.click("text=Add plugin")
    page.click("text=Text")
    
    # Check that CKEditor iframe exists and loads
    iframe_locator = page.frame_locator('.cke_wysiwyg_frame')
    expect(iframe_locator).to_be_visible()
    
    # Test basic text input
    iframe_locator.locator("body").fill("Test content")
    content = iframe_locator.locator("body").inner_text()
    assert content == "Test content"

def test_text_plugin_saves(live_server, page):
    """Test that text plugin content saves correctly"""
    # Navigate and login (reusing steps from above)
    page.goto(f"{live_server.url}/admin/cms/page/add/")
    page.fill("input[name='username']", "admin")
    page.fill("input[name='password']", "admin")
    page.click("input[type='submit']")
    
    # Add and fill text plugin
    page.click("text=Add plugin")
    page.click("text=Text")
    
    iframe_locator = page.frame_locator('.cke_wysiwyg_frame')
    iframe_locator.locator("body").fill("Content to save")
    
    # Save the plugin
    page.click("text=Save")
    
    # Verify saved content
    page.reload()
    saved_content = iframe_locator.locator("body").inner_text()
    assert saved_content == "Content to save"
