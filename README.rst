djangocms-text
==============

|pypi| |coverage| |precommit| |python| |django| |djangocms|

``djangocms-text`` is a flexible and extensible rich text editing solution for Django
CMS. This package is designed as a replacement for ``djangocms-text-ckeditor``,
introducing a swappable rich text editor interface and supporting enhanced data storage
in both HTML and JSON formats.

Features
--------

- **Swappable Rich Text Editors**: Choose and switch between different rich text editors
  as per project requirements.
- **Customization and Extensions**: Easily add new or customized versions of your
  favorite rich text editors.
- **Enhanced Data Storage**: Store content in either HTML or JSON format, offering
  versatility for different use cases.
- **djangocms-text-ckeditor Compatibility**: Initial version includes a port of the
  CKEditor 4 interface and child plugin functionality. This editor is compatible with
  the ``djangocms-text-ckeditor`` plugin, and can be used as a drop-in replacement.

Installation
------------

1. Install: ``pip install djangocms-text``
2. Add to ``INSTALLED_APPS``: ``INSTALLED_APPS = [..., "djangocms_text", ...]``
3. Run migrations: ``python manage.py migrate djangocms_text``
4. Start your server and add a Text plugin!

Optionally, add an editor frontend to your installed apps (if different from the
default TipTap frontend), and set the editor you want to use:

.. code-block:: python

    INSTALLED_APPS = [..., "djangocms_text.contrib.text_ckeditor4", ...]
    TEXT_EDITOR = "djangocms_text.contrib.text_ckeditor4.ckeditor4"


Upgrading from djangocms-text-ckeditor
--------------------------------------

djangocms-text's migrations automatically migrate existing text plugins
from djangocms-text-ckeditor, and clean up old tables. All you have to do is:

* uninstall ``djangocms-text-ckeditor``
* remove ``djangocms_text_ckeditor`` from ``INSTALLED_APPS``
* add ``djangocms_text`` to ``INSTALLED_APPS`` (see above)
* run ``python -m manage migrate djangocms_text``

**Attention**: The migration command also deletes djangocms-text-ckeditor's
tables from the database (to avoid referential integrity issues). To be on
the safe side, make a backup of its content.

When transitioning from CKEditor4 to Tiptap as the rich text editor in your
project, consider the following points:

* **Switching Editors**: The biggest challenge will likely be adapting to the
  differences between CKEditor4 and the new default rich text editor Tiptap.
  Tiptap offers a more modern editing experience, but there are important
  distinctions in how content is handled.
* **No HTML Source Code Editing**: Tiptap does not support direct HTML source
  code editing. While this simplifies the editor for most users, it could be a
  drawback for those accustomed to manually editing HTML, such as advanced
  users or developers.
* **Loss of Non-standard Formatting**: Formatting created through
  CKEditor4 plugins or manually added HTML classes may not be preserved.
  Tiptap stores content in an abstract JSON format and regenerates the HTML
  upon editing, which can lead to a loss of non-standard formatting. However,
  this only happens if a field is edited after migration.
* **Potential Workaround**: If maintaining CKEditor4 functionality is
  essential, you could circumvent these issues by using the CKEditor4 backend
  provided with djangocms-text. This allows you to retain the familiar
  CKEditor4 behavior while benefiting from other updates.

**You can continue to use ckeditor4.** Compared to djangocms-text-ckeditor, the
ckeditor4 sources have moved to ``static/djangocms_text/vendor/ckeditor4``.
Please reflect this if you use custom ckeditor4 plugins.

Editors
-------

``djangocms-text`` supports multiple rich text editors, which can be swapped out as
needed. The following editors are currently supported:

- **TipTap**: A modern rich text editor with a modular architecture, TipTap is currently
  in development and is the default editor. It supports text-enabled plugins, dynamic linking,
  and conversion of pasted markdown text into HTML. TipTap does not allow the user to edit
  HTML directly, which means that some formating options are lost when switching from
  CKEditor 4 to TipTap.
