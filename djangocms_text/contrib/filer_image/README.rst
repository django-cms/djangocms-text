filer_image
===========

Optional contrib package: insert django-filer images into a Tiptap rich
text field through filer's existing image picker popup.

Like :mod:`djangocms_text.contrib.youtube` and
:mod:`djangocms_text.contrib.officepaste`, this package is a **demo of
how to extend the Tiptap editor dynamically** — at runtime, through the
``window.CMS_Editor.tiptap`` registry, with no second copy of TipTap or
ProseMirror in the page. Where the other two demos ship hand-written
IIFE files, this one shows the alternative approach: a self-contained
package with **its own webpack configuration** that bundles a small
multi-module source tree into the same kind of registry-friendly IIFE.


What the user sees
------------------

- A **Filer image** button in the toolbar opens filer's directory
  listing in a popup window. Picking a file inserts an ``<img>`` at the
  current cursor position.
- **Single-clicking** an existing image opens the class form
  (configurable via ``TEXT_FILER_IMAGE_CLASSES`` — see below). A short
  guard window lets a follow-up click promote the gesture into a
  dblclick.
- **Double-clicking** an existing image re-opens the filer picker so
  the user can swap the underlying file in place. Alt, title, class
  and any other author-set attributes are preserved.
- If a default class is configured, newly inserted images are tagged
  with the first entry — saving the author from setting it manually
  every time.


What it demonstrates
--------------------

1. **A self-contained webpack build inside a contrib package.**
   ``webpack.config.js`` and ``package.json`` live next to the source.
   ``npm run build`` (from the contrib directory) reads ``src/`` and
   writes a single IIFE to
   ``static/djangocms_text/tiptap_plugins/cms.filer_image.js``. No entry
   is added to the project-level ``webpack.config.js``.

2. **No TipTap or ProseMirror in the bundle.**
   The webpack config marks ``@tiptap/core`` and ``@tiptap/pm/*`` as
   externals as a tripwire — the source has no such imports today, but
   if a future change adds one webpack will fail loudly instead of
   silently shipping a duplicate editor copy. The script communicates
   with the host purely through the registry contract documented in
   ``tiptap-extensions.md``.

3. **Splitting an extension across modules.**
   ``src/`` contains four files: an entry (``index.js``), the popup
   plumbing (``popup.js``), the toolbar item (``toolbar.js``) and the
   schema/plugin extension (``extension.js``). Webpack joins them into
   one IIFE; the source layout is the developer's only.

4. **Round-tripping a dynamic reference.**
   When the user picks an image, the toolbar inserts ``<img>`` with both
   ``src`` (the resolved URL) and ``data-cms-src="filer.image:<pk>"``.
   ``__init__.py`` registers a filer-aware resolver for ``data-cms-src``
   so the public render uses the live filer URL — even if the
   underlying file is later renamed or moved.

5. **Adding attributes to an existing node without forking it.**
   The TipTap image extension does not declare ``class`` or
   ``data-cms-src``; we extend its schema via ``addGlobalAttributes``
   in a fresh ``Extension``, keeping the upstream node intact and
   avoiding a duplicate ``image`` definition.

6. **Using the host's `openCmsForm` UI from a contrib.**
   The class picker is a `cms.formextension` dialog (the same UI the
   dynamic-link extension uses) populated from a form schema published
   server-side via :func:`register_toolbar_labels`. No bespoke balloon,
   no second dialog stack.

7. **Interoperating with django-filer's existing popup contract.**
   The popup is the standard
   ``admin:filer-directory_listing-last?_popup=1&_pick=file`` view.
   ``window.dismissRelatedImageLookupPopup`` is wrapped so popups our
   toolbar opened route into the editor while popups belonging to plain
   filer form widgets keep using the original handler.

8. **Patching a third-party admin from `AppConfig.ready()`.**
   ``apps.py`` adds an ``info-json/`` endpoint to filer's ``FileAdmin``
   so the JS can upgrade the picker's thumbnail URL to the original
   image URL after the popup dismisses. The endpoint URL is published
   to the editor via ``additional_context``.


Installation
------------

1. Install django-filer: ``pip install django-filer``.

2. Add both apps to ``INSTALLED_APPS`` (filer must come first so its
   admin URLs are reverseable)::

       INSTALLED_APPS = [
           ...
           "easy_thumbnails",
           "filer",
           "djangocms_text",
           "djangocms_text.contrib.filer_image",
           ...
       ]

3. *(Optional)* The button is appended to the default toolbar
   configurations automatically — you only need to edit
   ``TEXT_EDITOR_SETTINGS`` if you want to pin a specific position::

       TEXT_EDITOR_SETTINGS = {
           "toolbar_CMS": [
               ["Undo", "Redo"],
               ["Format"],
               ["Bold", "Italic", "Underline"],
               ["Link", "Unlink", "FilerImage"],
               ["BulletedList", "NumberedList"],
           ],
       }

4. *(Optional)* Declare the utility classes the class picker should
   offer. Each entry is a ``(class_name, verbose_name)`` tuple. The
   first entry is also used as the default class for newly inserted
   images. Add an ``("", _("None"))`` entry first if you want a
   no-class option (it is **not** synthesised automatically)::

       from django.utils.translation import gettext_lazy as _

       TEXT_FILER_IMAGE_CLASSES = (
           ("img-fluid", _("Responsive")),
           ("img-fluid rounded", _("Rounded")),
           ("img-thumbnail", _("Framed")),
       )

   Without this setting, the toolbar button still inserts and swaps
   images; only the class picker form is suppressed.

If filer isn't installed, the script logs a console warning when the
button is clicked and otherwise stays out of the way.


Building the bundle
-------------------

The bundle ships pre-built. To work on the JS::

    cd djangocms_text/contrib/filer_image
    npm install
    npm run build         # one-shot
    npm run watch         # rebuild on save

The webpack config has no relationship with the project-level config; it
is a self-contained build for one tiny IIFE.


Files
-----

- ``__init__.py`` — appends the script to ``DEFAULT_EDITOR.js``,
  publishes the toolbar label and form schema (built from
  ``TEXT_FILER_IMAGE_CLASSES``), contributes the popup URL via
  ``additional_context``, and replaces the ``data-cms-src`` resolver
  with one that handles filer's ``.url`` property.
- ``apps.py`` — ``AppConfig.ready()`` patches filer's ``FileAdmin`` to
  expose an ``info-json/`` endpoint and publishes the URL to the editor.
- ``webpack.config.js`` / ``package.json`` — local build.
- ``src/index.js`` — entry; calls into the registry on
  ``window.CMS_Editor.tiptap``.
- ``src/extension.js`` — adds ``data-cms-src``/``class`` global
  attributes to the existing image node and installs the click /
  dblclick mouse plugin.
- ``src/popup.js`` — opens filer's directory listing in a popup, fetches
  the original URL via the info-json endpoint, and wraps
  ``dismissRelatedImageLookupPopup`` to route the chosen image back into
  the editor (insert vs. in-place swap depending on whether an image is
  already selected).
- ``src/toolbar.js`` — the ``FilerImage`` toolbar item (insert when no
  image is selected, ``openCmsForm`` when one is) plus the form's
  ``formAction`` / ``attributes`` callbacks.
- ``static/djangocms_text/tiptap_plugins/cms.filer_image.js`` — built
  output that Django serves alongside the main editor bundle.
