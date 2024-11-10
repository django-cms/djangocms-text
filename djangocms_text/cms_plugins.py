import json
import operator
import re

from django.apps import apps
from django.contrib.admin.utils import unquote
from django.contrib.messages import get_messages
from django.core import signing
from django.core.exceptions import FieldError, PermissionDenied, ValidationError
from django.db import transaction
from django.forms.fields import CharField
from django.http import (
    Http404,
    HttpResponse,
    HttpResponseBadRequest,
    HttpResponseForbidden,
    HttpResponseRedirect,
    JsonResponse,
)
from django.shortcuts import get_object_or_404
from django.template import RequestContext
from django.urls import re_path, reverse
from django.utils.decorators import method_decorator
from django.utils.encoding import force_str
from django.utils.translation import gettext, override
from django.views.decorators.clickjacking import xframe_options_sameorigin
from django.views.decorators.http import require_POST

from cms.models import CMSPlugin, Page
from cms.utils import get_language_from_request

from .settings import TEXT_CHILDREN_ENABLED


try:
    from cms.models import PageContent

    _version = 4
except ImportError:
    from cms.models import Title as PageContent

    _version = 3

from cms.plugin_base import CMSPluginBase
from cms.plugin_pool import plugin_pool
from cms.utils.placeholder import get_placeholder_conf
from cms.utils.urlutils import admin_reverse

from . import settings
from .forms import ActionTokenValidationForm, RenderPluginForm, TextForm
from .html import render_dynamic_attributes
from .models import Text
from .utils import (
    OBJ_ADMIN_WITH_CONTENT_RE_PATTERN,
    _plugin_tags_to_html,
    cms_placeholder_add_plugin,
    plugin_tags_to_admin_html,
    plugin_tags_to_id_list,
    plugin_tags_to_user_html,
    plugin_to_tag,
    random_comment_exempt,
    replace_plugin_tags,
)
from .widgets import TextEditorWidget, rte_config


def post_add_plugin(operation, **kwargs):
    from djangocms_history.actions import ADD_PLUGIN
    from djangocms_history.helpers import get_bound_plugins, get_plugin_data
    from djangocms_history.models import dump_json

    text_plugin = kwargs["plugin"]
    new_plugin_ids = set(text_plugin._get_inline_plugin_ids())

    if not new_plugin_ids:
        # User has not embedded any plugins on the text
        return

    new_plugins = CMSPlugin.objects.filter(pk__in=new_plugin_ids)
    new_plugins = get_bound_plugins(new_plugins)

    # Extend the recorded added plugins to include the inline plugins (if any)
    action = operation.actions.only("post_action_data").get(action=ADD_PLUGIN, order=1)
    post_data = json.loads(action.post_action_data)
    post_data["plugins"].extend(get_plugin_data(plugin) for plugin in new_plugins)
    action.post_action_data = dump_json(post_data)
    action.save(update_fields=["post_action_data"])


