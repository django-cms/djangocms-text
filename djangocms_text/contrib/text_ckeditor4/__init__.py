from djangocms_text.editors import RTEConfig

ckeditor4 = RTEConfig(
    name="ckeditor4",
    config="CKEDITOR",
    js=(
        "djangocms_text/vendor/ckeditor4/ckeditor.js",
        "djangocms_text/bundles/bundle.ckeditor5.min.js",
    ),
    css={"all": ("djangocms_text/css/cms.ckeditor5.css",)},
)
