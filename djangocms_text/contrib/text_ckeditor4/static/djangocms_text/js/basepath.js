// CKEDITOR_BASEPATH is setting for CKEditor 4 which reveals the base path from which to load config etc.
// It can be configured by the TEXT_CKEDITOR_BASEPATH setting in the Django settings file.
// It's loaded in this script since we avoid inline scripts (to better support CSP headers) and it needs to be
// set before the CKEditor script is loaded which in turn needs to be loaded before the integration script.

window.CKEDITOR_BASEPATH = document.currentScript.dataset.ckeditorBasepath

