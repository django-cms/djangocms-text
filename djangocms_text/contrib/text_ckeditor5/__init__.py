from djangocms_text.editors import RTEConfig

ckeditor5 = RTEConfig(
    name="ckeditor5",
    config="CKEDITOR5",
    js=("djangocms_text/bundles/bundle.ckeditor5.min.js",),
    css={"all": ("djangocms_text/css/cms.ckeditor5.css",)},
)
