=========
Changelog
=========

0.9.0 (10.06.2025)
==================
* feat: Add support for pasting Markdown by @fsbraun in https://github.com/django-cms/djangocms-text/pull/100
* feat: extend tiptap table to have a (configurable) class attribute by fsbraun in https://github.com/django-cms/djangocms-text/pull/76


0.8.8 (05-06-2025)
==================
* fix: Text-enabled plugins could not be added in django CMS 3.x by fsbraun in https://github.com/django-cms/djangocms-text/pull/99

0.8.7 (30-05-2025)
==================
* fix: table icons of inline ckeditor respect dark mode by @PeterW-LWL in https://github.com/django-cms/djangocms-text/pull/92
* feat: Add `CKEDITOR_BASEPATH` configuration for CKEditor 4 by @fsbraun in https://github.com/django-cms/djangocms-text/pull/94

**New Contributor**

@PeterW-LWL made their first contribution in https://github.com/django-cms/djangocms-text/pull/92

0.8.6 (23-05-2025)
==================

* fix: Adding text-enabled plugins failed after adding first plugin by @fsbraun in https://github.com/django-cms/djangocms-text/pull/91
* fix: Crashed if `STATIC_URL` was not set by @fsbraun

0.8.5 (15-05-2025)
==================

* fix: Quit atomic block for mysql migration by @fsbraun in https://github.com/django-cms/djangocms-text/pull/85
* fix: Support django CMS 5 data bridge for text-enabled plugins by @fsbraun in https://github.com/django-cms/djangocms-text/pull/87


0.8.4 (09-05-2025)
==================

* fix: Make toolbar sticky in modal by @fsbraun in https://github.com/django-cms/djangocms-text/pull/71
* fix(nh3): By default allow for data- and aria- attributes in HTML by @fsbraun in https://github.com/django-cms/djangocms-text/pull/84
* fix(nh3): Dictionary unpacking issue by @DmytroLitvinov in https://github.com/django-cms/djangocms-text/pull/77
* fix: Add patched moona-lisa theme supporting dark-mdoe by @fsbraun in https://github.com/django-cms/djangocms-text/pull/80
* fix: Typo in warning by @wfehr in https://github.com/django-cms/djangocms-text/pull/81
* fix: Add styling for bare django admin by @fsbraun in https://github.com/django-cms/djangocms-text/pull/75


0.8.3 (27-03-2025)
==================

* fix: Redraw errors with django CMS 5
* fix: z-index of top toolbar to hover above rest of UI

0.8.2 (26-03-2025)
==================

* fix: Add warning due to changed CKEditor 4 setting by @fsbraun in https://github.com/django-cms/djangocms-text/pull/68
* fix: Checks at startup crashed


0.8.0 (12-03-2025)
==================

* fix(settings): Remove duplication of Link and Unlink from HTMLField default settings by @DmytroLitvinov in https://github.com/django-cms/djangocms-text/pull/67
* fix: add migration to remove old ckeditor table by @earthcomfy in https://github.com/django-cms/djangocms-text/pull/61
* fix: InlineAdmin signals were missed by @fsbraun
* fix: Leaner event management by @fsbraun

**New Contributors**

* @DmytroLitvinov made their first contribution in https://github.com/django-cms/djangocms-text/pull/67
* @earthcomfy made their first contribution in https://github.com/django-cms/djangocms-text/pull/61

0.7.1 (04-03-2025)
==================

* fix: Fix issue failing intiialization of HTMLFields in the admin by @fsbraun

0.7.0 (02-03-2025)
==================

* fix: Avoid downcasting of text-enabled child plugins if plugins are already downcasted by @fsbraun in https://github.com/django-cms/djangocms-text/pull/58
* fix: ModuleNotFoundError when CMS is not installed by @fsbraun in https://github.com/django-cms/djangocms-text/pull/56
* fix: Chrome focus issue, django CMS 5 support by @fsbraun in https://github.com/django-cms/djangocms-text/pull/64

0.6.0 (06-02-2025)
==================

* fix: Remove cms imports where not necessary by @fsbraun in  https://github.com/django-cms/djangocms-text/pull/56
* fix: Avoid downcasting of text-enabled child plugins if plugins are already downcasted by @fsbraun in https://github.com/django-cms/djangocms-text/pull/58

0.5.3 (18-01-2025)
==================
* fix: Markup error disabled the block toolbar in inline editing
* fix: Handle partial page updates

0.5.2 (16-01-2025)
==================

* feat: Add text color from list of options by @fsbraun in https://github.com/django-cms/djangocms-text/pull/48
* feat: allows an ``admin_css: tuple`` in ``RTEConfig`` for a list of CSS files only to be loaded into the admin for the editor by @fsbraun in https://github.com/django-cms/djangocms-text/pull/49
* feat: Add configurable block and inline styles for Tiptap by @fsbraun in https://github.com/django-cms/djangocms-text/pull/51
* fix: Update CKEditor4 vendor files to work with CMS plugins
* fix: Update icon paths for CKEditor4

0.5.1 (30-12-2024)
==================

* fix: Proper registration of third-party RTE (CKEditor4 or 5, or other) by @fsbraun in https://github.com/django-cms/djangocms-text/pull/47

0.5.0 (28-12-2024)
==================

* feat: Add table support for TipTap editor by @fsbraun in https://github.com/django-cms/djangocms-text/pull/42
* feat: Improved dynamic link ui for tiptap editor by @fsbraun in https://github.com/django-cms/djangocms-text/pull/41
* feat: Improve tiptap-integration of toolbars for better UX by @fsbraun in https://github.com/django-cms/djangocms-text/pull/43
* fix: Clean up ckeditor4 vendor files by @fsbraun in https://github.com/django-cms/djangocms-text/pull/39
* fix: remove cke5 code by @fsbraun in https://github.com/django-cms/djangocms-text/pull/40

0.4.0 (11-12-2024)
==================

* feat: Remove explicit django CMS dependency by @fsbraun in https://github.com/django-cms/djangocms-text/pull/36
* feat: Integrate Jest for JavaScript testing with CI setup by @sourcery-ai in https://github.com/django-cms/djangocms-text/pull/28
* fix: Add row needs to initialize new editor instances for inline admins by @fsbraun in https://github.com/django-cms/djangocms-text/pull/37
* tests: Add missing tests by @fsbraun in https://github.com/django-cms/djangocms-text/pull/29
* ci: pre-commit autoupdate by @pre-commit-ci in https://github.com/django-cms/djangocms-text/pull/33
* tests: Add CKEditor integration tests and update dependencies by @sourcery-ai in https://github.com/django-cms/djangocms-text/pull/32
* build(deps): bump codecov/codecov-action from 4 to 5 by @dependabot in https://github.com/django-cms/djangocms-text/pull/26

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

* feat: Add migration for djangocms-text-ckeditor fields by @fsbraun in https://github.com/django-cms/djangocms-text/pull/13


0.1.3 (16-06-2024)
==================

* docs: Call webpack with npx, so that the local installation is found by @MacLake in https://github.com/django-cms/djangocms-text/pull/11
* Fix: Allow empty `installed_plugins`
* fix: Prepare css for drag / swipe in rtl mode by @fsbraun in https://github.com/django-cms/djangocms-text/pull/9
* fix: Add bundles to build

**New Contributor**

@MacLake made their first contribution in https://github.com/django-cms/djangocms-text/pull/11

0.1.0 (First alpha)
===================

* Initial release for testing
* Basic functionality for TipTap editor
