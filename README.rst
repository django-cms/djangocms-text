djangocms-text
==============
|pypi| |coverage| |precommit| |python| |django| |djangocms|

``djangocms-text`` is a flexible and extensible rich text editing solution for Django
CMS. This package is designed as a replacement for ``djangocms-text-ckeditor``,
introducing a swappable rich text editor interface and supporting enhanced data
storage in both HTML and JSON formats.

Features
--------

- **Swappable editors** — switch between TipTap (default), CKEditor 4, and
  CKEditor 5 frontends.
- **HTML and JSON storage** — store content in either format, depending on
  your use case.
- **Inline editing** — click a text plugin to edit it directly in edit mode.
- **Text-enabled plugins** — embed CMS plugins inline within rich text.
- **Drop-in for djangocms-text-ckeditor** — automatic data migration on
  install.

Installation
------------

1. Install: ``pip install djangocms-text``
2. Add to ``INSTALLED_APPS``::

       INSTALLED_APPS = [..., "djangocms_text", ...]

3. Run migrations: ``python manage.py migrate djangocms_text``
4. Start your server and add a Text plugin.

The default editor is TipTap and is included in the base package. To use a
different editor, install its frontend package and set ``TEXT_EDITOR``:

.. code-block:: python

    INSTALLED_APPS = [..., "djangocms_text.contrib.text_ckeditor4", ...]
    TEXT_EDITOR = "djangocms_text.contrib.text_ckeditor4.ckeditor4"


Editors
-------

``djangocms-text`` ships with several editor frontends that can be swapped via
the ``TEXT_EDITOR`` setting:

- **TipTap** *(default)* — A modern, modular rich text editor. Supports
  text-enabled plugins, dynamic links, inline editing, and on-the-fly
  Markdown conversion. Does not allow direct HTML source editing.
- **CKEditor 4** — Compatible with ``djangocms-text-ckeditor`` and usable as
  a drop-in replacement. Supports inline editing and text-enabled plugins.
- **CKEditor 5** — Available as a `separate package
  <https://github.com/django-cms/djangocms-text-ckeditor5>`_
  (``djangocms-text-ckeditor5``) to keep licenses separated. Fully supports
  text-enabled CMS plugins and dynamic links.


Configuration
-------------

Selecting an editor
~~~~~~~~~~~~~~~~~~~

Add the editor's package to ``INSTALLED_APPS`` and point ``TEXT_EDITOR`` at
its ``RTEConfig`` path::

    INSTALLED_APPS = [
        ...,
        "djangocms_text.contrib.text_ckeditor4",
        ...,
    ]
    TEXT_EDITOR = "djangocms_text.contrib.text_ckeditor4.ckeditor4"

Global editor configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~

The ``TEXT_EDITOR`` setting points to a ``RTEConfig`` object. The following
attributes are available:

- ``name`` (str) — The name of the RTE configuration.
- ``config`` (str) — The configuration string.
- ``js`` (Iterable[str]) — JavaScript files to include.
- ``css`` (dict) — CSS files to include.
- ``admin_css`` (Iterable[str]) — CSS files for the admin interface only.
- ``inline_editing`` (bool) — Whether to enable inline editing.
- ``child_plugin_support`` (bool) — Whether to support child plugins.
- ``configuration`` (dict) — Frontend-specific options.
- ``additional_context`` (dict) — Additional context to pass to the editor.

The default configuration is:

.. code-block:: python

    DEFAULT_EDITOR = RTEConfig(
        name="tiptap",
        config="TIPTAP",
        js=("djangocms_text/bundles/bundle.tiptap.min.js",),
        css={"all": ("djangocms_text/css/bundle.tiptap.min.css",)},
        admin_css=("djangocms_text/css/tiptap.admin.css",),
        inline_editing=True,
        child_plugin_support=True,
        configuration={},  # see below
    )

Use ``admin_css`` to include CSS files loaded into the dialog window, e.g. to
declare custom colors or other styles.

Frontend-specific configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Frontend-specific options live in the ``configuration`` property of the
``RTEConfig``. The contents depend on the rich text editor frontend (TipTap,
CKEditor 4, etc.).

The preferred way to set them is via ``TEXT_EDITOR_SETTINGS``, which mirrors
``RTEConfig.configuration``. For backwards compatibility with
``djangocms-text-ckeditor``, ``CKEDITOR_SETTINGS`` is also forwarded to the
frontend (even when the frontend is not CKEditor 4).

