from django.apps import AppConfig


class TextCKEditor4App(AppConfig):
    def ready(self):
        from cms.utils.urlutils import static_with_version
        from djangocms_text.widgets import TextEditorWidget

        # The legacy CKEditor4 widget needs CMS.$ from bundle.admin.base.min.js

        TextEditorWidget.widget_js = (
            *TextEditorWidget.widget_js,
            static_with_version("cms/js/dist/bundle.admin.base.min.js"),
        )
