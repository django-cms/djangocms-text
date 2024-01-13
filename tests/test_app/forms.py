from django import forms

from djangocms_text.fields import HTMLFormField


class SimpleTextForm(forms.Form):
    text = HTMLFormField()