def pre_change_plugin(operation, **kwargs):
    from djangocms_history.actions import ADD_PLUGIN, DELETE_PLUGIN
    from djangocms_history.helpers import get_bound_plugins, get_plugin_data

    old_text_plugin = kwargs["old_plugin"]
    old_plugin_ids = set(old_text_plugin._get_inline_plugin_ids())

    new_text_plugin = kwargs["new_plugin"]
    new_plugin_ids = set(new_text_plugin._get_inline_plugin_ids())

    added_plugin_ids = new_plugin_ids.difference(old_plugin_ids)
    deleted_plugin_ids = old_plugin_ids.difference(new_plugin_ids)
    plugin_ids = added_plugin_ids | deleted_plugin_ids

    if added_plugin_ids == deleted_plugin_ids:
        # User has not added or removed embedded plugins
        return

    order = 1

    # This app is a special case.
    # We know the old and new tree orders because inline plugins
    # have already been set on the database when this pre operation
    # is executed.
    old_tree = (
        old_text_plugin.cmsplugin_set.filter(pk__in=old_plugin_ids).order_by("position").values_list("pk", flat=True)
    )
    old_tree = list(old_tree)

    new_tree = (
        new_text_plugin.cmsplugin_set.filter(pk__in=new_plugin_ids).order_by("position").values_list("pk", flat=True)
    )
    new_tree = list(new_tree)

    plugins = CMSPlugin.objects.filter(pk__in=plugin_ids)
    bound_plugins = list(get_bound_plugins(plugins))

    if added_plugin_ids:
        order += 1

        pre_action_data = {
            "order": old_tree,
            "parent_id": old_text_plugin.pk,
        }

        post_plugin_data = [get_plugin_data(plugin) for plugin in bound_plugins if plugin.pk in added_plugin_ids]
        post_action_data = {
            "order": new_tree,
            "parent_id": old_text_plugin.pk,
            "plugins": post_plugin_data,
        }

        operation.create_action(
            action=ADD_PLUGIN,
            language=old_text_plugin.language,
            placeholder=kwargs["placeholder"],
            pre_data=pre_action_data,
            post_data=post_action_data,
            order=order,
        )

    if deleted_plugin_ids:
        order += 1
        deleted_plugins = [plugin for plugin in bound_plugins if plugin.pk in deleted_plugin_ids]
        pre_plugin_data = [get_plugin_data(plugin) for plugin in deleted_plugins]
        pre_action_data = {
            "order": old_tree,
            "parent_id": old_text_plugin.pk,
            "plugins": pre_plugin_data,
        }

        post_plugin_data = [get_plugin_data(plugin, only_meta=True) for plugin in deleted_plugins]
        post_action_data = {
            "order": new_tree,
            "parent_id": old_text_plugin.pk,
            "plugins": post_plugin_data,
        }

        operation.create_action(
            action=DELETE_PLUGIN,
            language=old_text_plugin.language,
            placeholder=kwargs["placeholder"],
            pre_data=pre_action_data,
            post_data=post_action_data,
            order=order,
        )


