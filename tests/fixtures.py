from django.apps import apps

DJANGO_CMS4 = False

try:
    from cms import __version__
    from cms.api import create_page

    try:
        from cms.api import create_page_content
    except ImportError:
        from cms.api import create_title as create_page_content

    DJANGO_CMS4 = not (__version__ < "4")

except ModuleNotFoundError:
    DJANGO_CMS4 = False

DJANGOCMS_VERSIONING = apps.is_installed("djangocms_verisoning")


class TestFixture:
    """Sets up generic setUp and tearDown methods for tests."""

    def setUp(self):
        self.language = "en"
        self.superuser = self.get_superuser()
        return super().setUp()

    def tearDown(self):
        if DJANGOCMS_VERSIONING:
            from djangocms_versioning.models import Version

            Version.objects.all().delete()
        return super().tearDown()

    if DJANGO_CMS4:  # CMS V4

        def _get_version(self, grouper, version_state, language=None):
            language = language or self.language

            from djangocms_versioning.models import Version

            versions = Version.objects.filter_by_grouper(grouper).filter(state=version_state)
            for version in versions:
                if hasattr(version.content, "language") and version.content.language == language:
                    return version
            return None

        def publish(self, grouper, language=None):
            if DJANGOCMS_VERSIONING:
                from djangocms_versioning.constants import DRAFT

                version = self._get_version(grouper, DRAFT, language)
                if version is not None:
                    version.publish(self.superuser)

        def unpublish(self, grouper, language=None):
            if DJANGOCMS_VERSIONING:
                from djangocms_versioning.constants import PUBLISHED

                version = self._get_version(grouper, PUBLISHED, language)
                if version is not None:
                    version.unpublish(self.superuser)

        def create_page(self, title, template, **kwargs):
            kwargs.setdefault("language", self.language)
            kwargs.setdefault("created_by", self.superuser)
            return create_page(title=title, template=template, **kwargs)

        def create_title(self, title, page, **kwargs):
            kwargs.setdefault("language", self.language)
            kwargs.setdefault("created_by", self.superuser)
            kwargs.setdefault("in_navigation", True)
            kwargs.setdefault("limit_visibility_in_menu", None)
            kwargs.setdefault("menu_title", title)
            return create_page(title=title, page=page, **kwargs)

        def get_placeholders(self, page, language=None):
            page_content = page.get_admin_content(language or self.language)
            return page_content.get_placeholders()

    else:  # CMS V3

        def publish(self, page, language=None):
            page.publish(language)

        def unpublish(self, page, language=None):
            page.unpublish(language)

        def create_page(self, title, template, **kwargs):
            kwargs.setdefault("language", self.language)
            kwargs.setdefault("menu_title", title)
            return create_page(title=title, template=template, **kwargs)

        def create_title(self, title, page, **kwargs):
            kwargs.setdefault("language", self.language)
            kwargs.setdefault("menu_title", title)
            return create_page_content(title=title, page=page, **kwargs)

        def get_placeholders(self, page, language=None):
            return page.get_placeholders()
