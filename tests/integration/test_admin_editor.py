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


@pytest.mark.django_db
@pytest.mark.skipif(not DJANGO_CMS4, reason="Integration tests only work on Django CMS 4")
def test_stacked_inline_empty_form_not_initialized(live_server, page, pizza, superuser):
    """Regression test for #123: RTE must not initialize on the empty-form template
    in stacked inlines, which would cause a duplicate editor after clicking add row."""
    login(live_server, page, superuser)

    endpoint = reverse("admin:test_app_pizza_change", args=(pizza.pk,))
    page.goto(f"{live_server.url}{endpoint}")

    stacked_group = page.locator("#sauce_set-group")

    # The empty-form template must not have an initialized editor
    empty_form = stacked_group.locator(".inline-related.empty-form")
    assert empty_form.count() == 1, "Empty form template should exist"
    assert empty_form.locator(".cms-editor-inline-wrapper.textarea.fixed").count() == 0, (
        "Empty form template must not have an initialized editor"
    )

    # Count editors before adding a row
    n = stacked_group.locator(".cms-editor-inline-wrapper.textarea.fixed").count()

    # Add a row
    stacked_group.locator(".add-row a").click()
    sleep(0.1)

    # Exactly one new editor should appear (not two as reported in #123)
    assert stacked_group.locator(".cms-editor-inline-wrapper.textarea.fixed").count() == n + 1

    # The empty-form template must still not have an initialized editor
    assert empty_form.locator(".cms-editor-inline-wrapper.textarea.fixed").count() == 0, (
        "Empty form template must still not have an initialized editor after add row"
    )
