djangocms-text
==============

|pypi| |coverage| |precommit| |python| |django| |djangocms| |djangocms4|

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

Install ``djangocms-text`` using pip: ``pip install djangocms-text``.

Build latest development branch using git:

.. code-block:: bash

    git clone git@github.com:fsbraun/djangocms-text.git
    cd djangocms-text
    nvm use
    npm install
    npx webpack --mode development

You then can install the cloned repo using ``pip install -e
/path/to/the/repo/djangocms-text``.

Finally, add ``djangocms_text`` to your ``INSTALLED_APPS`` in your Django project
settings:

.. code-block:: python

    INSTALLED_APPS = [..., "djangocms_text", ...]

Add an editor frontend to your installed apps (if different from the
default TipTap frontend), and set the editor you want to use:

.. code-block:: python

    INSTALLED_APPS = [..., "djangocms_text.contrib.text_ckeditor4", ...]
    TEXT_EDITOR = "djangocms_text.contrib.text_ckeditor4.ckeditor4"


Upgrading from djangocms-text-ckeditor
--------------------------------------

djangocms-text's migrations automatically migrate existing text plugins
from djangocms-text-ckeditor. All you have to do is:

* uninstall ``djangocms-text-ckeditor``
* remove ``djangocms_text_ckeditor`` from ``INSTALLED_APPS``
* add ``djangocms_text`` to ``INSTALLED_APPS`` (see above)
* run ``python -m manage migrate djangocms_text``

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

Using ckeditor4
---------------

You can continue to use ckeditor4. Compared to djangocms-text-ckeditor, the
ckeditor4 sources have moved to ``static/djangocms_text/vendor/ckeditor4``.
Please reflect this if you use custom ckeditor4 plugins.

Usage
-----

After installation, ``djangocms-text`` can be used as your rich text editor in Django
CMS. It can be used as a drop-in for `djangocms-text-ckeditor
<https://github.com/django-cms/djangocms-text-ckeditor>`_. Detailed documentation on
usage and customization will be provided.

Editors
-------

``djangocms-text`` supports multiple rich text editors, which can be swapped out as
needed. The following editors are currently supported:

- **TipTap**: A modern rich text editor with a modular architecture, TipTap is currently
  in development and is the default editor. TipTap does not allow the user to edit
  HTML directly, which means that some formating options are lost when switching from
  CKEditor 4 to TipTap.
- **CKEditor 4**: The initial version of ``djangocms-text`` includes a port of the
  CKEditor 4 interface and child plugin functionality. This editor is compatible with
  the ``djangocms-text-ckeditor`` plugin, and can be used as a drop-in replacement.
  It supports inline editing and text-enabled plugins.
- **CKEditor 5**: To keep licenses separated, there is a
  `separate package <https://github.com/django-cms/djangocms-text-ckeditor5>`_
  ``djangocms-text-ckeditor5`` which provides CKEditor 5 as a rich text editor.


Contributing
------------

Contributions to ``djangocms-text`` are welcome! Please read our contributing guidelines
to get started.

License
-------

This project is licensed under the BSD-3-Clause License - see the LICENSE file for
details.

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


Development
===========

pre-commit hooks
----------------

The repo uses pre-commit git hooks to run tools which ensure code quality.

To utilise this, run ``pip install pre-commit`` and then ``pre-commit install``.

Building the JavaScript
-----------------------

``djangocms-text`` distributes a javascript bundle required for the plugin to work,
which contains frontend editors themselves and all the necessary plugins for functioning
within CMS. To build the bundle you need to have to install dependencies with
``nvm use``, ``npm install`` and then to run ``npx webpack``.

Acknowledgments
---------------

- Special thanks to the Django CMS community and all contributors to the
  ``djangocms-text-ckeditor`` project.



.. |pypi| image:: https://badge.fury.io/py/djangocms-text.svg
    :target: http://badge.fury.io/py/djangocms-text
.. |coverage| image:: https://codecov.io/gh/django-cms/djangocms-text/branch/main/graph/badge.svg
    :target: https://codecov.io/gh/django-cms/djangocms-text
.. |python| image:: https://img.shields.io/badge/python-3.10+-blue.svg
    :target: https://pypi.org/project/djangocms-text/
.. |django| image:: https://img.shields.io/badge/django-4.2+-blue.svg
    :target: https://www.djangoproject.com/
.. |djangocms| image:: https://img.shields.io/badge/django%20CMS-3.11%2B-blue.svg
    :target: https://www.django-cms.org/
.. |djangocms4| image:: https://img.shields.io/badge/django%20CMS-4-blue.svg
    :target: https://www.django-cms.org/
.. |precommit| image:: https://results.pre-commit.ci/badge/github/django-cms/djangocms-text/main.svg
   :target: https://results.pre-commit.ci/latest/github/django-cms/djangocms-text/main
   :alt: pre-commit.ci status
