from django.apps import AppConfig
from django.core.checks import Warning, register


class TextConfig(AppConfig):
    name = "djangocms_text"
    verbose_name = "django CMS Rich Text"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
         register(check_ckeditor_settings)


def check_ckeditor_settings(app_configs, **kwargs):
    from django.conf import settings

    change_msg = ("Please use the TEXT_ADDITIONAL_ATTRIBUTES setting with a dictionary instead. "
                  "Have an entry for each tag and specify allowed attributes for the tag as a set.")
    warnings = []
    if getattr(settings, "TEXT_ADDITIONAL_TAGS", None):
        warnings.append(
            Warning(
                f"The TEXT_ADDITIONAL_TAGS setting is deprecated and will be removed in a future release.\n"
                f"{change_msg}",
                f"TEXT_ADDITIONAL_ATTRIBUTES = "
                f"""{{{', '.join([f'"{tag}": set()' for tag in settings.TEXT_ADDITIONAL_TAGS])}\"}}""",
                id="text.W001",
                obj="settings.TEXT_ADDITIONAL_TAGS",
            )
        )
    if not isinstance(getattr(settings, "TEXT_ADDITIONAL_ATTRIBUTES", dict()), dict):
        warnings.append(
            Warning(
                f"The TEXT_ADDITIONAL_ATTRIBUTES setting has changed.\n{change_msg}",
                f"TEXT_ADDITIONAL_ATTRIBUTES = {{\"*\": {set(settings.TEXT_ADDITIONAL_ATTRIBUTES)}}}",
                id="text.W002",
                obj="settings.TEXT_ADDITIONAL_ATTRIBUTES",
            )
        )

    return warnings
