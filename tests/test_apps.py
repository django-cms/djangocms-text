from importlib import import_module
from types import SimpleNamespace
from unittest import skipIf
from unittest.mock import patch

from django.conf import settings
from django import forms
from django.test import SimpleTestCase

from djangocms_text.apps import (
    TextConfig,
    check_ckeditor_settings,
    check_no_cms_config,
    discover_inline_editable_models,
)


def _make_model(app_label: str, model_name: str):
    class Model:
        _meta = SimpleNamespace(app_label=app_label, model_name=model_name)

    return Model


@skipIf(settings.CMS_NOT_USED, "Skipping app tests because djangocms is not installed")
class AppsConfigTestCase(SimpleTestCase):
    def test_ready_populates_inline_models_and_registers_checks(self):
        app_config = TextConfig("djangocms_text", import_module("djangocms_text"))
        expected_inline_models = {"tests-sample-field": "CharField"}

        with patch("djangocms_text.apps.discover_inline_editable_models", return_value=expected_inline_models):
            with patch("djangocms_text.apps.register") as register_mock:
                app_config.ready()

        self.assertEqual(app_config.inline_models, expected_inline_models)
        self.assertEqual(register_mock.call_count, 2)
        register_mock.assert_any_call(check_ckeditor_settings)
        register_mock.assert_any_call(check_no_cms_config)


@skipIf(settings.CMS_NOT_USED, "Skipping app tests because djangocms is not installed")
class DiscoverInlineEditableModelsTestCase(SimpleTestCase):
    def test_discovery_finds_admin_and_plugin_fields(self):
        admin_model = _make_model("tests", "adminmodel")
        fallback_model = _make_model("tests", "fallbackmodel")
        no_form_model = _make_model("tests", "noformmodel")
        blacklisted_admin_model = _make_model("blacklisted", "ignoredadmin")

        class AdminForm(forms.Form):
            body = forms.CharField()
            ignored = forms.IntegerField()

        class FallbackForm(forms.Form):
            summary = forms.CharField()

        class AdminWithForm:
            frontend_editable_fields = ["body", "ignored"]

            def get_form(self, request=None, fields=None):
                return AdminForm

        class AdminWithFallbackForm:
            frontend_editable_fields = ["summary"]
            form = FallbackForm

            def get_form(self, request=None, fields=None):
                raise RuntimeError("fallback to .form")

        class AdminWithoutForm:
            frontend_editable_fields = ["body"]

            def get_form(self, request=None, fields=None):
                raise RuntimeError("no form available")

        class BlacklistedAdmin:
            frontend_editable_fields = ["body"]

            def get_form(self, request=None, fields=None):
                return AdminForm

        plugin_model = _make_model("tests", "pluginmodel")
        blacklisted_plugin_model = _make_model("blacklisted", "ignoredplugin")

        class PluginForm(forms.Form):
            label = forms.CharField()
            ignored = forms.IntegerField()

        class BlacklistedPluginForm(forms.Form):
            label = forms.CharField()

        class PluginWithEditableFields:
            model = plugin_model
            frontend_editable_fields = ["label", "ignored"]
            form = PluginForm

        class PluginWithoutEditableFields:
            model = plugin_model
            form = PluginForm

        class BlacklistedPlugin:
            model = blacklisted_plugin_model
            frontend_editable_fields = ["label"]
            form = BlacklistedPluginForm

        fake_site = SimpleNamespace(
            _registry={
                admin_model: AdminWithForm(),
                fallback_model: AdminWithFallbackForm(),
                no_form_model: AdminWithoutForm(),
                blacklisted_admin_model: BlacklistedAdmin(),
            }
        )
        fake_plugin_pool = SimpleNamespace(
            plugins={
                "plugin_with_editable_fields": PluginWithEditableFields,
                "plugin_without_editable_fields": PluginWithoutEditableFields,
                "blacklisted_plugin": BlacklistedPlugin,
            }
        )

        with patch("django.contrib.admin.site", fake_site):
            with patch("djangocms_text.apps.apps.is_installed", return_value=True):
                with patch("cms.plugin_pool.plugin_pool", fake_plugin_pool):
                    inline_models = discover_inline_editable_models(blacklist_apps=["blacklisted"])

        self.assertEqual(
            inline_models,
            {
                "tests-adminmodel-body": "CharField",
                "tests-fallbackmodel-summary": "CharField",
                "tests-pluginmodel-label": "CharField",
            },
        )

    def test_discovery_skips_plugins_when_cms_is_not_installed(self):
        admin_model = _make_model("tests", "standalonemodel")

        class StandaloneAdminForm(forms.Form):
            text = forms.CharField()

        class StandaloneAdmin:
            frontend_editable_fields = ["text"]

            def get_form(self, request=None, fields=None):
                return StandaloneAdminForm

        fake_site = SimpleNamespace(_registry={admin_model: StandaloneAdmin()})

        with patch("django.contrib.admin.site", fake_site):
            with patch("djangocms_text.apps.apps.is_installed", return_value=False):
                inline_models = discover_inline_editable_models()

        self.assertEqual(inline_models, {"tests-standalonemodel-text": "CharField"})
