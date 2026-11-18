import warnings
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from djangocms_text import settings
from djangocms_text.deprecation import RemovedInDjangoCMSText20Warning
from djangocms_text.editors import get_editor_config


class LazySettingsTestCase(SimpleTestCase):
    def test_defaults(self):
        self.assertEqual(settings.TEXT_EDITOR, "tiptap")
        self.assertIs(settings.TEXT_HTML_SANITIZE, True)
        self.assertEqual(settings.TEXT_LINKABLE_MODELS, {"cms.page"})

    def test_settings_follow_override_settings(self):
        with override_settings(TEXT_INLINE_EDITING=False, TEXT_CHILDREN_BLACKLIST=["PluginA"]):
            self.assertIs(settings.TEXT_INLINE_EDITING, False)
            self.assertEqual(settings.TEXT_CHILDREN_BLACKLIST, ["PluginA"])
        self.assertIs(settings.TEXT_INLINE_EDITING, True)
        self.assertEqual(settings.TEXT_CHILDREN_BLACKLIST, [])

    def test_module_attributes_can_be_patched(self):
        with patch.object(settings, "TEXT_SAVE_IMAGE_MAX_BYTES", 4):
            self.assertEqual(settings.TEXT_SAVE_IMAGE_MAX_BYTES, 4)
        self.assertEqual(settings.TEXT_SAVE_IMAGE_MAX_BYTES, 5 * 1024 * 1024)

    def test_unknown_setting_raises_attribute_error(self):
        with self.assertRaises(AttributeError):
            settings.TEXT_DOES_NOT_EXIST  # noqa: B018

    def test_dir_lists_settings(self):
        self.assertIn("TEXT_EDITOR", dir(settings))
        self.assertIn("TEXT_EDITOR_SETTINGS", dir(settings))

    @override_settings(
        CKEDITOR_SETTINGS={"toolbar": "legacy", "height": 300},
        TEXT_EDITOR_SETTINGS={"toolbar": "custom"},
    )
    def test_editor_settings_are_merged(self):
        editor_settings = settings.TEXT_EDITOR_SETTINGS
        self.assertEqual(editor_settings["toolbar"], "custom")
        self.assertEqual(editor_settings["height"], 300)
        self.assertEqual(editor_settings["skin"], "moono-lisa")

    @override_settings(TEXT_ADDITIONAL_ATTRIBUTES=("data-x",), TEXT_ADDITIONAL_TAGS=("iframe",))
    def test_legacy_additional_attributes_are_normalized(self):
        self.assertEqual(settings.TEXT_ADDITIONAL_ATTRIBUTES, {"iframe": set(), "*": {"data-x"}})

    @override_settings(TEXT_LINKABLE_MODELS=("cms.Page", "Blog.Post"))
    def test_linkable_models_are_lowercased(self):
        self.assertEqual(settings.TEXT_LINKABLE_MODELS, {"cms.page", "blog.post"})

    @override_settings(TEXT_EDITOR="djangocms_text.contrib.text_ckeditor4.ckeditor4")
    def test_editor_config_follows_override_settings(self):
        self.assertEqual(get_editor_config().name, "ckeditor4")


class DeprecationTestCase(SimpleTestCase):
    def test_warning_is_a_deprecation_warning(self):
        self.assertTrue(issubclass(RemovedInDjangoCMSText20Warning, DeprecationWarning))

    def test_clean_html_full_argument_warns(self):
        from djangocms_text.html import clean_html

        with self.assertWarns(RemovedInDjangoCMSText20Warning):
            clean_html("<p>Test</p>", full=False)

    def test_clean_html_without_full_argument_does_not_warn(self):
        from djangocms_text.html import clean_html

        with warnings.catch_warnings():
            warnings.simplefilter("error", RemovedInDjangoCMSText20Warning)
            clean_html("<p>Test</p>")

    def test_ckeditor_compat_classes_warn(self):
        from djangocms_text_ckeditor.fields import HTMLField, HTMLFormField
        from djangocms_text_ckeditor.widgets import TextEditorWidget

        for cls in (HTMLField, HTMLFormField, TextEditorWidget):
            with self.subTest(cls=cls.__name__), self.assertWarns(RemovedInDjangoCMSText20Warning):
                cls()