- **CKEditor 4**: The initial version of ``djangocms-text`` includes a port of the
  CKEditor 4 interface and child plugin functionality. This editor is compatible with
  the ``djangocms-text-ckeditor`` plugin, and can be used as a drop-in replacement.
  It supports inline editing and text-enabled plugins.
- **CKEditor 5**: To keep licenses separated, there is a
  `separate package <https://github.com/django-cms/djangocms-text-ckeditor5>`_
  ``djangocms-text-ckeditor5`` which provides CKEditor 5 as a rich text editor.


Configuration
-------------

Rich text editor selection
~~~~~~~~~~~~~~~~~~~~~~~~~~

To select a rich text editor, add the editor's package to your ``INSTALLED_APPS`` and
add the setting ``TEXT_EDITOR`` to point to the editor's ``RTEConfig`` path.

Example::

    INSTALLED_APPS = [
        ...,
        "djangocms_text.contrib.text_ckeditor4",
        ...
    ]

    TEXT_EDITOR = "djangocms_text.contrib.text_ckeditor4.ckeditor4"

Rich text editor global configuration
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The ``TEXT_EDITOR`` setting points to a ``RTEConfig`` object. You can create your custom
``RTEConfig`` instance.  The following attributes are available:

- name (str): The name of the RTE configuration.
- config (str): The configuration string.
- js (Iterable[str]): An iterable of JavaScript files to include.
- css (dict): A dictionary of CSS files to include.
- admin_css (Iterable[str]): An iterable of CSS files for the admin interface only.
- inline_editing (bool): Whether to enable inline editing.
- child_plugin_support (bool): Whether to support child plugins.
- configuration (dict): Additional configuration options for the RTE.
- additional_context (dict): Additional context to pass to global editor configuration.

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
        configuration={},  # Default configuration (see below)
    )

You can use the ``admin_css`` attribute to include CSS files that you need to be loaded into the
dialog window, e.g., to declare custom colors or other styles.

Adding configuration to rich text editor frontend
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Configuration to the rich text editor frontend can be passed by adding entries to the
``configuration`` property of the ``RTEConfig``. The contents depends on the rich text
editor frontend (TipTap, CKEditor 4, etc.).

The preferred method to add configuration to rich text editor frontend. Some configuration
can be done using the ``TEXT_EDITOR_SETTINGS`` which is a dictionary that corresponds
to the ``configuration`` property of the ``RTEConfig``. For backwards compatibility with
``djangocms-text-ckeditor``, ``CKEDITOR_SETTINGS`` is also passed on the the rich text
editor frontend (even if it is not CKEditor 4).

Here is an example for Tiptap which represents the default configuration:

.. code-block:: python

    # TipTap configuration
    DEFAULT_EDITOR.configuration = {
        "inlineStyles": [  # Styles menu, by default contains some rarer styles
                { name: 'Small', element: 'small' },
                { name: 'Kbd', element: 'kbd' },
                { name: 'Var', element: 'var' },
                { name: 'Samp', element: 'samp' },
            ],
        "blockStyles": [],
        # Block styles menu, e.g., for paragraphs, etc.; empty by default
        # Example entry: [{"name": "Lead", "element": "div", "attributes": {"class": "lead"}},]
        "textColors": {  # Colors offered for the text color menu - the keys are CSS classes
                'text-primary': {name: "Primary"},
                'text-secondary': {name: "Secondary"},
                'text-success': {name: "Success"},
                'text-danger': {name: "Danger"},
                'text-warning': {name: "Warning"},
                'text-info': {name: "Info"},
                'text-light': {name: "Light"},
                'text-dark': {name: "Dark"},
                'text-body': {name: "Body"},
                'text-muted': {name: "Muted"},
            },
        "tableClasses": "table",  # Classes added to new(!) tables
    }

