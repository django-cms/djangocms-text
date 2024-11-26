import os
import pytest
from django.core.management import call_command
from pytest_django.live_server_helper import LiveServer
from playwright.sync_api import sync_playwright

@pytest.fixture(scope="session")
def live_server():
    server = LiveServer()
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
