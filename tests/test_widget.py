from unittest import skipIf
from .fixtures import TestFixture
from .base import BaseTestCase

try:
    from cms.api import add_plugin
    from djangocms_text import html, settings
    from djangocms_text.utils import plugin_to_tag

    SKIP_CMS_TEST = False
except ModuleNotFoundError:
    SKIP_CMS_TEST = True


@skipIf(SKIP_CMS_TEST, "Skipping tests because djangocms is not installed")
class WidgetTestCase(TestFixture, BaseTestCase):
    def setUp(self):
        self.super_user = self._create_user("test", True, True)
        self.default_parser = html.cms_parser
        super().setUp()

    def tearDown(self):
        settings.ALLOW_TOKEN_PARSERS = ("djangocms_text.attribute_parsers.DataAttributeParser",)
        html.cms_parser = self.default_parser

    def test_sub_plugin_config(self):
        page = self.create_page(title="home", template="page.html", language="en")
        plugin = add_plugin(
            self.get_placeholders(page, "en").get(slot="content"),
            "TextPlugin",
            "en",
            body="some text",
        )
        endpoint = self.get_change_plugin_uri(plugin)
        with self.login_user_context(self.super_user):
            response = self.client.get(endpoint)
            self.assertContains(response, '"group": "Extra"')
            self.assertContains(response, '"title": "Add a link"')
            self.assertContains(response, '"group": "Generic"')
            self.assertContains(response, '"title": "Image"')

    def test_plugin_edit(self):
        page = self.create_page(title="pagina", template="page.html", language="en")
        placeholder = self.get_placeholders(page, "en").get(slot="content")
        add_plugin(placeholder, "TextPlugin", "en", body="Lorem ipsum")
        self.publish(page, "en")
        response = self.client.get(page.get_absolute_url("en"))
        self.assertContains(response, "Lorem ipsum")

    def test_child_plugin(self):
        page = self.create_page(title="pagina", template="page.html", language="en")
        placeholder = self.get_placeholders(page, "en").get(slot="content")
        plugin = add_plugin(placeholder, "TextPlugin", "en", body="Lorem ipsum")
        test_image = self.create_filer_image_object()
        pic_plugin = add_plugin(
            placeholder,
            "PicturePlugin",
            "en",
            target=plugin,
            picture=test_image,
        )
        plugin.body = f"{plugin.body} {plugin_to_tag(pic_plugin)}"
        plugin.save()
        self.publish(page, "en")
        response = self.client.get(page.get_absolute_url("en"))
        self.assertContains(response, "Lorem ipsum")
        self.assertContains(response, '<img src="/media/')

    def test_contain_text(self):
        page = self.create_page(title="home", template="page.html", language="en")
        placeholder = self.get_placeholders(page, "en").get(slot="content")
        add_plugin(placeholder, "TextPlugin", "en", body="some text")
        language = "en"
        self.publish(page, "en")
        url = page.get_absolute_url(language)
        response = self.client.get(url)
        self.assertContains(response, "some text")

    def test_text_sanitizer(self):
        page = self.create_page(title="home", template="page.html", language="en")
        placeholder = self.get_placeholders(page, "en").get(slot="content")
        add_plugin(
            placeholder,
            "TextPlugin",
            "en",
            body='<span data-one="1" data-two="2">some text</span>',
        )
        language = "en"
        self.publish(page, "en")
        url = page.get_absolute_url(language)
        response = self.client.get(url)
        self.assertContains(response, 'data-one="1"')
        self.assertContains(response, 'data-two="2"')

    @skipIf(True, "sanitizer deactivated")
    def test_text_sanitizer_no_settings(self):
        settings.ALLOW_TOKEN_PARSERS = []
        page = self.create_page(title="home", template="page.html", language="en")
        placeholder = self.get_placeholders(page, "en").get(slot="content")
        add_plugin(
            placeholder,
            "TextPlugin",
            "en",
            body='<span data-one="1" data-two="2">some text</span>',
        )
        language = "en"
        self.publish(page, "en")
        url = page.get_absolute_url(language)
        response = self.client.get(url)
        self.assertContains(response, "<span>some text</span>")


@skipIf(not SKIP_CMS_TEST, "Skipping tests because djangocms is installed")
class NonCMSWidgetTestCase(BaseTestCase):
    def test_django_form_renders_widget(self):
        from tests.test_app.forms import SimpleTextForm

        form = SimpleTextForm()
        rendered = form.render()
        self.assertTrue(isinstance(rendered, str))
