=========
Changelog
=========

0.3.3 (05-11-2024)
==================

* feat: Add initial djangocms-link support by @fsbraun in https://github.com/django-cms/djangocms-text/pull/22
* feat: Added support for djangocms-link url endpoint by @fsbraun in https://github.com/django-cms/djangocms-text/pull/23
* fix: Add missing styles for add/edit plugin dialog by @fsbraun in https://github.com/django-cms/djangocms-text/pull/24
* fix: Events prevented selection from link dropdown by @fsbraun in https://github.com/django-cms/djangocms-text/pull/25


0.3.2 (07-10-2024)
==================

* fix: Improve inline editing experience for django CMS v3


0.3.1 (02-10-2024)
==================

* feat: Moved CKEditor 5 code to https://github.com/django-cms/djangocms-text-ckeditor5
  due to licensing issues


0.3.0 (26-09-2024)
==================

* feat: Inline editor for CharField (no-frills editor)
* feat: Auto-detection of inline-editable fields (HTMLFormField and CharField)
  in both models and plugins
* feat: Enable inline-editing for models that support
  ``{% render_model instance "field_name" "field_name" %}`` command (renders the
  named field of the instance and opens an editor with only this field in the
  frontend) available since django CMS 3.0 - requires their admin to have the
  ``FrontendEditableAdmin`` mixin
* fix: HTML editor size in modals of text plugin independent of the row attribute
* fix: Made URL target selection available in HTMLFields
* fix: Balloon toolbar (for block commands, typically positioned left of the
  current editing line) now allows for scrolling


0.2.3 (03-09-2024)
==================

* feat: Make HTMLField resizable
* fix: Reset some style for HTMLFields


0.2.2 / 0.2.1 (20-08-2024)
==========================

* fix: Let the migration only convert djangocms-text-ckeditor plugins if a corresponding table exists in the database
* fix: Let webpack import js map files from node libraries to remove references to non-existing map files in the js bundles
* fix: Unnecessary call to ``static`` in widget Media class made djangocms-text fail with manifest file storages

0.2.0 (24-07-2024)
==================

What's Changed
--------------

* feat: Add migration for djangocms-text-ckeditor fields by @fsbraun in https://github.com/django-cms/djangocms-text/pull/13


0.1.3 (16-06-2024)
==================

What's Changed
--------------
* docs: Call webpack with npx, so that the local installation is found by @MacLake in https://github.com/django-cms/djangocms-text/pull/11
* Fix: Allow empty `installed_plugins`
* fix: Prepare css for drag / swipe in rtl mode by @fsbraun in https://github.com/django-cms/djangocms-text/pull/9
* fix: Add bundles to build

New Contributors
----------------
* @MacLake made their first contribution in https://github.com/django-cms/djangocms-text/pull/11

0.1.0 (First alpha)
===================

* Initial release for testing
* Basic functionality for TipTap editor