Here's an example to configure the classes which should be added to new tables::

    # Option 1:
    # Modify the default editor configuration and point the ``TEXT_EDITOR`` setting to it
    from djangocms_text.editors import DEFAULT_EDITOR

    DEFAULT_EDITOR.configuration["tableClasses"] = "table ui"

    # Option 2:
    # Modify the default editor configurartion to offer choices to the editor
    from djangocms_text.editors import DEFAULT_EDITOR

    DEFAULT_EDITOR.configuration["tableClasses"] = [
        ["table", _("Default")],
        ["table table-striped", _("Striped")],
    ]

    # Option 3:
    # Both of the above can be replaced adding TEXT_EDITOR_SETTINGS to your settings.py
    TEXT_EDITOR_SETTINGS = {
        "tableClasses": "table ui",
    }


Inline editing feature
~~~~~~~~~~~~~~~~~~~~~~

Inline editing allows editors to directly click on a text plugin and change the contents
in django CMS' edit mode. The CKEditor appears directly around the text field and can be
used normally. Changes are saved as soon as the text field leaves focus.

Inline editing requires to encapsulate the HTML text in a ``<div>`` in edit mode. This
might cause some side effects with a site's CSS, e.g. direct child rules.

Inline editing is active by default. To deactivate inline editing add the
following line in your project's ``settings.py``:

.. code-block::

    TEXT_INLINE_EDITING = False

With inline editing active, a toggle button to the toolbar to allow to switch
inline editing on and off for the current session.

When inline editing is active the editor will save the plugin's content each time it
loses focus. If only text has changed the user can immediately continue to edit. If a
text-enabled plugin was changed, added, or removed he page will refresh to update the
page tree and get the correctly rendered version of the changed plugin.


Text-enabled plugins
~~~~~~~~~~~~~~~~~~~~

djangocms-text supports text-enabled plugins, not all rich text editor frontends
will, however.

If you have created a plugin that you want to use within Text plugins you can make them appear in the dropdown by
making them ``text_enabled``. This means that you assign the property ``text_enabled`` of a plugin to ``True``,
the default value is ``False``. Here is a very simple implementation::

    class MyTextPlugin(TextPlugin):
        name = "My text plugin"
        model = MyTextModel
        text_enabled = True

When the plugin is picked up, it will be available in the *CMS Plugins* dropdown (puzzle icon), which you can find in the
editor. This makes it very easy for users to insert special content in a user-friendly Text block, which they are familiar
with.

The plugin will even be previewed in the text editor. **Pro-tip**: make sure
your plugin provides its own ``icon_alt`` method. That way, if you have many
``text_enabled``-plugins, it can display a hint about it. For example, if you
created a plugin which displays prices of configurable product, it can
display a tooltip with the name of that product.

For more information about extending the CMS with plugins, read `django-cms doc`_ on how to do this.

.. _django-cms doc: http://docs.django-cms.org/en/latest/reference/plugins.html#cms.plugin_base.CMSPluginBase.text_enabled

Text-enabled plugins can have their own icons with djangocms-text. If the plugin
class has a ``text_icon`` property, it should contain a SVG source code of an
icon. The icon will be displayed in the CMS plugin pulldown menu, or in the toolbar.

.. code-block::

    class MyTextPlugin(TextPlugin):
        name = "My text plugin"
        model = MyTextModel
        text_enabled = True
        text_icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>'


You can also configure text-enabled plugins to be directly accessible from the rich
text editor toolbar by adding the plugin's name to the toolbar configuration,
e.g. ``"LinkPlugin"``.


Default content in Placeholder
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You can use ``TextPlugin`` in "default_plugins" (see docs
about the CMS_PLACEHOLDER_CONF_ setting). ``TextPlugin`` requires just
one value: ``body`` where you write your default HTML content. If you want to add some
"default children" to your automagically added plugin (i.e. a ``LinkPlugin``), you have
to put children references in the body. References are ``"%(_tag_child_<order>)s"`` with
the inserted order of children. For example:

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

.. _cms_placeholder_conf: http://docs.django-cms.org/en/latest/how_to/placeholders.html?highlight=cms_placeholder_conf


