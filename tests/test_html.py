from unittest.mock import patch, MagicMock

from cms.api import create_page, add_plugin
from cms.test_utils.testcases import CMSTestCase
from django.test import TestCase
from lxml.etree import Element

from djangocms_text import html, settings
from djangocms_text.html import dynamic_href, dynamic_src, render_dynamic_attributes
from tests.fixtures import DJANGO_CMS4, TestFixture


class HtmlSanitizerAdditionalProtocolsTests:
    def test_default_tag_escaping(self):
        settings.TEXT_ADDITIONAL_TAGS = []
        text = html.clean_html(
            '<iframe src="rtmp://testurl.com/"></iframe>',
            full=False,
        )
        self.assertEqual(
            '&lt;iframe src="rtmp://testurl.com/"&gt;&lt;/iframe&gt;',
            text,
        )

    def test_custom_tag_enabled(self):
        settings.TEXT_ADDITIONAL_TAGS = ["iframe"]
        text = html.clean_html(
            '<iframe src="rtmp://testurl.com/"></iframe>',
            full=False,
        )
        self.assertEqual(
            '<iframe src="rtmp://testurl.com/"></iframe>',
            text,
        )

    def test_default_attribute_escaping(self):
        settings.TEXT_ADDITIONAL_ATTRIBUTES = []
        text = html.clean_html(
            '<span test-attr="2">foo</span>',
            full=False,
        )
        self.assertEqual(
            "<span>foo</span>",
            text,
        )

    def test_custom_attribute_enabled(self):
        settings.TEXT_ADDITIONAL_ATTRIBUTES = ["test-attr"]
        text = html.clean_html(
            '<span test-attr="2">foo</span>',
            full=False,
        )
        self.assertEqual(
            '<span test-attr="2">foo</span>',
            text,
        )

    def test_default_protocol_escaping(self):
        settings.TEXT_ADDITIONAL_PROTOCOLS = []
        text = html.clean_html(
            '<source src="rtmp://testurl.com/">',
            full=False,
        )
        self.assertEqual("<source>", text)

    def test_custom_protocol_enabled(self):
        settings.TEXT_ADDITIONAL_PROTOCOLS = ["rtmp"]
        text = html.clean_html(
            '<source src="rtmp://testurl.com/">',
            full=False,
        )
        self.assertEqual('<source src="rtmp://testurl.com/">', text)

    def test_clean_html_with_sanitize_enabled(self):
        old_text_html_sanitize = settings.TEXT_HTML_SANITIZE
        settings.TEXT_HTML_SANITIZE = True

        original = '<span test-attr="2">foo</span>'
        cleaned = html.clean_html(
            original,
            full=False,
        )
        try:
            self.assertHTMLEqual("<span>foo</span>", cleaned)
        finally:
            settings.TEXT_HTML_SANITIZE = old_text_html_sanitize

    def test_clean_html_with_sanitize_disabled(self):
        old_text_html_sanitize = settings.TEXT_HTML_SANITIZE
        settings.TEXT_HTML_SANITIZE = False

        original = '<span test-attr="2">foo</span>'
        cleaned = html.clean_html(
            original,
            full=False,
        )
        try:
            self.assertHTMLEqual(original, cleaned)
        finally:
            settings.TEXT_HTML_SANITIZE = old_text_html_sanitize


class HTMLDynamicAttriutesTest(TestFixture, CMSTestCase):
    def test_dynamic_link(self):
        page = self.create_page("page", "page.html", language="en")
        self.publish(page, "en")
        self.assertEqual(
            page.get_absolute_url(),
            "/en/page/",
        )
        dynamic_html = f'<a data-cms-href="cms.page:{page.pk}">Link</a>'

        result = render_dynamic_attributes(dynamic_html)
        self.assertEqual(
            result,
            f'<a href="{page.get_absolute_url()}">Link</a>',
        )

    def test_invalid_dynamic_link(self):
        page = self.create_page("page", "page.html", language="en")
        self.publish(page, "en")
        self.assertEqual(
            page.get_absolute_url(),
            "/en/page/",
        )
        dynamic_html = '<a data-cms-href="cms.page:0">Link</a>'

        result = render_dynamic_attributes(dynamic_html)
        self.assertEqual(
            result,
            '<span data-cms-error="ref-not-found">Link</span>',
        )


class DynamicAttributesTestCase(TestCase):
    @patch("djangocms_text.html.apps.get_model")
    def test_dynamic_href_sets_correct_attribute(self, mock_get_model):
        mock_obj = MagicMock()
        mock_obj.get_absolute_url.return_value = "/test-url"
        mock_get_model.return_value.objects.filter.return_value = [mock_obj]
        elem = Element("a", {"data-cms-href": "app.Model:1"})
        dynamic_href(elem, mock_obj, "href")
        self.assertEqual(elem.attrib["href"], "/test-url")

    @patch("djangocms_text.html.apps.get_model")
    def test_dynamic_src_sets_correct_attribute(self, mock_get_model):
        mock_obj = MagicMock()
        mock_obj.get_absolute_url.return_value = "/test-url"
        mock_get_model.return_value.objects.filter.return_value = [mock_obj]
        elem = Element("img", {"data-cms-src": "app.Model:1"})
        dynamic_src(elem, mock_obj, "src")
        self.assertEqual(elem.attrib["src"], "/test-url")

    def test_render_dynamic_attributes_changes_html(self):
        page = create_page("page", "page.html", language="en")
        html = f'<a data-cms-href="cms.page:{page.pk}">Link</a>'
        updated_html = render_dynamic_attributes(html)
        self.assertIn('<a href="/en/page/">Link</a>', updated_html)

    def test_render_dynamic_attributes_fails(self):
        html = '<a data-cms-href="app.model:1">Link</a>'
        updated_html = render_dynamic_attributes(html)
        self.assertIn('<span data-cms-error="ref-not-found">Link</span>', updated_html)

    def test_render_dynamic_attributes_handles_no_dynamic_attributes(self):
        html = "<p>No dynamic attributes</p>"
        updated_html = render_dynamic_attributes(html)
        self.assertEqual(html, updated_html)


def save_image(filename, image, parent_plugin, width, height):
    pass


class DjangoCMSPictureIntegrationTestCase(CMSTestCase):
    def setUp(self):
        super().setUp()
        self.home = self.create_homepage("home", "page.html", "en")
        if DJANGO_CMS4:
            self.placeholder = (
                self.home.pagecontent_set(manager="admin_manager").first().get_placeholders().get(slot="content")
            )
        else:
            self.placeholder = self.home.get_placeholders("en").get(slot="content")

    def test_extract_images(self):
        with patch("tests.test_html.save_image") as mock_save_image:
            add_plugin(
                self.placeholder,
                "TextPlugin",
                "en",
                body='<img src="https://imageworld.org/"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42m'
                'P8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg==">',
            )
            mock_save_image.assert_called_once()
