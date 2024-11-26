import os
import pytest
from pytest_django.live_server_helper import LiveServer
from playwright.sync_api import sync_playwright

from tests.fixtures import DJANGO_CMS4

if DJANGO_CMS4:

    @pytest.fixture(scope="session")
    def live_server():
        server = LiveServer("127.0.0.1:9090")
        yield server
        server.stop()

    @pytest.fixture(scope="session")
    def browser_context():
        with sync_playwright() as p:
            browser = p.chromium.launch()
            context = browser.new_context()
            yield context
            context.close()
            browser.close()

    @pytest.fixture(scope="session")
    def page(browser_context):
        page = browser_context.new_page()
        yield page
        page.close()

    @pytest.fixture
    def user(db):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        return User.objects.create_user(username="admin", password="admin", is_staff=True, is_superuser=True)

    @pytest.fixture
    def cms_page(db, user):
        from cms.api import create_page

        return create_page("Test Page", "page.html", "en", created_by=user)

    @pytest.fixture
    def text_plugin(db, cms_page):
        from cms.api import add_plugin

        page_content = cms_page.pagecontent_set(manager="admin_manager").current_content(language="en").first()
        placeholder = page_content.get_placeholders().first()
        return add_plugin(placeholder, "TextPlugin", "en", body="<p>Test content</p>")


def pytest_configure():
    os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"
