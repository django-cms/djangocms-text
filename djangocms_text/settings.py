"""
Settings for djangocms-text.

All settings are resolved lazily, i.e., each time they are accessed::

    from djangocms_text import settings

    if settings.TEXT_INLINE_EDITING:
        ...

This keeps ``django.test.override_settings`` working and avoids touching the
Django settings at import time. Do **not** import individual names from this
module (``from djangocms_text.settings import TEXT_...``) since this freezes
the value at import time.
"""

from __future__ import annotations

from typing import Any

from django.conf import settings as django_settings
from django.utils.translation import gettext_lazy as _

#: Settings which are passed through unchanged, with their default values
DEFAULTS: dict[str, Any] = {
    "TEXT_EDITOR": "tiptap",
    "TEXT_SAVE_IMAGE_FUNCTION": None,
    "TEXT_SAVE_IMAGE_MAX_BYTES": 5 * 1024 * 1024,
    "TEXT_SAVE_IMAGE_MAX_PIXELS": 25_000_000,
    "TEXT_ADDITIONAL_TAGS": (),
    "TEXT_ADDITIONAL_PROTOCOLS": (),
    "TEXT_CONFIGURATION": None,
    "TEXT_HTML_SANITIZE": True,
    "TEXT_AUTO_HYPHENATE": True,
    "TEXT_PLUGIN_NAME": _("Text"),
    "TEXT_PLUGIN_MODULE_NAME": _("Generic"),
    "TEXT_INLINE_EDITING": True,
    "TEXT_CHILDREN_ENABLED": True,
    "TEXT_CHILDREN_WHITELIST": None,
    "TEXT_CHILDREN_BLACKLIST": (),
    # contrib.filer_image
    "TEXT_FILER_IMAGE_CLASSES": (),
    # contrib.text_ckeditor4: None means the bundled CKEditor 4 static files
    "TEXT_CKEDITOR_BASE_PATH": None,
}


def _get_editor_settings() -> dict[str, str | list]:
    # See http://docs.cksource.com/ckeditor_api/symbols/CKEDITOR.config.html
    # for all settings
    return {
        "language": "{{ language }}",
        "toolbar": "CMS",
        "skin": "moono-lisa",
        "baseFloatZIndex": 8888888,
        "toolbarCanCollapse": False,
        "removePlugins": ["flash"],
        # Compatibility with djangocms-text-ckeditor settings convention
        **getattr(django_settings, "CKEDITOR_SETTINGS", {}),
        **getattr(django_settings, "TEXT_EDITOR_SETTINGS", {}),
    }


def _get_additional_attributes() -> dict[str, set[str]]:
    attributes = getattr(django_settings, "TEXT_ADDITIONAL_ATTRIBUTES", {})
    # Compatibility with djangocms-text-ckeditor settings convention
    if not isinstance(attributes, dict):
        attributes = {"*": set(attributes)}
    additional_tags = getattr(django_settings, "TEXT_ADDITIONAL_TAGS", ())
    if additional_tags:
        attributes = {
            **{tag: set() for tag in additional_tags},
            **attributes,
        }
    return attributes


def _get_linkable_models() -> set[str]:
    return {model_label.lower() for model_label in getattr(django_settings, "TEXT_LINKABLE_MODELS", ("cms.page",))}


#: Settings which are normalized or merged before use
COMPUTED = {
    "TEXT_EDITOR_SETTINGS": _get_editor_settings,
    "TEXT_ADDITIONAL_ATTRIBUTES": _get_additional_attributes,
    "TEXT_LINKABLE_MODELS": _get_linkable_models,
}


def __getattr__(name: str) -> Any:
    if name in COMPUTED:
        return COMPUTED[name]()
    if name in DEFAULTS:
        return getattr(django_settings, name, DEFAULTS[name])
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


def __dir__() -> list[str]:
    return sorted([*globals(), *DEFAULTS, *COMPUTED])
