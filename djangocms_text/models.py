from copy import deepcopy

from django.apps import apps
from django.db import models
from django.utils.encoding import force_str
from django.utils.html import strip_tags
from django.utils.text import Truncator
from django.utils.translation import gettext_lazy as _

if apps.is_installed("cms"):
    from cms.models import CMSPlugin

    from . import settings
    from .html import clean_html, extract_images
    from .utils import plugin_tags_to_db, plugin_tags_to_id_list, plugin_to_tag, replace_plugin_tags

    try:
        from softhyphen.html import hyphenate
    except ImportError:

        def hyphenate(t):
            return t

    class AbstractText(CMSPlugin):
        """
        Abstract Text Plugin Class designed to be backwards compatible with
        djangocms-text-ckeditor:

        1. If the json field is empty, the editor reads text from the body field.
        2. When saving, the editor writes to the body field and the json field. It also sets
           the rte field with a unique label identifying the json dialect used to represent
           the rich text.
        3. If the rte field is not known to the frontend editor, the plugin is read-only.
        4. if the rte field is known to the frontend editor, it takes precedence over the
           body field.

        djangocms-text-ckeditor Text fields are migrated by copying the body field only.
        """

        # Add an app namespace to related_name to avoid field name clashes
        # with any other plugins that have a field with the same name as the
        # lowercase of the class name of this model.
        # https://github.com/divio/django-cms/issues/5030
        cmsplugin_ptr = models.OneToOneField(
            CMSPlugin,
            on_delete=models.CASCADE,
            related_name="%(app_label)s_%(class)s",
            parent_link=True,
        )
        body = models.TextField(_("body"))
        json = models.JSONField(_("json"), blank=True, null=True)
        rte = models.CharField(
            default="",
            blank=True,
            max_length=16,
            help_text="The rich text editor used to create this text. JSON formats vary between editors.",
        )

        search_fields = ("body",)

        class Meta:
            abstract = True

        def __str__(self):
            return Truncator(strip_tags(self.body).replace("&shy;", "")).words(3, truncate="...")

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.body = force_str(self.body)

        def clean(self):
            self.body = plugin_tags_to_db(self.body)

        def save(self, *args, **kwargs):
            super().save(*args, **kwargs)
            body = self.body
            body = extract_images(body, self)
            body = clean_html(body, full=False)
            if settings.TEXT_AUTO_HYPHENATE:
                try:
                    body = hyphenate(body, language=self.language)
                except (TypeError, CMSPlugin.DoesNotExist):
                    body = hyphenate(body)
            self.body = body
            # no need to pass args or kwargs here
            # this 2nd save() call is internal and should be
            # fully managed by us.
            # think of it as an update() vs save()
            super().save(update_fields=("body",))

        def clean_plugins(self):
            ids = self._get_inline_plugin_ids()
            unbound_plugins = self.cmsplugin_set.exclude(pk__in=ids)

            for plugin in unbound_plugins:
                # delete plugins that are not referenced in the text anymore
                plugin.delete()

        def copy_referenced_plugins(self):
            if referenced_plugins := self.get_referenced_plugins():
                plugin_pairs = []
                for source_plugin in referenced_plugins:
                    new_plugin = deepcopy(source_plugin)
                    new_plugin.pk = None
                    new_plugin.id = None
                    new_plugin._state.adding = True
                    new_plugin.parent = self
                    if hasattr(self.placeholder, "add_plugin"):  # CMS v4
                        new_plugin.position = self.position + 1
                        new_plugin = self.placeholder.add_plugin(new_plugin)
                    else:
                        new_plugin = self.add_child(instance=new_plugin)
                    new_plugin.copy_relations(source_plugin)
                    plugin_pairs.append((new_plugin, source_plugin))
                self.add_existing_child_plugins_to_pairs(plugin_pairs)
                self.post_copy(self, plugin_pairs)

        def get_referenced_plugins(self):
            ids_in_body = set(plugin_tags_to_id_list(self.body))
            child_plugins_ids = set(self.cmsplugin_set.all().values_list("id", flat=True))
            referenced_plugins_ids = ids_in_body - child_plugins_ids
            return CMSPlugin.objects.filter(id__in=referenced_plugins_ids)

        def add_existing_child_plugins_to_pairs(self, plugins_pairs):
            for plugin in self.cmsplugin_set.all():
                plugins_pairs.append((plugin, plugin))

        def _get_inline_plugin_ids(self):
            return plugin_tags_to_id_list(self.body)

        def post_copy(self, old_instance, ziplist):
            """
            Fix references to plugins
            """
            replace_ids = {old.pk: new.pk for new, old in ziplist}
            old_text = old_instance.get_plugin_instance()[0].body
            self.body = replace_plugin_tags(old_text, replace_ids)
            self.save()

        def notify_on_autoadd_children(self, request, conf, children):
            """
            Method called when we auto add children to this plugin via
            default_plugins/<plugin>/children in CMS_PLACEHOLDER_CONF.
            we must replace some strings with child tag for the editor.
            Strings are "%(_tag_child_<order>)s" with the inserted order of children
            """
            replacements = {
                f"_tag_child_{str(order)}": plugin_to_tag(child) for order, child in enumerate(children, start=1)
            }
            self.body = self.body % replacements
            self.save()

    class Text(AbstractText):
        class Meta:
            abstract = False
