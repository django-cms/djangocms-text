"""Demo Tiptap extension: insert django-filer images.

Usage: add ``djangocms_text.contrib.filer_image`` to ``INSTALLED_APPS``.
The package appends its built script to the default Tiptap editor's
``js`` tuple, so Django renders a ``<script>`` tag for it alongside
the main bundle.

What it demonstrates
--------------------

Unlike :mod:`djangocms_text.contrib.officepaste`, which ships a
hand-written IIFE file, this contrib has its **own** webpack
configuration. The source under ``src/`` is split across ES modules and
bundled into a single IIFE that lives in ``static/``. The webpack config
has **no** ``@tiptap`` imports — the bundled script communicates with
the host editor purely through the ``window.CMS_Editor.tiptap`` registry
contract, so no second copy of TipTap or ProseMirror ends up in the
page.

It also wires three things server-side:

1. The script is appended to ``DEFAULT_EDITOR.js``.
2. Toolbar labels for ``FilerImage`` are registered via
   :func:`register_toolbar_labels` so the on-page ``lang`` config has an
   entry the host can render.
3. The default ``data-cms-src`` resolver (registered in
   ``djangocms_text.html``) is replaced with one that also understands
   filer's ``.url`` property — filer's File/Image models do not
   implement ``get_absolute_url``, so the stock resolver would tag every
   selected image as a broken reference.
"""

from django.conf import settings
from django.urls import NoReverseMatch, reverse_lazy
from django.utils.text import format_lazy
from django.utils.translation import gettext_lazy as _

from djangocms_text.editors import (
    DEFAULT_EDITOR,
    DEFAULT_TOOLBAR_CMS,
    DEFAULT_TOOLBAR_HTMLField,
    register_toolbar_labels,
)
from djangocms_text.html import dynamic_attr_pool, register_attr


SCRIPT = "djangocms_text/tiptap_plugins/cms.filer_image.js"
TOOLBAR_ITEM = "FilerImage"


if SCRIPT not in DEFAULT_EDITOR.js:
    DEFAULT_EDITOR.js = (*DEFAULT_EDITOR.js, SCRIPT)


# Auto-place the button in the default toolbars so installing the app is
# enough to make it usable. Integrators that want a different position
# can still pin `"FilerImage"` explicitly in their `TEXT_EDITOR_SETTINGS`.
def _has_item(toolbar, name):
    for group in toolbar:
        if isinstance(group, list) and name in group:
            return True
    return False


for _toolbar in (DEFAULT_TOOLBAR_CMS, DEFAULT_TOOLBAR_HTMLField):
    if not _has_item(_toolbar, TOOLBAR_ITEM):
        _toolbar.append([TOOLBAR_ITEM])


# Allowed image classes for the toolbar form's class picker. Read from
# a Django setting so projects can declare their own utility classes
# (e.g. Bootstrap's `img-fluid`, `rounded`, ...). Each entry is a
# 2-tuple of `(class_name, verbose_name)`. The verbose name is what
# the user sees in the dropdown; if omitted the class name is shown.
_image_classes = getattr(settings, "TEXT_FILER_IMAGE_CLASSES", ())


# Server-side i18n label and form schema — merged into `this.lang` on
# the client so _getRepresentation() accepts the item and the
# `cms.formextension` dialog has a schema to render. Client-side
# title/icon from registerToolbarItem() act as fallbacks if no lang
# entry is present.
#
# The `form` is only registered when at least one class is configured.
# With no classes the dialog would only show a single "None" option,
# which is useless; the JS toolbar item detects the missing form and
# leaves the click on a selected image as a no-op.
_filer_image_label: dict = {"title": _("Filer image")}
if _image_classes:
    # The setting is the source of truth — we don't synthesise a
    # "None" entry. Integrators that want a no-class choice must add
    # one explicitly (e.g. `("", _("None"))`).
    _class_options: list = []
    for entry in _image_classes:
        # Tolerate 1-tuples by falling back to the class name as the
        # human label.
        class_name = entry[0]
        verbose_name = entry[1] if len(entry) > 1 else class_name
        _class_options.append({"value": class_name, "label": verbose_name})
    _filer_image_label["form"] = [
        {
            "name": "class",
            "label": _("Image class"),
            "type": "select",
            "options": _class_options,
            "required": False,
        },
    ]


register_toolbar_labels({TOOLBAR_ITEM: _filer_image_label})


# Lazily-resolved popup URL handed to the JS via global_settings. We use
# ``reverse_lazy`` so this module can be imported before django.urls is
# fully ready (e.g. during AppConfig.ready ordering).
#
# `_popup=1` puts the directory listing into popup mode (without it
# filer's templates do not render the "select this file" links);
# `_pick=file` switches it into picker mode for files (the only allowed
# pick type alongside "folder"; filer's image widget uses the same).
try:
    DEFAULT_EDITOR.additional_context.setdefault(
        "filer_image_lookup_url",
        format_lazy(
            "{url}?_popup=1&_pick=file",
            url=reverse_lazy("admin:filer-directory_listing-last"),
        ),
    )
except NoReverseMatch:
    # filer is not installed; the JS will show a console warning when
    # the user clicks the button. Importing this contrib without filer
    # is not an error in itself.
    pass


def _filer_aware_dynamic_src(elem, obj, attr, edit_mode=False):
    """``data-cms-src`` resolver that also handles filer File/Image objects.

    Falls back to ``obj.get_absolute_url()`` for non-filer models so the
    behaviour for already-stored references stays the same.
    """
    target_value = ""
    if obj is not None:
        target_value = getattr(obj, "url", None) or ""
        if not target_value and hasattr(obj, "get_absolute_url"):
            target_value = obj.get_absolute_url() or ""
    if target_value:
        elem.attrib[attr] = target_value
    else:
        elem.attrib["data-cms-error"] = "ref-not-found"


# Replace the stock resolver so filer URLs actually resolve. The dynamic
# attribute pool is keyed by attribute name, so registering again wins.
if dynamic_attr_pool.get("data-cms-src") is not _filer_aware_dynamic_src:
    register_attr("data-cms-src", _filer_aware_dynamic_src)
