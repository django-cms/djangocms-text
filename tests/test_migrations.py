# original from
# http://tech.octopus.energy/news/2016/01/21/testing-for-missing-migrations-in-django.html
import importlib
import io
from types import SimpleNamespace
from unittest import skipIf

from django.apps import apps
from django.conf import settings
from django.core.management import call_command
from django.db import connection
from django.test import TestCase, override_settings


@skipIf(settings.CMS_NOT_USED, "Skipping tests because djangocms is not installed")
class MigrationTestCase(TestCase):
    @override_settings(MIGRATION_MODULES={})
    def test_for_missing_migrations(self):
        output = io.StringIO()
        options = {
            "interactive": False,
            "dry_run": True,
            "stdout": output,
            "check_changes": True,
        }

        try:
            call_command("makemigrations", "djangocms_text", **options)
        except SystemExit as e:
            status_code = str(e)
        else:
            # the "no changes" exit code is 0
            status_code = "0"

        if status_code == "1":
            self.fail(f"There are missing migrations:\n {output.getvalue()}")

    def test_migration_0003_does_not_pollute_app_registry(self):
        migration = importlib.import_module("djangocms_text.migrations.0003_auto_20240702_1409")
        # Run the migration skipped during test database setup.
        migration.migrate_text_ckeditor_fields(apps, SimpleNamespace(connection=connection))
        registry = apps.get_app_config("djangocms_text").models
        self.assertNotIn("ckeditortext", registry)
        self.assertNotIn("text_text", registry)
