from django import forms
from django.core import signing
from django.core.signing import BadSignature
from django.forms.models import ModelForm
from django.template import RequestContext

from cms.models import CMSPlugin

from .models import Text
from .utils import _render_cms_plugin, plugin_to_tag


class ActionTokenValidationForm(forms.Form):
    token = forms.CharField(required=True)

    def get_id_from_token(self, session_id):
        payload = self.cleaned_data["token"]

        signer = signing.Signer(salt=session_id)

        try:
            return signer.unsign(payload)
        except BadSignature:
            return False


class RenderPluginForm(forms.Form):
    plugin = forms.ModelChoiceField(
        queryset=CMSPlugin.objects.none(),
        required=True,
    )

    def __init__(self, *args, **kwargs):
        self.text_plugin = kwargs.pop("text_plugin")
        super().__init__(*args, **kwargs)
        self.fields["plugin"].queryset = self.get_child_plugins()

    def get_child_plugins(self):
        return self.text_plugin.get_descendants()

    def render_plugin(self, request):
        plugin = self.cleaned_data["plugin"]
        context = RequestContext(request)
        context["request"] = request
        rendered_content = _render_cms_plugin(plugin, context)
        return plugin_to_tag(plugin, content=rendered_content, admin=True)


class TextForm(ModelForm):
    body = forms.CharField()

    class Meta:
        model = Text
        exclude = (
            "page",
            "position",
            "placeholder",
            "language",
            "plugin_type",
        )
