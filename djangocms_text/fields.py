from django.contrib.admin import widgets as admin_widgets
from django.db import models
from django.forms.fields import CharField
from django.utils.safestring import mark_safe

from .html import clean_html, render_dynamic_attributes
from .widgets import TextEditorWidget


class HTMLFormField(CharField):
    widget = TextEditorWidget

    def __init__(self, *args, **kwargs):
        conf = kwargs.pop("configuration", None)
        url_endpoint = kwargs.pop("url_endpoint", None)
        if conf:
            widget = TextEditorWidget(configuration=conf, url_endpoint=url_endpoint)
        else:
            widget = None
        kwargs.setdefault("widget", widget)
        super().__init__(*args, **kwargs)

    def clean(self, value):
        value = super().clean(value)
        value = render_dynamic_attributes(value, admin_objects=False, remove_attr=False)
        clean_value = clean_html(value, full=False)

        # We `mark_safe` here (as well as in the correct places) because Django
        # Parler cache's the value directly from the in-memory object as it
        # also stores the value in the database. So the cached version is never
        # processed by `from_db_value()`.
        clean_value = mark_safe(clean_value)

        return clean_value


class HTMLField(models.TextField):
    def __init__(self, *args, **kwargs):
        # This allows widget configuration customization
        # from the model definition
        self.configuration = kwargs.pop("configuration", None)
        self.url_endpoint = kwargs.pop("url_endpoint", None)
        super().__init__(*args, **kwargs)

    def from_db_value(self, value, expression, connection, context=None):
        if value is None:
            return value
        value = render_dynamic_attributes(value, admin_objects=False, remove_attr=False)
        return mark_safe(value)

    def to_python(self, value):
        # We don't need to add mark_safe
        # because it's handled by (from_db_value)
        if value is None:
            return value
        return value

    def formfield(self, **kwargs):
        defaults = {
            "form_class": HTMLFormField,
            "widget": TextEditorWidget(configuration=self.configuration) if self.configuration else TextEditorWidget,
        }
        defaults.update(kwargs)

        # override the admin widget
        if defaults["widget"] == admin_widgets.AdminTextareaWidget:
            # In the admin the URL endpoint is available
            defaults["widget"] = TextEditorWidget(configuration=self.configuration)
        return super().formfield(**defaults)

    def clean(self, value, model_instance):
        # This needs to be marked safe as well because the form field's
        # clean method is not called on model.full_clean()
        value = render_dynamic_attributes(value, admin_objects=False, remove_attr=False)
        value = clean_html(super().clean(value, model_instance))
        return mark_safe(value)
