import re
from collections import OrderedDict
from functools import WRAPPER_ASSIGNMENTS, wraps
from typing import Optional

from django.template.defaultfilters import force_escape
from django.template import Context
from django.template.loader import render_to_string

try:
    from cms import __version__
    from cms.models import CMSPlugin
    from cms.utils.urlutils import admin_reverse
except ModuleNotFoundError:  # pragma: no cover
    from django.db.models import Model as CMSPlugin

    from django.urls import reverse

    __version__ = "0"

    def admin_reverse(viewname, args=None, kwargs=None, current_app=None):
        return reverse(f"admin:{viewname}", args, kwargs, current_app)


from packaging.version import Version


OBJ_ADMIN_RE_PATTERN = r'<cms-plugin .*?\bid="(?P<pk>\d+)".*?>.*?</cms-plugin>'
OBJ_ADMIN_WITH_CONTENT_RE_PATTERN = r'<cms-plugin .*?\bid="(?P<pk>\d+)".*?>(?P<content>.*?)</cms-plugin>'
OBJ_ADMIN_RE = re.compile(OBJ_ADMIN_RE_PATTERN, flags=re.DOTALL)


is_cms_v4 = Version(__version__) >= Version("3.9999")
if is_cms_v4:
    cms_placeholder_add_plugin = "cms_placeholder_add_plugin"
else:
    cms_placeholder_add_plugin = "cms_page_add_plugin"


def _render_cms_plugin(plugin: CMSPlugin, context):
    if callable(getattr(context, "flatten", None)):
        context = context.flatten()

    context["plugin"] = plugin

    # This my fellow enthusiasts is a hack..

    # If I let djangoCMS render the plugin using {% render_plugin %}
    # it will wrap the output in the toolbar markup which we don't want.

    # If I render the plugin without rendering a template first, then context processors
    # are not called and so plugins that rely on these like those using sekizai will error out.

    # The compromise is to render a template so that Django binds the context to it
    # and thus calls context processors AND render the plugin manually with the context
    # after it's been bound to a template.
    response = render_to_string(
        "cms/plugins/render_plugin_preview.html",
        context,
        request=context["request"],
    )
    return response


def random_comment_exempt(view_func: callable) -> callable:
    # Borrowed from
    # https://github.com/lpomfrey/django-debreach/blob/f778d77ffc417/debreach/decorators.py#L21
    # This is a no-op if django-debreach is not installed
    def wrapped_view(*args, **kwargs):
        response = view_func(*args, **kwargs)
        response._random_comment_exempt = True
        return response

    return wraps(view_func, assigned=WRAPPER_ASSIGNMENTS)(wrapped_view)


def plugin_to_tag(obj: CMSPlugin, content: str = "", admin: bool = False):
    plugin_attrs = OrderedDict(
        id=obj.pk,
        icon_alt=force_escape(obj.get_instance_icon_alt()),
        content=content,
    )

    if admin:
        # Include extra attributes when rendering on the admin
        plugin_class = obj.get_plugin_class()
        preview = getattr(plugin_class, "text_editor_preview", True)
        plugin_tag = (
            '<cms-plugin render-plugin=%(preview)s alt="%(icon_alt)s" '
            'title="%(icon_alt)s" id="%(id)d" type="%(type)s">%(content)s</cms-plugin>'
        )
        plugin_attrs["preview"] = "true" if preview else "false"
        plugin_attrs["type"] = plugin_class.__name__
    else:
        plugin_tag = '<cms-plugin alt="%(icon_alt)s" title="%(icon_alt)s" id="%(id)d">%(content)s</cms-plugin>'
    return plugin_tag % plugin_attrs


def plugin_tags_to_id_list(text, regex=OBJ_ADMIN_RE):
    def _find_plugins():
        for tag in regex.finditer(text):
            plugin_id = tag.groupdict().get("pk")

            if plugin_id:
                yield plugin_id

    return [int(_id) for _id in _find_plugins()]


def _plugin_tags_to_html(text: str, output_func: callable, child_plugin_instances: Optional[list[CMSPlugin]]) -> str:
    """
    Convert plugin object 'tags' into the form for public site.

    context is the template context to use, placeholder is the placeholder name
    """
    if child_plugin_instances is not None:
        plugins_by_id = {plugin.pk: plugin for plugin in child_plugin_instances}
    else:
        plugins_by_id = get_plugins_from_text(text)

    def _render_tag(m):
        try:
            plugin_id = int(m.groupdict()["pk"])
            obj = plugins_by_id[plugin_id]
        except KeyError:
            # Object must have been deleted.  It cannot be rendered to
            # end user so just remove it from the HTML altogether
            return ""
        else:
            obj._render_meta.text_enabled = True
            return output_func(obj, m)

    return OBJ_ADMIN_RE.sub(_render_tag, text)


def plugin_tags_to_user_html(text: str, context: Context, child_plugin_instances: list[CMSPlugin]) -> str:
    def _render_plugin(obj, match):
        return _render_cms_plugin(obj, context)

    return _plugin_tags_to_html(text, output_func=_render_plugin, child_plugin_instances=child_plugin_instances)


def plugin_tags_to_admin_html(text: str, context: Context, child_plugin_instances: list[CMSPlugin]) -> str:
    def _render_plugin(obj, match):
        plugin_content = _render_cms_plugin(obj, context)
        return plugin_to_tag(obj, content=plugin_content, admin=True)

    return _plugin_tags_to_html(text, output_func=_render_plugin, child_plugin_instances=child_plugin_instances)


def plugin_tags_to_db(text: str) -> str:
    def _strip_plugin_content(obj, match):
        return plugin_to_tag(obj).strip()

    return _plugin_tags_to_html(text, output_func=_strip_plugin_content, child_plugin_instances=None)


def replace_plugin_tags(text: str, id_dict, regex: str = OBJ_ADMIN_RE) -> str:
    from cms.models import CMSPlugin

    plugins_by_id = CMSPlugin.objects.in_bulk(id_dict.values())

    def _replace_tag(m):
        try:
            plugin_id = int(m.groupdict()["pk"])
            new_id = id_dict[plugin_id]
            plugin = plugins_by_id[new_id]
        except KeyError:  # pragma: no cover
            # Object must have been deleted.  It cannot be rendered to
            # end user, or edited, so just remove it from the HTML
            # altogether
            return ""
        return plugin_to_tag(plugin)

    return regex.sub(_replace_tag, text)


def get_plugins_from_text(text, regex=OBJ_ADMIN_RE):
    from cms.models import CMSPlugin
    from cms.utils.plugins import downcast_plugins

    plugin_ids = plugin_tags_to_id_list(text, regex)
    plugins = CMSPlugin.objects.filter(pk__in=plugin_ids).select_related("placeholder")
    plugin_list = downcast_plugins(plugins, select_placeholder=True)
    return {plugin.pk: plugin for plugin in plugin_list}


def get_render_plugin_url():
    """Get the url for rendering a text-enabled plugin for the toolbar"""
    return admin_reverse("djangocms_text_textplugin_render_plugin")


def get_cancel_url():
    """Get the url for cancelling a plugin edit"""
    return admin_reverse("djangocms_text_textplugin_revert_on_cancel")


def get_messages_url():
    """Get the url for cancelling a plugin edit"""
    return admin_reverse("djangocms_text_textplugin_get_messages")
