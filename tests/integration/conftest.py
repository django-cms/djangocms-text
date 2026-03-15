import pytest
from pytest_django.live_server_helper import LiveServer
import asyncio


from tests.fixtures import DJANGO_CMS4


@pytest.fixture(scope="session", autouse=True)
def _allow_sync_db_in_playwright_session():
    """
    Playwright's sync API uses greenlets to run its asyncio event loop.  When
    sync_playwright().start() is called, it sets asyncio's thread-local
    'running loop' for the main thread and never clears it for the lifetime of
    the session.  Django's async_unsafe decorator sees that running loop and
    raises SynchronousOnlyOperation on every ORM call.

    Playwright's greenlet loop is NOT a real async execution context: DB calls
    are safe here.  We therefore replace the get_running_loop reference that
    async_unsafe imported into its module namespace so it always raises
    RuntimeError (= "no running loop"), suppressing the guard for this process.
    """
    import django.utils.asyncio as _dj_asyncio

    _dj_asyncio.get_running_loop = lambda: (_ for _ in ()).throw(RuntimeError("no running event loop"))
    yield
    _dj_asyncio.get_running_loop = asyncio.get_running_loop


@pytest.fixture(scope="session")
def live_server():
    server = LiveServer("127.0.0.1:9090")
    yield server
    server.stop()


@pytest.fixture
def superuser(db):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.create_user(username="admin", password="admin", is_staff=True, is_superuser=True)


@pytest.fixture
def cms_page(db, superuser):
    from cms.api import create_page

    return create_page("Test Page", "page.html", "en", created_by=superuser)


@pytest.fixture
def text_plugin(db, cms_page):
    if not DJANGO_CMS4:
        return None

    from cms.api import add_plugin

    page_content = cms_page.pagecontent_set(manager="admin_manager").current_content(language="en").first()
    placeholder = page_content.get_placeholders().first()
    return add_plugin(placeholder, "TextPlugin", "en", body="<p>Test content</p>")
