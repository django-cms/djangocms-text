from django.templatetags.static import static
from django.utils.html import format_html, html_safe

from djangocms_text import settings
from djangocms_text.editors import RTEConfig


@html_safe
class BasePath:
    def __str__(self):
        basepath = settings.TEXT_CKEDITOR_BASE_PATH
        if basepath is None:
            basepath = static("djangocms_text/vendor/ckeditor4/")
        return format_html(
            '<script src="{scriptsrc}" data-ckeditor-basepath="{basepath}"></script>',
            scriptsrc=static("djangocms_text/js/basepath.js"),
            basepath=basepath,
        )


ckeditor4 = RTEConfig(
    name="ckeditor4",
    config="CKEDITOR",
    js=(
        BasePath(),
        "djangocms_text/vendor/ckeditor4/ckeditor.js",
        "djangocms_text/bundles/bundle.ckeditor4.min.js",
    ),
    css={"all": ("djangocms_text/css/cms.ckeditor4.css",)},
    inline_editing=True,
    child_plugin_support=True,
)