class TextPlugin(CMSPluginBase):
    model = Text
    name = settings.TEXT_PLUGIN_NAME
    module = settings.TEXT_PLUGIN_MODULE_NAME
    form = TextForm
    render_template = "cms/plugins/text.html"
    inline_editing_template = "cms/plugins/inline.html"
    editor_configuration = settings.TEXT_CONFIGURATION
    disable_child_plugins = True
    fieldsets = ((None, {"fields": ("body", "json")}),)

    class Media:
        css = {"all": ("djangocms_text/css/cms.normalize.css",)}

    # These are executed by the djangocms-history app
    # We use them to inject inline plugin data
    operation_handler_callbacks = {
        "post_add_plugin": post_add_plugin,
        "pre_change_plugin": pre_change_plugin,
    }

    @classmethod
    def do_post_copy(cls, instance, source_map):
        ids = plugin_tags_to_id_list(instance.body)
        ids_map = {pk: source_map[pk].pk for pk in ids if pk in source_map}
        new_text = replace_plugin_tags(instance.body, ids_map)
        cls.model.objects.filter(pk=instance.pk).update(body=new_text)

    @staticmethod
    def get_translation_export_content(field, plugin_data):
        def _render_plugin_with_content(obj, match):
            from djangocms_translations.utils import get_text_field_child_label

            field = get_text_field_child_label(obj.plugin_type)
            content = getattr(obj, field) if field else ""
            return plugin_to_tag(obj, content)

        content = _plugin_tags_to_html(plugin_data[field], output_func=_render_plugin_with_content)
        subplugins_within_this_content = plugin_tags_to_id_list(content)
        return content, subplugins_within_this_content

    @staticmethod
    def set_translation_import_content(content, plugin):
        data = [x.groups() for x in re.finditer(OBJ_ADMIN_WITH_CONTENT_RE_PATTERN, content)]
        data = {int(pk): value for pk, value in data}

        return {subplugin_id: data[subplugin_id] for subplugin_id in plugin_tags_to_id_list(content)}

    def get_editor_widget(self, request, plugins, plugin):
        """
        Returns the Django form Widget to be used for
        the text area
        """
        cancel_url_name = self.get_admin_url_name("revert_on_cancel")
        cancel_url = reverse(f"admin:{cancel_url_name}")

        render_plugin_url_name = self.get_admin_url_name("render_plugin")
        render_plugin_url = reverse(f"admin:{render_plugin_url_name}")

        action_token = self.get_action_token(request, plugin)

        if plugin:
            widget = TextEditorWidget(
                installed_plugins=plugins,
                pk=plugin.pk,
                placeholder=plugin.placeholder,
                plugin_language=plugin.language,
                plugin_position=plugin.position,
                configuration=self.editor_configuration,
                render_plugin_url=render_plugin_url,
                cancel_url=cancel_url,
                action_token=action_token,
                revert_on_cancel=settings.TEXT_CHILDREN_ENABLED and rte_config.child_plugin_support,
                body_css_classes=self._get_body_css_classes_from_parent_plugins(plugin),
            )
        else:
            widget = TextEditorWidget(
                installed_plugins=plugins,
                pk=None,
                placeholder=request.GET["placeholder_id"],
                plugin_language=request.GET["plugin_language"],
                plugin_position=request.GET["plugin_position"],
                configuration=self.editor_configuration,
                render_plugin_url=render_plugin_url,
                cancel_url=cancel_url,
                action_token=action_token,
                revert_on_cancel=False,
                body_css_classes="",
            )
        return widget

    def _get_body_css_classes_from_parent_plugins(
        self,
        plugin_instance: CMSPlugin,
        css_classes: str = "",
    ) -> str:
        """
        Recursion that collects CMSPluginBase.child_ckeditor_body_css_class attribute values,
        it allows to style content within WYSIWYG iframe <body> based on its parent plugins.
        """
        parent_current = plugin_instance.parent
        if parent_current:
            for plugin_name, plugin_class in plugin_pool.plugins.items():
                is_current_parent_found = plugin_name == parent_current.plugin_type
                if is_current_parent_found:
                    body_css_class = ""
                    if getattr(plugin_class, "child_ckeditor_body_css_class", False):
                        body_css_class = plugin_class.child_ckeditor_body_css_class
                    if getattr(plugin_class, "get_child_ckeditor_body_css_class", False):
                        body_css_class = plugin_class.get_child_ckeditor_body_css_class(parent_current)

                    if body_css_class and (body_css_class not in css_classes):
                        css_classes += " " + body_css_class

            css_classes_collected = self._get_body_css_classes_from_parent_plugins(
                parent_current,
                css_classes,
            )
            if css_classes_collected not in css_classes:
                css_classes += css_classes_collected
        return css_classes

    def get_form_class(self, request, plugins, plugin):
        """
        Returns a subclass of Form to be used by this plugin
        """
        widget = self.get_editor_widget(
            request=request,
            plugins=plugins,
            plugin=plugin,
        )

        instance = plugin.get_plugin_instance()[0] if plugin else None

        if instance:
            context = RequestContext(request)
            context["request"] = request
            rendered_text = plugin_tags_to_admin_html(
                text=instance.body,
                context=context,
            )
        else:
            rendered_text = None

        # We avoid mutating the Form declared above by subclassing
        class TextPluginForm(self.form):
            body = CharField(widget=widget, required=False)

            def __init__(self, *args, **kwargs):
                initial = kwargs.pop("initial", {})

                if rendered_text:
                    initial["body"] = rendered_text
                super().__init__(*args, initial=initial, **kwargs)

        return TextPluginForm

    @staticmethod
    def _create_ghost_plugin(placeholder, plugin):
        """CMS version-save function to add a plugin to a placeholder"""
        if hasattr(placeholder, "add_plugin"):  # available as of CMS v4
            placeholder.add_plugin(plugin)
        else:  # CMS < v4
            plugin.save()

    @xframe_options_sameorigin
    def add_view(self, request, form_url="", extra_context=None):
        if "plugin" in request.GET:
            # CMS >= 3.4 compatibility
            self.cms_plugin_instance = self._get_plugin_or_404(request.GET["plugin"])

        if (
            not settings.TEXT_CHILDREN_ENABLED
            or not rte_config.child_plugin_support
            or getattr(self, "cms_plugin_instance", None)
        ):
            # This can happen if the user did not properly cancel the plugin
            # and so a "ghost" plugin instance is left over.
            # The instance is a record that points to the Text plugin
            # but is not a real text plugin instance.
            return super().add_view(
                request,
                form_url,
                extra_context,
            )

        if not self.has_add_permission(request):
            # this permission check is done by Django on the normal
            # workflow of adding a plugin.
            # This is NOT the normal workflow because we create a plugin
            # on GET request to the /add/ endpoint and so we bypass
            # django's add_view, thus bypassing permission check.
            message = gettext("You do not have permission to add a plugin.")
            return HttpResponseForbidden(force_str(message))

        _data = self._cms_initial_attributes
        data = {
            "plugin_language": _data["language"],
            "placeholder_id": _data["placeholder"],
            "parent": _data["parent"],
            "position": _data["position"],
            "plugin_type": _data["plugin_type"],
            "plugin_parent": _data["parent"],
        }

        # Sadly we have to create the CmsPlugin record on add GET request
        # because we need this record in order to allow the user to add
        # child plugins to the text (image, link, etc..)
        plugin = CMSPlugin(
            language=data["plugin_language"],
            plugin_type=data["plugin_type"],
            placeholder=data["placeholder_id"],
            position=data["position"],
            parent=data.get("plugin_parent"),
        )
        self._create_ghost_plugin(data["placeholder_id"], plugin)

        query = request.GET.copy()
        query["plugin"] = str(plugin.pk)

        success_url = admin_reverse(cms_placeholder_add_plugin)  # Version dependent
        # Because we've created the cmsplugin record
        # we need to delete the plugin when a user cancels.
        success_url += "?revert-on-cancel&" + query.urlencode()
        return HttpResponseRedirect(success_url)

    def get_plugin_urls(self):
        def pattern(regex, func):
            name = self.get_admin_url_name(func.__name__)
            return re_path(regex, func, name=name)

        url_patterns = [
            pattern(r"^render-plugin/$", self.render_plugin),
            pattern(r"^revert-on-cancel/$", self.revert_on_cancel),
            pattern(r"^urls/$", self.get_available_urls),
            pattern(r"^messages/$", self.get_messages),
        ]
        return url_patterns

    def get_admin_url_name(self, name):
        plugin_type = self.__class__.__name__.lower()
        url_name = f"{self.model._meta.app_label}_{plugin_type}_{name}"
        return url_name

    def _get_text_plugin_from_request(self, request, data):
        if not (request.user.is_active and request.user.is_staff):
            raise PermissionDenied

        form = ActionTokenValidationForm(data)
        if form.is_valid():
            session_key = request.session.session_key
            text_plugin_id = form.get_id_from_token(session_key)

            if text_plugin_id:
                return self._get_plugin_or_404(text_plugin_id)

        message = gettext("Unable to process your request. Invalid token.")
        raise ValidationError(message=force_str(message))

    @random_comment_exempt
    @xframe_options_sameorigin
    def render_plugin(self, request):
        try:
            text_plugin = self._get_text_plugin_from_request(request, data=request.GET)
        except ValidationError as error:
            return HttpResponseBadRequest(error.message)

        form = RenderPluginForm(request.GET, text_plugin=text_plugin)
        if not form.is_valid():
            # plugin not found, inform CKEDITOR.plugins.insertPlugin to remove it
            return HttpResponse(status=204)

        plugin_class = text_plugin.get_plugin_class_instance()
        # The following is needed for permission checking
        plugin_class.opts = plugin_class.model._meta

        if not (
            plugin_class.has_change_permission(request, obj=text_plugin)
            and text_plugin.placeholder.has_change_permission(request.user)  # noqa
        ):
            raise PermissionDenied
        return HttpResponse(form.render_plugin(request))

    @method_decorator(require_POST)
    @xframe_options_sameorigin
    @transaction.atomic
    def revert_on_cancel(self, request):
        # This view is responsible for deleting a plugin
        # bypassing the delete permissions.
        try:
            text_plugin = self._get_text_plugin_from_request(request, data=request.POST)
        except (ValidationError, Http404):
            # Fail silently, since otherwise the user will see a 404 page in a message box
            return HttpResponse(status=204)

        plugin_class = text_plugin.get_plugin_class_instance()
        # The following is needed for permission checking
        plugin_class.opts = plugin_class.model._meta
        if not (
            plugin_class.has_add_permission(request) and text_plugin.placeholder.has_change_permission(request.user)  # noqa
        ):
            raise PermissionDenied

        downcasted_plugin, _ = text_plugin.get_plugin_instance()

        if downcasted_plugin:  # no ghost plugin?
            # This check prevents users from using a cancel token
            # to delete just any text plugin.
            # For already-saved plugins just run clean_plugins
            downcasted_plugin.clean_plugins()
        else:
            # Version-safe plugin delete method
            placeholder = text_plugin.placeholder
            if hasattr(placeholder, "delete_plugin"):  # since CMS v4
                placeholder.delete_plugin(text_plugin)
            else:  # up to CMS v3.11
                text_plugin.delete()

        # 204 -> request was successful but no response returned.
        return HttpResponse(status=204)

    def get_available_urls(self, request):
        if not (request.user.is_active and request.user.is_staff):
            raise PermissionDenied

        if request.GET.get("g"):
            # Get name of a reference
            try:
                model, pk = request.GET.get("g").split(":")
                app, model = model.split(".")
                model = apps.get_model(app, model)
                obj = model.objects.get(pk=pk)
                if isinstance(obj, Page) and _version >= 4:
                    obj = obj.pagecontent_set(manager="admin_manager").current_content().first()
                    return JsonResponse({"text": obj.title, "url": obj.get_absolute_url()})
                return JsonResponse({"text": str(obj), "url": obj.get_absolute_url()})
            except Exception as e:
                return JsonResponse({"error": str(e)})

        search = request.GET.get("q", "").strip("  ").lower()
        language = get_language_from_request(request)
        if _version >= 4:
            try:
                # django CMS 4.2+
                qs = list(
                    PageContent.admin_manager.filter(language=language, title__icontains=search)
                    .current_content()
                    .order_by("page__path")
                )
            except FieldError:
                # django CMS 4.0 - 4.1
                qs = list(
                    PageContent.admin_manager.filter(language=language, title__icontains=search)
                    .current_content()
                    .order_by("page__node__path")
                )
        else:
            # django CMS 3
            qs = list(
                PageContent.objects.filter(language=language, title__icontains=search).order_by("page__node__path")
            )
            for page_content in qs:
                # Patch the missing get_absolute_url method
                page_content.get_absolute_url = lambda: page_content.page.get_absolute_url()
        urls = {
            "results": [
                {
                    "text": force_str(Page._meta.verbose_name_plural).capitalize(),
                    "children": [
                        {
                            "text": " " * (0 if search else len(page_content.page.node.path) // 4 - 1)
                            + page_content.title,
                            "url": page_content.get_absolute_url(),
                            "id": f"cms.page:{page_content.page.pk}",
                            "verbose": page_content.title,
                        }
                        for page_content in qs
                    ],
                }
            ]
        }
        return JsonResponse(urls)

    def get_messages(self, request):
        """Serve the messages that the admin might have started piling"""
        messages = get_messages(request)
        return JsonResponse(
            {
                "messages": [
                    {
                        "message": message.message,
                        "level": message.level,
                        "level_tag": message.level_tag,
                    }
                    for message in messages
                ]
            }
        )

    @classmethod
    def get_child_plugin_candidates(cls, slot, page):
        """

        This method is a class method that returns a list of child plugin candidates for a given slot and page.

        Parameters:
        - slot: The placeholder where the child plugins will be rendered.
        - page: The page object where the child plugins will be rendered.

        Returns:
        - A list of text-enabled plugins that can be used as child plugins for the given slot and page.
        """
        text_enabled_plugins = plugin_pool.get_text_enabled_plugins(
            placeholder=slot,
            page=page,
        )
        # Filter out plugins that are not in the whitelist if given
        if settings.TEXT_CHILDREN_WHITELIST is not None:
            text_enabled_plugins = [
                plugin for plugin in text_enabled_plugins if plugin.__name__ in settings.TEXT_CHILDREN_WHITELIST
            ]
        # Filter out plugins that are in the blacklist
        if settings.TEXT_CHILDREN_BLACKLIST:
            text_enabled_plugins = [
                plugin for plugin in text_enabled_plugins if plugin.__name__ not in settings.TEXT_CHILDREN_BLACKLIST
            ]
        return text_enabled_plugins

    def render_plugin_icon(self, plugin):
        icon = getattr(plugin, "text_icon", None)
        if icon is None:
            return
        if "cms-icon" in icon:
            return f'<span class="{icon}"></span>'
        return icon

    def get_plugins(self, obj=None):
        plugin = getattr(self, "cms_plugin_instance", None) or obj
        if not plugin or not TEXT_CHILDREN_ENABLED or not rte_config.child_plugin_support:
            return []
        get_plugin = plugin_pool.get_plugin
        child_plugin_types = self.get_child_classes(
            slot=plugin.placeholder.slot,
            page=self.page,
        )
        child_plugins = (get_plugin(name) for name in child_plugin_types)
        template = getattr(self.page, "template", None)

        modules = get_placeholder_conf("plugin_modules", plugin.placeholder.slot, template, default={})
        names = get_placeholder_conf("plugin_labels", plugin.placeholder.slot, template, default={})
        main_list = []

        # plugin.value points to the class name of the plugin
        # It's added on registration. TIL.
        for plugin in child_plugins:
            main_list.append(
                {
                    "value": plugin.value,
                    "name": names.get(plugin.value, plugin.name),
                    "icon": self.render_plugin_icon(plugin),
                    "module": modules.get(plugin.value, plugin.module),
                }
            )
        return sorted(main_list, key=operator.itemgetter("module"))

    def get_form(self, request, obj=None, **kwargs):
        plugin = getattr(self, "cms_plugin_instance", None) or obj
        plugins = self.get_plugins(obj)
        form = self.get_form_class(
            request=request,
            plugins=plugins,
            plugin=plugin,
        )
        kwargs["form"] = form  # override standard form
        return super().get_form(request, obj, **kwargs)

    def get_render_template(self, context, instance, placeholder):
        if self.inline_editing_active(context.get("request")):
            return self.inline_editing_template
        else:
            return self.render_template

    @staticmethod
    def inline_editing_active(request):
        return (
            settings.TEXT_INLINE_EDITING
            and rte_config.inline_editing
            and hasattr(request, "toolbar")
            and request.toolbar.edit_mode_active
            and request.session.get("inline_editing", True)
        )

    def render(self, context, instance, placeholder):
        request = context.get("request")
        if self.inline_editing_active(request):
            with override(request.toolbar.toolbar_language):
                widget = self.get_editor_widget(context["request"], self.get_plugins(instance), instance)
                editor_settings = widget.get_editor_settings(request.toolbar.toolbar_language.split("-")[0])
                global_settings = widget.get_global_settings(request.toolbar.toolbar_language.split("-")[0])

            body = render_dynamic_attributes(instance.body, admin_objects=True, remove_attr=False)

            context.update(
                {
                    "body": plugin_tags_to_admin_html(body, context),
                    "placeholder": placeholder,
                    "object": instance,
                    "editor_settings": editor_settings,
                    "editor_settings_id": widget.editor_settings_id,
                    "global_settings": global_settings,
                    "global_settings_id": widget.global_settings_id,
                }
            )
        else:
            body = render_dynamic_attributes(instance.body, admin_objects=False, remove_attr=True)
            context.update(
                {
                    "body": plugin_tags_to_user_html(body, context),
                    "placeholder": placeholder,
                    "object": instance,
                }
            )
        return context

    def save_model(self, request, obj, form, change):
        if getattr(self, "cms_plugin_instance", None):
            # Because the plugin was created by manually
            # creating the CmsPlugin record, it's important
            # to assign all the values from the CmsPlugin record
            # to the real "non ghost" instance.
            fields = self.cms_plugin_instance._meta.fields

            for field in fields:
                # assign all the fields - we can do this, because object is
                # subclassing cms_plugin_instance (one to one relation)
                value = getattr(self.cms_plugin_instance, field.name)
                setattr(obj, field.name, value)
        obj.rte = rte_config.name
        super().save_model(request, obj, form, change)
        # This must come after calling save
        # If `clean_plugins()` deletes child plugins, django-treebeard will call
        # save() again on the Text instance (aka obj in this context) to update mptt values (numchild, etc).
        # See this ticket for details https://github.com/divio/djangocms-text-ckeditor/issues/212
        obj.clean_plugins()
        obj.copy_referenced_plugins()

    @staticmethod
    def get_action_token(request, obj):
        if not obj:
            return ""
        plugin_id = force_str(obj.pk)
        # salt is different for every user
        signer = signing.Signer(salt=request.session.session_key)
        return signer.sign(plugin_id)

    def _get_plugin_or_404(self, pk):
        plugin_type = self.__class__.__name__
        plugins = CMSPlugin.objects.select_related("placeholder", "parent").filter(plugin_type=plugin_type)

        field = self.model._meta.pk

        try:
            object_id = field.to_python(unquote(pk))
        except (ValidationError, ValueError):
            raise Http404("Invalid plugin id")
        return get_object_or_404(plugins, pk=object_id)


plugin_pool.register_plugin(TextPlugin)
