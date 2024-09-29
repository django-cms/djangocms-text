from cms.api import create_page
from cms.test_utils.testcases import CMSTestCase

from djangocms_text import html, settings
from djangocms_text.html import render_dynamic_attributes
from tests.fixtures import TestFixture


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
        settings.TEXT_ADDITIONAL_TAGS = ['iframe']
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
            '<span>foo</span>',
            text,
        )

    def test_custom_attribute_enabled(self):
        settings.TEXT_ADDITIONAL_ATTRIBUTES = ['test-attr']
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
        self.assertEqual('<source>', text)

    def test_custom_protocol_enabled(self):
        settings.TEXT_ADDITIONAL_PROTOCOLS = ['rtmp']
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
            self.assertHTMLEqual('<span>foo</span>', cleaned)
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
        dynamic_html = f'<a data-cms-href="cms.page:{page.pk + 1}">Link</a>'

        result = render_dynamic_attributes(dynamic_html)
        self.assertEqual(
            result,
            '<span data-cms-error="ref-not-found">Link</span>',
        )
