import warnings
from typing import Any

from djangocms_text.deprecation import RemovedInDjangoCMSText20Warning
from djangocms_text.widgets import TextEditorWidget as NewTextEditorWidget


class TextEditorWidget(NewTextEditorWidget):  # pragma: no cover
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        warnings.warn(
            "djangocms_text_ckeditor.widgets.TextEditorWidget is deprecated and will be removed in djangocms-text 2.0. "
            "Use djangocms_text.widgets.TextEditorWidget instead.",
            RemovedInDjangoCMSText20Warning,
            stacklevel=3,
        )
        super().__init__(*args, **kwargs)
