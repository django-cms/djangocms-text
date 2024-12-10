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
def test_inline_admin_add_row(live_server, page, pizza, superuser):
    """Test that editor loads and initializes properly after user clicks add row button for inline admin"""
    login(live_server, page, superuser)

    endpoint = reverse("admin:test_app_pizza_change", args=(pizza.pk,))
    page.goto(f"{live_server.url}{endpoint}")

    assert page.locator(".cms-editor-inline-wrapper.textarea.fixed").count() == 3

    page.locator(".add-row a").click()

    assert page.locator(".cms-editor-inline-wrapper.textarea.fixed").count() == 4
