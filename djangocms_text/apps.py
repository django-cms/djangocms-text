from django.apps import AppConfig
from django.core.checks import Warning, register


class TextConfig(AppConfig):
    name = "djangocms_text"
    verbose_name = "django CMS Rich Text"
    default_auto_field = "django.db.models.BigAutoField"

    def ready(self):
        self.inline_models = discover_inline_editable_models()
        register(check_ckeditor_settings)


def discover_inline_editable_models():
    # Find frontend-editable models and plugins

    from django.contrib.admin import site

    registered_inline_fields = ["HTMLFormField", "CharField"]
    inline_models = {}
    blacklist_apps = []

    for model, modeladmin in site._registry.items():
        if model._meta.app_label in blacklist_apps:
            continue

        for field_name in getattr(modeladmin, "frontend_editable_fields", []):
            try:
                form = modeladmin.get_form(
                    request=None, fields=(field_name,)
                )  # Worth a try
            except Exception:
                form = getattr(modeladmin, "form", None)
            if form:
                field_instance = form.base_fields.get(field_name, None)
                if field_instance.__class__.__name__ in registered_inline_fields:
                    inline_models[
                        f"{model._meta.app_label}-{model._meta.model_name}-{field_name}"
                    ] = field_instance.__class__.__name__

    from cms.plugin_pool import plugin_pool

    for plugin in plugin_pool.plugins.values():
        model = plugin.model
        if model._meta.app_label in blacklist_apps:
            continue
        for field_name in getattr(plugin, "frontend_editable_fields", []):
            form = plugin.form
            field_instance = form.base_fields.get(field_name, None)
            if field_instance.__class__.__name__ in registered_inline_fields:
                inline_models[
                    f"{model._meta.app_label}-{model._meta.model_name}-{field_name}"
                ] = field_instance.__class__.__name__

    return inline_models


def check_ckeditor_settings(app_configs, **kwargs):
    from django.conf import settings

    change_msg = (
        "Please use the TEXT_ADDITIONAL_ATTRIBUTES setting with a dictionary instead. "
        "Have an entry for each tag and specify allowed attributes for the tag as a set."
    )
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
                f'TEXT_ADDITIONAL_ATTRIBUTES = {{"*": {set(settings.TEXT_ADDITIONAL_ATTRIBUTES)}}}',
                id="text.W002",
                obj="settings.TEXT_ADDITIONAL_ATTRIBUTES",
            )
        )

    return warnings
