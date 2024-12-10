from playwright.sync_api import expect


def login(live_server, page, superuser):
    page.goto(f"{live_server.url}/en/admin/")
    if page.locator("input[name='username']").is_visible():
        page.fill("input[name='username']", superuser.username)
        page.fill("input[name='password']", "admin")
        page.click("input[type='submit']")
    # Ensure success
    expect(page.locator("h1", has_text="Site administration")).to_be_visible()


def get_pagecontent(cms_page):
    return cms_page.pagecontent_set(manager="admin_manager").current_content(language="en").first()
