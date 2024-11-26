from unittest import skipIf

from django.test import TestCase


from djangocms_text import html
from djangocms_text.html import cms_parser, NH3Parser


class SanitizerTestCase(TestCase):
    def setUp(self):
        self.cms_parser = html.cms_parser

    def tearDown(self):
        html.cms_parser = self.cms_parser

    def test_sanitizer(self):
        body = '<span data-one="1" data-two="2">some text</span>'
        body = html.clean_html(body, cleaner=cms_parser)
        self.assertTrue('data-one="1"' in body)
        self.assertTrue('data-two="2"' in body)

    def test_sanitizer_with_custom_token_parser(self):
        cleaner = NH3Parser(additional_attributes={"span": {"donut"}})
        body = '<span donut="yummy">some text</span>'
        body = html.clean_html(body, cleaner=cleaner)
        self.assertEqual('<span donut="yummy">some text</span>', body)

    @skipIf(True, "sanitizer deactivated")
    def test_sanitizer_without_token_parsers(self):
        body = '<span data-one="1" data-two="2">some text</span>'
        body = html.clean_html(body)
        self.assertEqual("<span>some text</span>", body)