Example TipTap configuration (matches the defaults):

.. code-block:: python

    DEFAULT_EDITOR.configuration = {
        "inlineStyles": [  # Styles menu, by default contains some rarer styles
            { "name": 'Small', "element": 'small' },
            { "name": 'Kbd', "element": 'kbd' },
            { "name": 'Var', "element": 'var' },
            { "name": 'Samp', "element": 'samp' },
        ],
        "blockStyles": [],
        # Block styles menu, e.g., for paragraphs; empty by default.
        # Example: [{"name": "Lead", "element": "div", "attributes": {"class": "lead"}}]
        "textColors": {  # Colors offered for the text color menu - the keys are CSS classes
            'text-primary': {"name": "Primary"},
            'text-secondary': {"name": "Secondary"},
            'text-success': {"name": "Success"},
            'text-danger': {"name": "Danger"},
            'text-warning': {"name": "Warning"},
            'text-info': {"name": "Info"},
            'text-light': {"name": "Light"},
            'text-dark': {"name": "Dark"},
            'text-body': {"name": "Body"},
            'text-muted': {"name": "Muted"},
        },
        "tableClasses": "table",  # classes added to new tables
    }

Three ways to configure the classes added to new tables::

    # Option 1: modify the default editor configuration in place
    from djangocms_text.editors import DEFAULT_EDITOR
    DEFAULT_EDITOR.configuration["tableClasses"] = "table ui"

    # Option 2: offer a list of named choices
    from djangocms_text.editors import DEFAULT_EDITOR
    DEFAULT_EDITOR.configuration["tableClasses"] = [
        ["table", _("Default")],
        ["table table-striped", _("Striped")],
    ]

    # Option 3: use TEXT_EDITOR_SETTINGS in settings.py
    TEXT_EDITOR_SETTINGS = {
        "tableClasses": "table ui",
    }


Inline editing
~~~~~~~~~~~~~~

Inline editing lets editors click a text plugin and change its contents
directly in django CMS edit mode. The editor appears around the text field,
and changes are saved as soon as the field loses focus.

Inline editing wraps the HTML in a ``<div>`` in edit mode, which may interact
with site CSS that uses direct child selectors.

Inline editing is enabled by default. To disable it::

    TEXT_INLINE_EDITING = False

When enabled, a toolbar toggle lets users switch inline editing on and off
for the current session. If only text changes, editing continues seamlessly.
If a text-enabled plugin was added, changed, or removed, the page refreshes
to update the page tree and re-render the affected plugins.

Custom plugin templates
^^^^^^^^^^^^^^^^^^^^^^^

If you override the default ``cms/plugins/text.html`` and wrap the plugin
output in container elements (e.g. ``<section>``, ``<article>``, ``<div>``),
the **innermost** container must have the class ``cms-content-start``::

    <!-- cms/plugins/text.html -->
    <section class="my-text-plugin">
        <div class="cms-content-start">
            {{ body|safe }}
        </div>
    </section>

This tells the inline editor which element to use as the editable area.
Without it, the editor will treat the outermost container as the editable
region, which may include non-editable markup.


Text-enabled plugins
~~~~~~~~~~~~~~~~~~~~

djangocms-text supports text-enabled plugins (note: not all editor frontends
do — see Editors_).

To make a plugin available inside Text plugins, set ``text_enabled = True``
on its plugin class::

    class MyTextPlugin(TextPlugin):
        name = "My text plugin"
        model = MyTextModel
        text_enabled = True

The plugin then appears in the *CMS Plugins* dropdown (puzzle icon) in the
editor and is previewed inline.

**Pro-tip**: Provide an ``icon_alt`` method on the plugin so that, when many
``text_enabled`` plugins are available, users get a useful tooltip — for
example, the name of the product whose price the plugin shows.

Text-enabled plugins can also have their own icons. Add a ``text_icon``
property containing SVG source code:

.. code-block::

    class MyTextPlugin(TextPlugin):
        name = "My text plugin"
        model = MyTextModel
        text_enabled = True
        text_icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>'

The icon shows in the CMS plugin pulldown menu and toolbar. To make a
text-enabled plugin directly accessible from the editor toolbar, add its
name (e.g. ``"LinkPlugin"``) to the toolbar configuration.

For more on extending the CMS with plugins, see the `django-cms doc`_.

