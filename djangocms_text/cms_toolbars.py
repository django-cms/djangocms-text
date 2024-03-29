from urllib.parse import urlparse, urlunparse

from django.forms import forms
from django.http import QueryDict
from django.templatetags.static import static
from django.utils.functional import cached_property
from django.utils.translation import gettext_lazy as _

from cms.cms_toolbars import CMSToolbar
from cms.toolbar.items import Button, ButtonList
from cms.toolbar_pool import toolbar_pool

from . import settings
from .widgets import rte_config


class IconButton(Button):
    template = "cms/toolbar/icon-button.html"


class InlineEditingToolbar(CMSToolbar):
    @property
    def media(self):
        if self.toolbar.edit_mode_active and self.inline_editing:
            return forms.Media(
                css={
                    **rte_config.css,
                    "all": (
                        "djangocms_text/css/cms.text.css",
                        *rte_config.css.get("all", ()),
                    ),
                },
                js=(
                    static("djangocms_text/bundles/bundle.editor.min.js"),
                    *(static(js) for js in rte_config.js),
                ),
            )
        return forms.Media()

    @cached_property
    def inline_editing(self):
        inline_editing = self.request.session.get(
            "inline_editing", True
        )  # Activated by default
        change = self.request.GET.get(
            "inline_editing", None
        )  # can be changed by query param
        if change is not None:
            inline_editing = change == "1"
            self.request.session["inline_editing"] = inline_editing  # store in session
        return inline_editing

    def populate(self):
        if self.toolbar.edit_mode_active:
            item = ButtonList(side=self.toolbar.RIGHT)
            item.add_item(
                IconButton(
                    name=_("Toggle inline editing mode for text plugins"),
                    url=self.get_full_path_with_param(
                        "inline_editing", int(not self.inline_editing)
                    ),
                    active=self.inline_editing,
                    extra_classes=["cms-icon cms-icon-pencil"],
                ),
            )
            self.toolbar.add_item(item)

    def get_full_path_with_param(self, key, value):
        """
        Adds key=value to the query parameters, replacing an existing key if necessary
        """
        url = urlparse(self.toolbar.request_path)
        query_dict = QueryDict(url.query).copy()
        query_dict[key] = value
        url = url._replace(query=query_dict.urlencode())
        return urlunparse(url)


if settings.TEXT_INLINE_EDITING:  # Only register if explicitly required from settings
    toolbar_pool.register(InlineEditingToolbar)
