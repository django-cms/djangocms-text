officepaste
===========

Optional contrib package: strip Microsoft Office (Word, Outlook) markup
when content is pasted into a Tiptap rich text field.

Like :mod:`djangocms_text.contrib.filer_image`, this package is a
**demo of how to extend the Tiptap editor dynamically** — at runtime,
through the ``window.CMS_Editor.tiptap`` registry, with no second copy
of TipTap or ProseMirror in the page. It is the smaller of the two
demos: a single hand-written IIFE, no toolbar UI, no schema changes —
just a ProseMirror plugin that runs on every paste.


What the user sees
------------------

- Nothing visible is added. Pasting from Word or Outlook now yields
  cleaner HTML: stray ``mso-*`` style declarations, ``Mso*`` class
  names, and other Office detritus are stripped before the clipboard
  content reaches the document.
- Plain pastes from non-Office sources are unaffected.


What it cleans (and what it does not)
-------------------------------------

ProseMirror's schema-based parser already drops anything unknown to it:
namespaced tags (``<o:p>``, ``<w:*>``), wrapper blocks (``<xml>``,
``<style>``, ``<meta>``, ``<link>``), HTML comments (``<!--[if mso]>…-->``
and ``StartFragment``/``EndFragment`` markers), and any unregistered
attribute. Trying to filter those again is wasted work.

What *survives* schema parsing is Office payload embedded in attributes
the schema does register: ``mso-*`` declarations inside ``style``, and
``Mso*`` names inside ``class``. Those are what this extension removes
in ``transformPastedHTML``.


What it demonstrates
--------------------

1. **A hand-written IIFE — no build step.**
   ``static/djangocms_text/tiptap_plugins/cms.officepaste.js`` is
   committed directly. There is no ``webpack.config.js``, no
   ``package.json``, no ``src/`` tree. The simplest way to ship a small
   extension.

2. **No TipTap or ProseMirror imports.**
   The script asserts ``window.CMS_Editor.tiptap`` is present and uses
   only the primitives the registry hands its factory (``Extension``
   from TipTap core, plus ``Plugin``/``PluginKey`` from the
   ``pm.state`` slice). See ``tiptap-extensions.md`` for the full
   contract.

3. **Registering a *functional* extension** (no nodes, no marks, no
   commands) that contributes a ProseMirror plugin via
   ``addProseMirrorPlugins``. The plugin uses the
   ``transformPastedHTML`` prop to rewrite clipboard HTML *before*
   ProseMirror parses it.

4. **A no-op default.**
   ``__init__.py`` only appends the script tag to ``DEFAULT_EDITOR.js``
   — there is no toolbar item, no Python-side configuration, no
   server-side label to register. Add the app to ``INSTALLED_APPS`` and
   you are done.


Installation
------------

1. Add the contrib to ``INSTALLED_APPS``::

       INSTALLED_APPS = [
           ...
           "djangocms_text",
           "djangocms_text.contrib.officepaste",
           ...
       ]

There is nothing else to configure. The next time the editor is loaded,
pastes from Office will be cleaned automatically.


Files
-----

- ``__init__.py`` — appends the script to ``DEFAULT_EDITOR.js``.
  Nothing else.
- ``static/djangocms_text/tiptap_plugins/cms.officepaste.js`` —
  hand-written IIFE; registers a functional Tiptap extension whose only
  job is the ``transformPastedHTML`` prop.