.. _django-cms doc: http://docs.django-cms.org/en/latest/reference/plugins.html#cms.plugin_base.CMSPluginBase.text_enabled


Default content in placeholders
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can use ``TextPlugin`` in ``default_plugins`` (see the
`CMS_PLACEHOLDER_CONF`_ setting docs). ``TextPlugin`` requires a single
value: ``body`` for the default HTML content. To attach default children
(e.g. a ``LinkPlugin``), reference them in the body using
``"%(_tag_child_<order>)s"`` placeholders:

.. code-block::

    CMS_PLACEHOLDER_CONF = {
        'content': {
            'name' : _('Content'),
            'plugins': ['TextPlugin', 'LinkPlugin'],
            'default_plugins':[
                {
                    'plugin_type':'TextPlugin',
                    'values':{
                        'body':'<p>Great websites : %(_tag_child_1)s and %(_tag_child_2)s</p>'
                    },
                    'children':[
                        {
                            'plugin_type':'LinkPlugin',
                            'values':{
                                'name':'django',
                                'url':'https://www.djangoproject.com/'
                            },
                        },
                        {
                            'plugin_type':'LinkPlugin',
                            'values':{
                                'name':'django-cms',
                                'url':'https://www.django-cms.org'
                            },
                        },
                    ]
                },
            ]
        }
    }

.. _CMS_PLACEHOLDER_CONF: https://docs.django-cms.org/en/stable/reference/configuration.html#cms-placeholder-conf


HTML sanitizer
~~~~~~~~~~~~~~

``djangocms-text`` uses `nh3 <https://nh3.readthedocs.io/en/latest/>`_ to
sanitize HTML, both for security and to enforce well-formed markup.
Sanitization may strip tags useful for some use cases (e.g. ``iframe``).
Customize allowed tags and attributes via ``TEXT_ADDITIONAL_ATTRIBUTES``::

    TEXT_ADDITIONAL_ATTRIBUTES = {
        'iframe': {'scrolling', 'allowfullscreen', 'frameborder'},
    }

The dictionary maps tag names to sets of allowed attribute names.

If you have settings in the older djangocms-text-ckeditor style using both
``TEXT_ADDITIONAL_TAGS`` and ``TEXT_ADDITIONAL_ATTRIBUTES``, those will be
translated automatically — with a warning from the Django checks framework
at server startup.

**Note**: Some frontend editors pre-sanitize content before sending it to
the server, which can render the above settings ineffective.

To disable sanitization entirely, set ``TEXT_HTML_SANITIZE = False``.


Markdown support
----------------

The TipTap frontend includes (minimal) Markdown support:

- Markdown is converted to HTML when **pasting**. (To prevent XSS attacks,
  pasted content is not converted if it contains JavaScript.)
- When **typing**, Markdown syntax is converted on the fly.

Supported syntax:

