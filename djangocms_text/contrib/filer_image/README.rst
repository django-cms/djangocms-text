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
   global-attribute extension (``extension.js``). Webpack joins them
   into one IIFE; the source layout is the developer's only.

4. **Round-tripping a dynamic reference.**
   When the user picks an image, the toolbar inserts ``<img>`` with both
   ``src`` (the resolved URL) and ``data-cms-src="filer.image:<pk>"``.
   The ``__init__.py`` registers a filer-aware resolver for
   ``data-cms-src`` so the public render uses the live filer URL — even
   if the underlying file is later renamed or moved.

5. **Interoperating with django-filer's existing popup contract.**
   The popup is the standard
   ``admin:filer-directory_listing-last?_popup=1&_pick=file`` view.
   ``window.dismissRelatedImageLookupPopup`` is wrapped so popups our
   toolbar opened route into the editor while popups belonging to plain
   filer form widgets keep using the original handler.


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

3. Add ``"FilerImage"`` to your toolbar configuration::

       TEXT_EDITOR_SETTINGS = {
           "toolbar_CMS": [
               ["Undo", "Redo"],
               ["Format"],
               ["Bold", "Italic", "Underline"],
               ["Link", "Unlink", "FilerImage"],
               ["BulletedList", "NumberedList"],
           ],
       }

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
  registers the toolbar label, contributes the popup URL, and replaces
  the ``data-cms-src`` resolver with one that handles filer.
- ``webpack.config.js`` / ``package.json`` — local build.
- ``src/index.js`` — entry; calls into the registry on
  ``window.CMS_Editor.tiptap``.
- ``src/extension.js`` — adds ``data-cms-src`` to the existing image
  node via ``addGlobalAttributes`` (no second image extension).
- ``src/popup.js`` — opens filer's directory listing in a popup and
  wraps ``dismissRelatedImageLookupPopup`` to route the chosen image
  back into the editor.
- ``src/toolbar.js`` — the ``FilerImage`` toolbar item definition.
- ``static/djangocms_text/tiptap_plugins/cms.filer_image.js`` — built
  output that Django serves alongside the main editor bundle.