Configurable sanitizer
----------------------

``djangocms-text`` uses `nh3 <https://nh3.readthedocs.io/en/latest/>`_ to sanitize HTML to avoid
security issues and to check for correct HTML code.
Sanitisation may strip tags useful for some use cases such as ``iframe``;
you may customize the tags and attributes allowed by overriding the
``TEXT_ADDITIONAL_ATTRIBUTES`` setting::

    TEXT_ADDITIONAL_ATTRIBUTES = {
        'iframe': {'scrolling', 'allowfullscreen', 'frameborder'},
    }

Note that the ``TEXT_ADDITIONAL_ATTRIBUTES`` setting is a dictionary, where the keys are
the tag names and the values are sets of attribute names.

If you have settings in the style of djangocms-text-ckeditor, which utilizes
both ``TEXT_ADDITIONAL_TAGS`` and ``TEXT_ADDITIONAL_ATTRIBUTES``, those will
be translated for you automatically, but you will get a warning from the
Django checks framework at server startup.


**NOTE**: Some frontend editors will pre-sanitize your text before passing it to the web server,
rendering the above settings useless.

To completely disable the feature, set ``TEXT_HTML_SANITIZE = False``.

Usage outside django CMS
------------------------

django CMS Text can be used without django CMS installed. Without django CMS it
offers the ``HTMLField``, ``HTMLFormField``, and the ``TextEditorWidget`` class
which can be used by any Django model or form.

If django CMS is not installed with django CMS Text, add the following to your
``MIGRATION_MODULES`` setting::

    MIGRATION_MODULES = {
        ...,
        "djangocms_text": None,
        ...
    }

This will prevent the creation of the model for the django CMS text plugin.

Markdown-support
----------------
The TipTap frontend supports some (minimal) Markdown support:

* Markdown is converted to HTML when **pasting**. (To prevent XXS attacks, the
  pasted content might not be converted if it contains javascript scritps.)
* When **typing**, markdown syntax is converted on the fly

Supported Markdown syntax includes:

* Headings: ``# Heading 1``, ``## Heading 2``, ``### Heading 3``, etc.
* Bold: ``**bold text**`` or ``__bold text__``
* Italic: ``*italic text*`` or ``_italic text_``
* Strikethrough: ``~~strikethrough~~``
* Links: ``[link text](http://example.com)``
* Lists: ``- Item`` or ``* Item`` for unordered lists, and ``1. Item`` for ordered lists
* Blockquotes: ``> Quote``
* Code: ```inline code``` für Inline-Code, und dreifache Backticks für Code-Blöcke
* Tables (pasting only): Tables can be created using the `|` character to separate columns.
  For example, a simple table can be created as follows::

    | Header 1 | Header 2 |
    |----------|----------|
    | Row 1    | Row 2    |

* Horiuzontal rules: ``---`` to create a horizontal rule.


Contributing
------------

Contributions to ``djangocms-text`` are welcome! Please read our
`contributing guidelines <https://docs.django-cms.org/en/stable/contributing/index.html>`_
to get started.

pre-commit hooks
~~~~~~~~~~~~~~~~

The repo uses pre-commit git hooks to run tools which ensure code quality.

To utilise this, run ``pip install pre-commit`` and then ``pre-commit install``.

Building the JavaScript
~~~~~~~~~~~~~~~~~~~~~~~

``djangocms-text`` distributes a javascript bundle required for the plugin to work,
which contains frontend editors themselves and all the necessary plugins for functioning
within CMS. To build the bundle you need to have to install dependencies with
``nvm use``, ``npm install`` and then to run ``npx webpack``::

    $ nvm use
    $ npm install
    $ npx webpack

Acknowledgments
---------------

Special thanks to the Django CMS community and all contributors to the
``djangocms-text-ckeditor`` project.

License
-------

This project is licensed under the BSD-3-Clause License - see the LICENSE file for
details.


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
