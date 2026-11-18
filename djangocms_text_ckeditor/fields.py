import warnings
from typing import Any

from djangocms_text.deprecation import RemovedInDjangoCMSText20Warning
from djangocms_text.fields import HTMLField as TextHTMLField
from djangocms_text.fields import HTMLFormField as TextHTMLFormField


class HTMLField(TextHTMLField):  # pragma: no cover
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        warnings.warn(
            "djangocms_text_ckeditor.fields.HTMLField is deprecated and will be removed in djangocms-text 2.0. "
            "Use djangocms_text.fields.HTMLField instead.",
            RemovedInDjangoCMSText20Warning,
            stacklevel=2,
        )
        super().__init__(*args, **kwargs)


class HTMLFormField(TextHTMLFormField):  # pragma: no cover
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        warnings.warn(
            "djangocms_text_ckeditor.fields.HTMLFormField is deprecated and will be removed in djangocms-text 2.0. "
            "Use djangocms_text.fields.HTMLFormField instead.",
            RemovedInDjangoCMSText20Warning,
            stacklevel=2,
        )
        super().__init__(*args, **kwargs)
