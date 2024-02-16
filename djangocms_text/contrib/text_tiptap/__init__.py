from djangocms_text.editors import RTEConfig

tiptap = RTEConfig(
    name="tiptap",
    config="TIPTAP",
    js=("djangocms_text/bundles/bundle.tiptap.min.js",),
    css={"all": ("djangocms_text/css/bundle.tiptap.min.css",)},
)
