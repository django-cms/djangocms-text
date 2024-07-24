import json
from copy import deepcopy
from itertools import groupby
from typing import Union

from django import forms
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from django.template.loader import render_to_string
from django.templatetags.static import static
from django.utils.safestring import mark_safe
from django.utils.translation.trans_real import get_language, gettext

from cms.utils.urlutils import admin_reverse, static_with_version

from . import settings as text_settings
from .editors import DEFAULT_TOOLBAR_CMS, DEFAULT_TOOLBAR_HTMLField, LazyEncoder, get_editor_base_config
from .editors import get_editor_config
from .utils import cms_placeholder_add_plugin


rte_config = get_editor_config()
#: The configuration for the text editor widget


class TextEditorWidget(forms.Textarea):
    class Media:
        css = {
            **rte_config.css,
            "all": (
                "djangocms_text/css/cms.text.css",
                *rte_config.css.get("all", ()),
            ),
        }
        js = (
            static_with_version("cms/js/dist/bundle.admin.base.min.js"),
            "djangocms_text/bundles/bundle.editor.min.js",
            *(static(js) for js in rte_config.js),
        )

    def __init__(
        self,
        attrs: dict[str, str] = None,
        installed_plugins=None,
        pk: Union[str, int] = None,
        placeholder=None,
        plugin_language: str = None,
        plugin_position: int = None,
        configuration=None,
        cancel_url: str = None,
        url_endpoint: str = None,
        render_plugin_url: str = None,
        action_token: str = None,
        revert_on_cancel: bool = False,
        body_css_classes: str = "",
    ):
        """
        Create a widget for editing text + plugins.

        installed_plugins is a list of plugins to display that are text_enabled
        """
        if attrs is None:
            attrs = {}

        self.editor_class = "CMS_Editor"
        if self.editor_class not in attrs.get("class", "").join(" "):
            new_class = f'{attrs.get("class", "")} {self.editor_class}'
            attrs["class"] = new_class.strip()
        self.editor_settings_id = f"cms-cfg-{pk if pk else attrs.get('id')}"
        attrs["data-settings"] = self.editor_settings_id

        super().__init__(attrs)

        self.installed_plugins = installed_plugins or [] # general
        self.pk = pk  # specific
        self.placeholder = (
            placeholder.pk if isinstance(placeholder, models.Model) else placeholder
        )  # specific
        self.plugin_language = plugin_language  # specific
        self.plugin_position = plugin_position  # specific
        if configuration and getattr(settings, configuration, False):
            conf = deepcopy(text_settings.CKEDITOR_SETTINGS)
            conf.update(getattr(settings, configuration))
            self.configuration = conf  # specific
        else:
            self.configuration = text_settings.CKEDITOR_SETTINGS  # TODO: Change to TEXT_EDITOR_SETTINGS
        self.cancel_url = cancel_url
        self.url_endpoint = url_endpoint
        self.render_plugin_url = render_plugin_url
        self.action_token = action_token  # specific
        self.revert_on_cancel = revert_on_cancel
        self.body_css_classes = (
            body_css_classes
            if body_css_classes
            else self.configuration.get("bodyClass", "")
        )

    def render_textarea(self, name, value, attrs=None, renderer=None):
        return super().render(name, value, attrs, renderer)

    def get_toolbar_setting(self, toolbar):
        toolbar_setting = get_editor_base_config()
        for plugin in self.installed_plugins:
            toolbar_setting[plugin["value"]] = {
                "title": plugin["name"],
                "icon": plugin["icon"],
            }
        return toolbar_setting

    def get_editor_settings(self, language):
        configuration = deepcopy(self.configuration)
        # We are in a plugin -> we use toolbar_CMS or a custom defined toolbar
        if self.placeholder:
            toolbar = configuration.get("toolbar", "CMS")
        # We are not in a plugin but toolbar is set to CMS (the default) ->
        # we force the use of toolbar_HTMLField
        elif configuration.get("toolbar", False) == "CMS":
            toolbar = "HTMLField"
        # Toolbar is not set or set to a custom value -> we use the custom
        # value or fallback to HTMLField
        else:
            toolbar = configuration.get("toolbar", "HTMLField")
        if f"toolbar_{toolbar}" in configuration:
            configuration["toolbar"] = configuration[f"toolbar_{toolbar}"]
        else:
            configuration["toolbar"] = DEFAULT_TOOLBAR_CMS if toolbar == "CMS" else DEFAULT_TOOLBAR_HTMLField

        # Remove toolbar_ keys from configuration to avoid sending unnecessary data
        for key in list(configuration.keys()):
            if key.startswith("toolbar_"):
                del configuration[key]

        configuration["bodyClass"] = self.body_css_classes
        config = json.dumps(configuration, cls=DjangoJSONEncoder)

        # Group plugins by module
        if self.installed_plugins:
            plugins = groupby(
                sorted(self.installed_plugins, key=lambda x: x.get("module")),
                key=lambda x: x.get("module"),
            )
            plugins = [
                {
                    "group": group,
                    "items": [
                        {"title": item.get("name"), "type": item.get("value")}
                        for item in items
                    ],
                }
                for group, items in plugins
            ]
        else:
            plugins = []

        return {
            "language": language,
            "installed_plugins": self.installed_plugins,
            "static_url": settings.STATIC_URL + "djangocms_text",
            "plugin_id": self.pk,
            "plugin_language": self.plugin_language,
            "plugin_position": self.plugin_position,
            "placeholder_id": self.placeholder if self.placeholder else None,
            "render_plugin_url": self.render_plugin_url or "",
            "add_plugin_url": admin_reverse(cms_placeholder_add_plugin)
            if self.placeholder
            else "",
            "cancel_plugin_url": self.cancel_url or "",
            "url_endpoint": self.url_endpoint or "",
            "revert_on_cancel": self.revert_on_cancel or False,
            "action_token": self.action_token or "",
            "lang_alt": {
                "toolbar": gettext("CMS Plugins"),
                "add": gettext("Add CMS Plugin"),
                "edit": gettext("Edit CMS Plugin"),
                "aria": gettext("CMS Plugins"),
            },
            "plugins": plugins,
            "options": json.loads(config.replace("{{ language }}", language)),
            "lang": json.loads(json.dumps(self.get_toolbar_setting(configuration["toolbar"]), cls=LazyEncoder)),
        }

    def render_additions(self, name, value, attrs=None, renderer=None):
        # id attribute is always present when rendering a widget
        editor_selector = attrs["id"]
        language = get_language().split("-")[0]

        context = {
            "editor_class": self.editor_class,
            "editor_selector": editor_selector,
            "editor_function": editor_selector.replace("-", "_"),
            "name": name,
            "language": language,
            "STATIC_URL": settings.STATIC_URL,
            "installed_plugins": self.installed_plugins,
            "plugin_pk": self.pk,
            "plugin_language": self.plugin_language,
            "plugin_position": self.plugin_position,
            "placeholder": self.placeholder,
            "widget": self,
            "renderer": renderer,
            "editor_settings": self.get_editor_settings(language),
            "editor_settings_id": self.editor_settings_id,
        }
        return mark_safe(render_to_string("cms/plugins/widgets/editor.html", context))

    def render(self, name, value, attrs=None, renderer=None):
        return self.render_textarea(name, value, attrs) + self.render_additions(
            name, value, attrs, renderer
        )
