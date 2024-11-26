import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from pytest_django.live_server_helper import LiveServer

@pytest.fixture
def live_server(request):
    """Creates a live Django server for testing."""
    server = LiveServer()
    request.addfinalizer(server.stop)
    return server

@pytest.fixture
def admin_user():
    """Creates an admin user for testing."""
    User = get_user_model()
    return User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='password'
    )

@pytest.fixture
def admin_client(admin_user):
    """Creates an authenticated admin client."""
    client = Client()
    client.force_login(admin_user)
    return client

@pytest.fixture
async def page(playwright):
    """Creates a Playwright browser page for testing."""
    browser = await playwright.chromium.launch()
    context = await browser.new_context()
    page = await context.new_page()
    yield page
    await context.close()
    await browser.close()
