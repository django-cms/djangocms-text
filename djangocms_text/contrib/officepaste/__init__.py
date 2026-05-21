"""Demo Tiptap extension: strip Microsoft Office markup on paste.

Usage: add ``djangocms_text.contrib.officepaste`` to ``INSTALLED_APPS``.
The package appends its script to the default Tiptap editor's ``js``
tuple, so Django renders a ``<script>`` tag for it alongside the main
bundle. The script itself is a plain IIFE that registers a functional
Tiptap extension on ``window.CMS_Editor.tiptap`` — no Tiptap imports
of its own.

The registered extension installs a ProseMirror plugin whose
``transformPastedHTML`` prop removes Word/Outlook-specific markup
(conditional comments, ``<o:p>``, ``mso-*`` styles, ``Mso*`` classes,
etc.) before the clipboard content is parsed into the document.
"""

from djangocms_text.editors import DEFAULT_EDITOR


SCRIPT = "djangocms_text/tiptap_plugins/cms.officepaste.js"


if SCRIPT not in DEFAULT_EDITOR.js:
    DEFAULT_EDITOR.js = (*DEFAULT_EDITOR.js, SCRIPT)
