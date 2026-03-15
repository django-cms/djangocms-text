from time import sleep
import pytest
from django.urls import reverse

from tests.fixtures import DJANGO_CMS4
from tests.integration.utils import login


@pytest.fixture
def pizza():
    from tests.test_app.models import Pizza

    return Pizza.objects.create(description="<p>Test pizza</p>")


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_tabular_inline_admin_add_row(live_server, page, pizza, superuser):
    """Test that editor initializes properly after adding a row in a tabular inline"""
    login(live_server, page, superuser)

    endpoint = reverse("admin:test_app_pizza_change", args=(pizza.pk,))
    page.goto(f"{live_server.url}{endpoint}")

    # Count initialized editors within the tabular inline group
    tabular_group = page.locator("#topping_set-group")
    n = tabular_group.locator(".cms-editor-inline-wrapper.textarea.fixed").count()

    # Add a row in the tabular inline
    tabular_group.locator(".add-row a").click()
    sleep(0.1)  # Let browser work

    assert tabular_group.locator(".cms-editor-inline-wrapper.textarea.fixed").count() == n + 1


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_stacked_inline_admin_add_row(live_server, page, pizza, superuser):
    """Test that editor initializes properly after adding a row in a stacked inline"""
    login(live_server, page, superuser)

    endpoint = reverse("admin:test_app_pizza_change", args=(pizza.pk,))
    page.goto(f"{live_server.url}{endpoint}")

    # Count initialized editors within the stacked inline group
    stacked_group = page.locator("#sauce_set-group")
    n = stacked_group.locator(".cms-editor-inline-wrapper.textarea.fixed").count()

    # Add a row in the stacked inline
    stacked_group.locator(".add-row a").click()
    sleep(0.1)  # Let browser work

    assert stacked_group.locator(".cms-editor-inline-wrapper.textarea.fixed").count() == n + 1
