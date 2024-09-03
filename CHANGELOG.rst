=========
Changelog
=========

0.2.3 (03-09-2024)
==================

* feat: Make HTMLField resizable
* fix: Reset some style for HTMLFields


0.2.2 / 0.2.1 (20-08-2024)
==========================

* fix: Let the migration only convert djangocms-text-ckeditor plugins if a corresponding table exists in the database
* fix: Let webpack import js map files from node libraries to remove references to non-existing map files in the js bundles
* fix: Unnecessary call to `static` in widget Media class made djangocms-text fail with manifest file storages

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
