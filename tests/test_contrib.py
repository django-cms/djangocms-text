import importlib.util
import json
from importlib import reload
from unittest import skipIf
from unittest.mock import MagicMock, patch

from django.http import Http404
from django.test import RequestFactory, SimpleTestCase, override_settings
from lxml.etree import Element

from djangocms_text.contrib import filer_image, officepaste, text_ckeditor4
from djangocms_text.contrib.filer_image.apps import _file_info_view
from djangocms_text.editors import DEFAULT_EDITOR, DEFAULT_TOOLBAR_CMS, DEFAULT_TOOLBAR_HTMLField
from djangocms_text.html import dynamic_attr_pool
from djangocms_text.widgets import TextEditorWidget


class FilerImageContribTestCase(SimpleTestCase):
    def test_registers_script_toolbar_and_dynamic_source_resolver(self):
        self.assertIn(filer_image.SCRIPT, DEFAULT_EDITOR.js)
        self.assertTrue(any(filer_image.TOOLBAR_ITEM in group for group in DEFAULT_TOOLBAR_CMS))
        self.assertTrue(any(filer_image.TOOLBAR_ITEM in group for group in DEFAULT_TOOLBAR_HTMLField))
        self.assertIs(dynamic_attr_pool["data-cms-src"], filer_image._filer_aware_dynamic_src)

    @override_settings(TEXT_FILER_IMAGE_CLASSES=(("img-fluid", "Responsive"), ("rounded",)))
    def test_image_classes_build_toolbar_form_options(self):
        self.addCleanup(reload, filer_image)
        module = reload(filer_image)

        field = module._filer_image_label["form"][0]
        self.assertEqual(field["name"], "class")
        self.assertEqual(
            field["options"],
            [
                {"value": "img-fluid", "label": "Responsive"},
                {"value": "rounded", "label": "rounded"},
            ],
        )

    def test_dynamic_source_resolver_supports_filer_url(self):
        elem = Element("img")
        obj = MagicMock(url="/media/original.jpg")

        filer_image._filer_aware_dynamic_src(elem, obj, "src")

        self.assertEqual(elem.attrib["src"], "/media/original.jpg")
        obj.get_absolute_url.assert_not_called()

    def test_dynamic_source_resolver_falls_back_and_marks_missing_references(self):
        elem = Element("img")
        obj = MagicMock(url=None)
        obj.get_absolute_url.return_value = "/fallback.jpg"

        filer_image._filer_aware_dynamic_src(elem, obj, "src")
        self.assertEqual(elem.attrib["src"], "/fallback.jpg")

        missing_elem = Element("img")
        filer_image._filer_aware_dynamic_src(missing_elem, None, "src")
        self.assertEqual(missing_elem.attrib["data-cms-error"], "ref-not-found")

    def test_file_info_view_validates_id(self):
        request = RequestFactory().get("/info-json/")
        self.assertEqual(_file_info_view(request).status_code, 400)

        request = RequestFactory().get("/info-json/", {"id": "not-an-id"})
        self.assertEqual(_file_info_view(request).status_code, 400)

    @patch("filer.models.File.objects.get")
    def test_file_info_view_returns_compact_json(self, get_file):
        get_file.return_value = MagicMock(id=7, url="/media/image.jpg", label="Image")
        request = RequestFactory().get("/info-json/", {"id": "7"})

        response = _file_info_view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(json.loads(response.content), {"id": 7, "url": "/media/image.jpg", "label": "Image"})
        self.assertNotIn(b" ", response.content)

    @patch("filer.models.File.objects.get")
    def test_file_info_view_returns_404_for_unknown_file(self, get_file):
        from filer.models import File

        get_file.side_effect = File.DoesNotExist
        request = RequestFactory().get("/info-json/", {"id": "7"})

        with self.assertRaises(Http404):
            _file_info_view(request)


class OfficePasteContribTestCase(SimpleTestCase):
    def test_registers_script_once(self):
        self.assertEqual(DEFAULT_EDITOR.js.count(officepaste.SCRIPT), 1)


class CKEditor4ContribTestCase(SimpleTestCase):
    def test_editor_configuration(self):
        self.assertEqual(text_ckeditor4.ckeditor4.name, "ckeditor4")
        self.assertTrue(text_ckeditor4.ckeditor4.inline_editing)
        self.assertTrue(text_ckeditor4.ckeditor4.child_plugin_support)
        self.assertIn("djangocms_text/vendor/ckeditor4/ckeditor.js", text_ckeditor4.ckeditor4.js)

    @override_settings(TEXT_CKEDITOR_BASE_PATH="/custom/ckeditor/")
    def test_base_path_uses_configured_url(self):
        rendered = str(text_ckeditor4.BasePath())

        self.assertIn('data-ckeditor-basepath="/custom/ckeditor/"', rendered)
        self.assertIn("djangocms_text/js/basepath.js", rendered)

    @skipIf(importlib.util.find_spec("cms") is None, "django CMS is not installed")
    def test_app_adds_cms_admin_bundle_to_widget(self):
        self.assertTrue(any("bundle.admin.base.min.js" in str(script) for script in TextEditorWidget.widget_js))
