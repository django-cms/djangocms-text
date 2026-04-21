"""Demo Tiptap extension: YouTube video embeds.

Usage: add ``djangocms_text.contrib.youtube`` to ``INSTALLED_APPS``. The
package appends its script to the default Tiptap editor's ``js`` tuple, so
Django will render a ``<script>`` tag for it alongside the main bundle.
The script itself is a plain IIFE that registers a node and a toolbar
item on ``window.CMS_Editor.tiptap`` — no Tiptap imports of its own.
"""

from django.utils.translation import gettext_lazy as _

from djangocms_text.editors import (
    DEFAULT_EDITOR,
    DEFAULT_TOOLBAR_CMS,
    DEFAULT_TOOLBAR_HTMLField,
    register_toolbar_labels,
)
from djangocms_text.html import register_cleaner_attributes


SCRIPT = "djangocms_text/tiptap_plugins/cms.youtube.js"
TOOLBAR_ITEM = "Youtube"


if SCRIPT not in DEFAULT_EDITOR.js:
    DEFAULT_EDITOR.js = (*DEFAULT_EDITOR.js, SCRIPT)


def _has_item(toolbar, name):
    for group in toolbar:
        if isinstance(group, list) and name in group:
            return True
    return False


for _toolbar in (DEFAULT_TOOLBAR_CMS, DEFAULT_TOOLBAR_HTMLField):
    if not _has_item(_toolbar, TOOLBAR_ITEM):
        _toolbar.append([TOOLBAR_ITEM])


# Server-side i18n label — merged into `this.lang` on the client so
# _getRepresentation() accepts the item. Client-side title/icon from
# registerToolbarItem() act as fallbacks if no lang entry is present.
register_toolbar_labels({TOOLBAR_ITEM: {"title": _("YouTube")}})


# Allow the <iframe> produced by the YouTube node through nh3. The
# wrapping <div data-youtube-video> is already covered by the generic
# `data-` prefix, so only the iframe tag and its attributes need to be
# whitelisted here. `allow` and `referrerpolicy` are required by the
# modern YouTube embed boilerplate — without them the player emits
# configuration errors (e.g. YouTube error 153).
register_cleaner_attributes({
    "iframe": {
        "src",
        "width",
        "height",
        "frameborder",
        "allowfullscreen",
        "allow",
        "referrerpolicy",
        "title",
        "loading",
    },
})
