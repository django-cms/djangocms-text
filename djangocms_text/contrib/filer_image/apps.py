"""AppConfig for the filer-image contrib.

Filer's directory-listing popup hands the JS the *thumbnail* URL of the
chosen file, not the original. This config adds a tiny JSON endpoint
``admin:filer_file_info_json`` to the filer ``FileAdmin`` so the JS
side can fetch the full image URL after the popup dismisses.

Hooked through ``AppConfig.ready()`` rather than ``__init__.py``
module-level code because we need filer's admin to already be
registered before we can patch ``FileAdmin.get_urls``.
"""

import json

from django.apps import AppConfig
from django.http import Http404, HttpResponseBadRequest, JsonResponse
from django.urls import NoReverseMatch, path, reverse


class FilerImageContribConfig(AppConfig):
    name = "djangocms_text.contrib.filer_image"
    label = "djangocms_text_filer_image"
    verbose_name = "django CMS Text — Filer image"

    def ready(self):
        try:
            from filer.admin.fileadmin import FileAdmin
        except ImportError:
            # filer not installed — nothing to patch. The JS side falls
            # back to using the picker's thumbnail URL.
            return

        # Idempotent: return if we already attached our URL patch.
        if getattr(FileAdmin.get_urls, "_filer_image_contrib_patched", False):
            return

        original_get_urls = FileAdmin.get_urls

        def get_urls(self):
            urls = [
                path(
                    "info-json/",
                    self.admin_site.admin_view(_file_info_view),
                    name="filer_file_info_json",
                ),
            ]
            return urls + original_get_urls(self)

        get_urls._filer_image_contrib_patched = True
        FileAdmin.get_urls = get_urls

        # Publish the endpoint URL via the editor's additional_context
        # so the JS in the page can locate it without hardcoding paths.
        # Set lazily on first request resolution; importing here avoids
        # a circular import with djangocms_text.editors at app-load.
        from djangocms_text.editors import DEFAULT_EDITOR

        try:
            info_url = reverse("admin:filer_file_info_json")
        except NoReverseMatch:
            return
        DEFAULT_EDITOR.additional_context.setdefault("filer_image_info_url", info_url)


def _file_info_view(request):
    """Return ``{id, url, label}`` for a filer file by id.

    Looked up via the ``id`` query parameter — keeps the URL stable so
    we can publish a single base URL to the JS rather than templating
    the file id into the path.
    """
    from filer.models import File

    raw_id = request.GET.get("id")
    try:
        file_id = int(raw_id)
    except (TypeError, ValueError):
        return HttpResponseBadRequest("missing or invalid `id` query parameter")

    try:
        obj = File.objects.get(pk=file_id)
    except File.DoesNotExist:
        raise Http404

    return JsonResponse(
        {
            "id": obj.id,
            "url": obj.url or "",
            "label": str(obj.label or ""),
        },
        # Don't pretty-print: this response is consumed by JS, not humans.
        json_dumps_params={"separators": (",", ":")},
        encoder=json.JSONEncoder,
    )
