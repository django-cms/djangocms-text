from djangocms_text.editors import RTEConfig


tinymce = RTEConfig(
    name="tinymce",
    config="TINYMCE",
    js=(
        "https://cdn.tiny.cloud/1/no-api-key/tinymce/7/tinymce.min.js",
        "djangocms_text/bundles/bundle.tinymce.min.js",
    ),
    css={"all": ("djangocms_text/css/cms.tinymce.css",)},
)
