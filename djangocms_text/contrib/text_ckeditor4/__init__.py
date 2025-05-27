from djangocms_text.editors import RTEConfig

from django.conf import settings
from django.templatetags.static import static

from cms.utils.urlutils import static_with_version
from django.utils.functional import lazy


ckeditor4 = RTEConfig(
    name="ckeditor4",
    config="CKEDITOR",
    js=(
        static_with_version("cms/js/dist/bundle.admin.base.min.js"),
        "djangocms_text/js/basepath.js",
        "djangocms_text/vendor/ckeditor4/ckeditor.js",
        "djangocms_text/bundles/bundle.ckeditor4.min.js",
    ),
    css={"all": ("djangocms_text/css/cms.ckeditor4.css",)},
    inline_editing=True,
    child_plugin_support=True,
    additional_context=dict(
        CKEDITOR_BASEPATH=getattr(
            settings, "TEXT_CKEDITOR_BASE_PATH", lazy(static, str)("/djangocms_text/vendor/ckeditor4/")
        ),
    ),
)
