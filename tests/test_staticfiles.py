from tempfile import TemporaryDirectory

from django.contrib.staticfiles import finders
from django.core.management import call_command
from django.test import SimpleTestCase, override_settings


class ManifestStaticFilesTestCase(SimpleTestCase):
    @override_settings(
        STORAGES={
            "default": {
                "BACKEND": "django.core.files.storage.FileSystemStorage",
            },
            "staticfiles": {
                "BACKEND": "django.contrib.staticfiles.storage.ManifestStaticFilesStorage",
            },
        },
    )
    def test_bundles_have_resolvable_source_maps(self):
        if finders.find("djangocms_text/bundles/bundle.tiptap.min.js") is None:
            self.skipTest("Frontend bundles have not been built")

        with TemporaryDirectory() as static_root, override_settings(STATIC_ROOT=static_root):
            call_command("collectstatic", interactive=False, verbosity=0)
