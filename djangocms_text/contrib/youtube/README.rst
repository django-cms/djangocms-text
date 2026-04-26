youtube
=======

Optional contrib package: embed YouTube videos in a Tiptap rich text
field via a toolbar button.

Like :mod:`djangocms_text.contrib.filer_image` and
:mod:`djangocms_text.contrib.officepaste`, this package is a **demo of
how to extend the Tiptap editor dynamically** — at runtime, through the
``window.CMS_Editor.tiptap`` registry, with no second copy of TipTap or
ProseMirror in the page. It is the simplest of the three demos: a
single hand-written IIFE file, no webpack, no source tree to bundle.


What the user sees
------------------

- A **YouTube** button in the toolbar prompts for a video URL
  (``youtube.com/watch?v=…``, ``youtu.be/…``, ``youtube.com/embed/…``,
  or ``youtube.com/shorts/…``) and inserts an embedded player at the
  cursor.
- The embedded player round-trips through the saved HTML as
  ``<div data-youtube-video><iframe src="…/embed/<id>" …></iframe></div>``
  and is editable as a single block node.


What it demonstrates
--------------------

1. **A hand-written IIFE — no build step.**
   ``static/djangocms_text/tiptap_plugins/cms.youtube.js`` is committed
   directly. There is no ``webpack.config.js``, no ``package.json``, no
   ``src/`` tree. This is the lowest-friction way to ship a small
   extension.

2. **No TipTap or ProseMirror imports.**
   The script asserts ``window.CMS_Editor.tiptap`` is present and uses
   only the primitives the registry hands its factory (``Node``,
   ``mergeAttributes``). See ``tiptap-extensions.md`` for the full
   contract.

3. **Registering a fresh node and a toolbar item.**
   ``api.register('youtube-video', factory)`` adds a ``youtubeVideo``
   block node with custom ``parseHTML`` / ``renderHTML`` and a
   ``setYoutubeVideo`` command. ``api.registerToolbarItem('Youtube', …)``
   wires the button so the editor's toolbar knows how to render and
   trigger it.

4. **Server-side i18n via `register_toolbar_labels`.**
   The toolbar button's title is contributed from Python with
   ``gettext_lazy`` so the editor's per-page ``lang`` blob carries a
   localised label. The client-side ``title`` registered with the
   toolbar item is the English fallback.

5. **Auto-inserting into the default toolbars.**
   ``__init__.py`` appends ``["Youtube"]`` to ``DEFAULT_TOOLBAR_CMS`` and
   ``DEFAULT_TOOLBAR_HTMLField`` (skipping if it is already there) so
   integrators get the button without editing their toolbar config.

6. **Whitelisting attributes for nh3 cleaning.**
   The rendered ``<iframe>`` would otherwise be stripped by the HTML
   sanitiser. ``register_cleaner_attributes`` opts the iframe's
   ``src``/``allow``/``referrerpolicy``/etc. through. The wrapping
   ``data-youtube-video`` div is already covered by the generic
   ``data-`` attribute prefix.


Installation
------------

1. Add the contrib to ``INSTALLED_APPS``::

       INSTALLED_APPS = [
           ...
           "djangocms_text",
           "djangocms_text.contrib.youtube",
           ...
       ]

That's it — the button is appended to the default toolbar
configurations automatically. To pin a specific position, list
``"Youtube"`` explicitly in your ``TEXT_EDITOR_SETTINGS``::

       TEXT_EDITOR_SETTINGS = {
           "toolbar_CMS": [
               ["Undo", "Redo"],
               ["Format"],
               ["Bold", "Italic", "Underline"],
               ["Link", "Unlink"],
               ["FilerImage", "Youtube"],
               ["BulletedList", "NumberedList"],
           ],
       }


Files
-----

- ``__init__.py`` — appends the script to ``DEFAULT_EDITOR.js``,
  registers the toolbar label via ``register_toolbar_labels``, ensures
  the button is present in the default toolbars, and whitelists the
  iframe attributes via ``register_cleaner_attributes``.
- ``static/djangocms_text/tiptap_plugins/cms.youtube.js`` — hand-written
  IIFE; the entire extension lives here.
