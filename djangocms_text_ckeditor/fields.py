import warnings
from typing import Any

from djangocms_text.fields import HTMLField as TextHTMLField
from djangocms_text.fields import HTMLFormField as TextHTMLFormField


class HTMLField(TextHTMLField):  # pragma: no cover
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        warnings.warn(
            "djangocms_text_ckeditor.fields.HTMLField is deprecated. Use djangocms_text.fields.HTMLField instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        super().__init__(*args, **kwargs)


class HTMLFormField(TextHTMLFormField):  # pragma: no cover
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        warnings.warn(
            "djangocms_text_ckeditor.fields.HTMLFormField is deprecated. "
            "Use djangocms_text.fields.HTMLFormField instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        super().__init__(*args, **kwargs)