- Headings: ``# Heading 1``, ``## Heading 2``, ``### Heading 3``, etc.
- Bold: ``**bold text**`` or ``__bold text__``
- Italic: ``*italic text*`` or ``_italic text_``
- Strikethrough: ``~~strikethrough~~``
- Links: ``[link text](http://example.com)``
- Lists: ``- Item`` or ``* Item`` for unordered, ``1. Item`` for ordered.
- Blockquotes: ``> Quote``
- Code: ```inline code``` for inline code, triple backticks for code blocks.
- Tables (pasting only): use ``|`` to separate columns::

    | Header 1 | Header 2 |
    |----------|----------|
    | Row 1    | Row 2    |

- Horizontal rules: ``---``


Optional contrib extensions
---------------------------

Three small contrib packages ship with djangocms-text as **demos of how
to extend the TipTap editor dynamically** — at runtime, through the
``window.CMS_Editor.tiptap`` registry, without forking djangocms-text
or pulling a second copy of TipTap into the page. The full registry
contract is documented in `tiptap-extensions.md`_.

Each is opt-in: add the relevant app to ``INSTALLED_APPS``. The READMEs
linked below cover what each package adds, the configuration knobs it
exposes, and the integration pattern it illustrates.

- `djangocms_text.contrib.filer_image
  <djangocms_text/contrib/filer_image/README.rst>`_ —
  insert django-filer images via filer's existing picker popup,
- `djangocms_text.contrib.youtube
  <djangocms_text/contrib/youtube/README.rst>`_ —
  embed YouTube videos via a toolbar button.
- `djangocms_text.contrib.officepaste
  <djangocms_text/contrib/officepaste/README.rst>`_ —
  strip Word/Outlook detritus on paste.

.. _tiptap-extensions.md: tiptap-extensions.md


Migrating from djangocms-text-ckeditor
--------------------------------------

djangocms-text's migrations automatically migrate existing text plugins
from djangocms-text-ckeditor and clean up old tables. To migrate:

1. Uninstall ``djangocms-text-ckeditor``.
2. Remove ``djangocms_text_ckeditor`` from ``INSTALLED_APPS``.
3. Add ``djangocms_text`` to ``INSTALLED_APPS`` (see Installation_).
4. Run ``python -m manage migrate djangocms_text``.

**Attention**: The migration also deletes djangocms-text-ckeditor's tables
from the database (to avoid referential integrity issues). Make a backup
beforehand to be safe.

Switching from CKEditor 4 to TipTap
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

When transitioning from CKEditor 4 to TipTap (the new default), keep these
points in mind:

- **No HTML source editing** — TipTap does not support direct HTML source
  editing. This simplifies the editor for most users but may be a drawback
  for advanced users or developers who manually edit HTML.
- **Loss of non-standard formatting** — TipTap stores content in an
  abstract JSON format and regenerates HTML on edit. Formatting created via
  CKEditor 4 plugins or manually added HTML classes may not be preserved.
  This only happens on first edit after migration.
- **Keep using CKEditor 4 if needed** — If retaining CKEditor 4 behavior is
  essential, use the CKEditor 4 backend that ships with djangocms-text.

**You can continue to use CKEditor 4.** Compared to djangocms-text-ckeditor,
the CKEditor 4 sources have moved to
``static/djangocms_text/vendor/ckeditor4``. Update any custom CKEditor 4
plugins accordingly.


Usage outside django CMS
------------------------

django CMS Text can be used without django CMS installed. It provides
``HTMLField``, ``HTMLFormField``, and the ``TextEditorWidget`` class for use
with any Django model or form.

When django CMS is not installed alongside django CMS Text, add this to your
``MIGRATION_MODULES`` setting to skip creation of the CMS plugin model::

    MIGRATION_MODULES = {
        ...,
        "djangocms_text": None,
        ...,
    }


Contributing
------------

Contributions to ``djangocms-text`` are welcome! See the
`contributing guidelines <https://docs.django-cms.org/en/stable/contributing/index.html>`_
to get started.

pre-commit hooks
~~~~~~~~~~~~~~~~

The repo uses pre-commit git hooks to ensure code quality. Install with::

    pip install pre-commit
    pre-commit install

Building the JavaScript
~~~~~~~~~~~~~~~~~~~~~~~

``djangocms-text`` distributes a JavaScript bundle containing the editor
frontends and CMS integration. To rebuild the bundle::

    nvm use
    npm install
    npm run build

Other build scripts:

* ``npm run build:dev`` — unminified development build
* ``npm run watch`` — rebuild on file changes


Acknowledgments
---------------

Special thanks to the django CMS community and to all contributors to the
``djangocms-text-ckeditor`` project.

License
-------

This project is licensed under the BSD-3-Clause License — see the LICENSE
file for details.


.. |pypi| image:: https://badge.fury.io/py/djangocms-text.svg
    :target: http://badge.fury.io/py/djangocms-text
.. |coverage| image:: https://codecov.io/gh/django-cms/djangocms-text/branch/main/graph/badge.svg
    :target: https://codecov.io/gh/django-cms/djangocms-text
.. |python| image:: https://img.shields.io/pypi/pyversions/djangocms-text
    :alt: PyPI - Python Version
    :target: https://pypi.org/project/djangocms-text/
.. |django| image:: https://img.shields.io/pypi/frameworkversions/django/djangocms-text
    :alt: PyPI - Django Versions from Framework Classifiers
    :target: https://www.djangoproject.com/
.. |djangocms| image:: https://img.shields.io/pypi/frameworkversions/django-cms/djangocms-text
    :alt: PyPI - django CMS Versions from Framework Classifiers
    :target: https://www.django-cms.org/
.. |precommit| image:: https://results.pre-commit.ci/badge/github/django-cms/djangocms-text/main.svg
   :target: https://results.pre-commit.ci/latest/github/django-cms/djangocms-text/main
   :alt: pre-commit.ci status
