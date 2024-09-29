import warnings
from typing import Any

from djangocms_text.widgets import TextEditorWidget as NewTextEditorWidget


class TextEditorWidget(NewTextEditorWidget):  # pragma: no cover
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        warnings.warn(
            "djangocms_text_ckeditor.widgets.TextEditorWidget is deprecated. "
            "Use djangocms_text.widgets.TextEditorWidget instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        super().__init__(*args, **kwargs)
