from typing import Optional
from collections.abc import Iterable

from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.utils.encoding import force_str
from django.utils.functional import Promise
from django.utils.translation import gettext_lazy as _


class LazyEncoder(DjangoJSONEncoder):
    """
    Class LazyEncoder

    Django JSON encoder that handles lazy translated strings.

    Inherits from DjangoJSONEncoder.

    Methods:
    - default: Overrides the default method in DjangoJSONEncoder to handle lazy translated strings.

    """

    def default(self, obj):
        if isinstance(obj, Promise):
            return force_str(obj)
        return super().default(obj)


_EDITOR_TOOLBAR_BASE_CONFIG = {
    "Undo": {
        "title": _("Undo"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-counterclockwise" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466"/></svg>',
    },
    "Redo": {
        "title": _("Redo"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-clockwise" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466"/></svg>',
    },
    "Bold": {
        "title": _("Bold"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-bold" viewBox="0 0 16 16">\n'
        + '  <path d="M8.21 13c2.106 0 3.412-1.087 3.412-2.823 0-1.306-.984-2.283-2.324-2.386v-.055a2.176 2.176 0 0 0 1.852-2.14c0-1.51-1.162-2.46-3.014-2.46H3.843V13zM5.908 4.674h1.696c.963 0 1.517.451 1.517 1.244 0 .834-.629 1.32-1.73 1.32H5.908V4.673zm0 6.788V8.598h1.73c1.217 0 1.88.492 1.88 1.415 0 .943-.643 1.449-1.832 1.449H5.907z"/>\n'
        + "</svg>",
    },
    "Italic": {
        "title": _("Italic"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-italic" viewBox="0 0 16 16">\n'
        + '  <path d="M7.991 11.674 9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H7.211l-.11.52c1.06.096 1.128.212 1.005.807L6.57 11.674c-.123.595-.246.71-1.346.806l-.11.52h3.774l.11-.52c-1.06-.095-1.129-.211-1.006-.806z"/>\n'
        + "</svg>",
    },
    "Underline": {
        "title": _("Underline"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-underline" viewBox="0 0 16 16">\n'
        + '  <path d="M5.313 3.136h-1.23V9.54c0 2.105 1.47 3.623 3.917 3.623s3.917-1.518 3.917-3.623V3.136h-1.23v6.323c0 1.49-.978 2.57-2.687 2.57s-2.687-1.08-2.687-2.57zM12.5 15h-9v-1h9z"/>\n'
        + "</svg>",
    },
    "Strike": {
        "title": _("Strike"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-strikethrough" viewBox="0 0 16 16"><path d="M6.333 5.686c0 .31.083.581.27.814H5.166a2.8 2.8 0 0 1-.099-.76c0-1.627 1.436-2.768 3.48-2.768 1.969 0 3.39 1.175 3.445 2.85h-1.23c-.11-1.08-.964-1.743-2.25-1.743-1.23 0-2.18.602-2.18 1.607zm2.194 7.478c-2.153 0-3.589-1.107-3.705-2.81h1.23c.144 1.06 1.129 1.703 2.544 1.703 1.34 0 2.31-.705 2.31-1.675 0-.827-.547-1.374-1.914-1.675L8.046 8.5H1v-1h14v1h-3.504c.468.437.675.994.675 1.697 0 1.826-1.436 2.967-3.644 2.967"/></svg>',
    },
    "Subscript": {
        "title": _("Subscript"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-subscript" viewBox="0 0 16 16">\n'
        + '  <path d="m3.266 12.496.96-2.853H7.76l.96 2.853H10L6.62 3H5.38L2 12.496zm2.748-8.063 1.419 4.23h-2.88l1.426-4.23zm6.132 7.203v-.075c0-.332.234-.618.619-.618.354 0 .618.256.618.58 0 .362-.271.649-.52.898l-1.788 1.832V15h3.59v-.958h-1.923v-.045l.973-1.04c.415-.438.867-.845.867-1.547 0-.8-.701-1.41-1.787-1.41-1.23 0-1.795.8-1.795 1.576v.06z"/>\n'
        + "</svg>",
    },
    "Superscript": {
        "title": _("Superscript"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-superscript" viewBox="0 0 16 16">\n'
        + '  <path d="m4.266 12.496.96-2.853H8.76l.96 2.853H11L7.62 3H6.38L3 12.496zm2.748-8.063 1.419 4.23h-2.88l1.426-4.23zm5.132-1.797v-.075c0-.332.234-.618.619-.618.354 0 .618.256.618.58 0 .362-.271.649-.52.898l-1.788 1.832V6h3.59v-.958h-1.923v-.045l.973-1.04c.415-.438.867-.845.867-1.547 0-.8-.701-1.41-1.787-1.41C11.565 1 11 1.8 11 2.576v.06z"/>\n'
        + "</svg>",
    },
    "RemoveFormat": {
        "title": _("Remove formatting"),
        "icon": '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" '
        'xmlns="http://www.w3.org/2000/svg"><path d="M 3.7480469,3 3.6640625,5.4609375 H 4.1445312 C '
        "4.404531,3.916939 4.9028926,3.6772343 6.8378906,3.6152344 L 7.2617188,3.6015625 V 7.2148438 "
        "L 8.7363281,5.7402344 V 3.6015625 l 0.4316407,0.013672 c 0.6591374,0.02113 1.1482522,0.064931 "
        "1.5214842,0.171875 L 11.476562,3 Z M 12.3125,4.6660156 11.804688,5.1738281 c 0.01939,0.090386 "
        "0.03966,0.1858138 0.05664,0.2871094 h 0.478516 z M 8.7363281,8.2421875 7.2617188,9.7167969 v "
        "1.7128911 c 0,0.662999 -0.1447825,0.818875 -1.3007813,0.921874 v 0.519532 H 10.042969 V 12.351562 "
        'C 8.8809699,12.248563 8.7363281,12.092687 8.7363281,11.429688 Z" />'
        '<path fill-rule="evenodd" d="m 14.125055,1.6715548 a 0.5,0.5 0 0 1 0,0.708 L 3.1250552,13.379555 a '
        '0.5006316,0.5006316 0 0 1 -0.708,-0.708 L 13.417055,1.6715548 a 0.5,0.5 0 0 1 0.708,0"></svg>',
    },
    "JustifyLeft": {
        "title": _("Align left"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-text-left" viewBox="0 0 16 16">\n'
        + '  <path fill-rule="evenodd" d="M2 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m0-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/>\n'
        + "</svg>",
    },
    "JustifyCenter": {
        "title": _("Align center"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-text-center" viewBox="0 0 16 16">\n'
        + '  <path fill-rule="evenodd" d="M4 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/>\n'
        + "</svg>",
    },
    "JustifyRight": {
        "title": _("Align right"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-text-right" viewBox="0 0 16 16">\n'
        + '  <path fill-rule="evenodd" d="M6 12.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m4-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-4-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/>\n'
        + "</svg>",
    },
    "JustifyBlock": {
        "title": _("Justify"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-justify" viewBox="0 0 16 16">\n'
        + '  <path fill-rule="evenodd" d="M2 12.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5m0-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5"/>\n'
        + "</svg>",
    },
    "HorizontalRule": {
        "title": _("Horizontal rule"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-hr" viewBox="0 0 16 16">\n'
        + '  <path d="M12 3H4a1 1 0 0 0-1 1v2.5H2V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2.5h-1V4a1 1 0 0 0-1-1M2 9.5h1V12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9.5h1V12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2zm-1.5-2a.5.5 0 0 0 0 1h15a.5.5 0 0 0 0-1z"/>\n'
        + "</svg>",
    },
    "NumberedList": {
        "title": _("Numbered list"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-list-ol" viewBox="0 0 16 16">\n'
        + '  <path fill-rule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5"/>\n'
        + '  <path d="M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338zM2.564 5h-.635V2.924h-.031l-.598.42v-.567l.629-.443h.635z"/>\n'
        + "</svg>",
    },
    "BulletedList": {
        "title": _("Bullet list"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-list-ul" viewBox="0 0 16 16">\n'
        + '  <path fill-rule="evenodd" d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5m-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2m0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2m0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>\n'
        + "</svg>",
    },
    "Outdent": {
        "title": _("Outdent"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-unindent" viewBox="0 0 16 16">\n'
        + '  <path fill-rule="evenodd" d="M13 8a.5.5 0 0 0-.5-.5H5.707l2.147-2.146a.5.5 0 1 0-.708-.708l-3 3a.5.5 0 0 0 0 .708l3 3a.5.5 0 0 0 .708-.708L5.707 8.5H12.5A.5.5 0 0 0 13 8"/>\n'
        + '  <path fill-rule="evenodd" d="M3.5 4a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 1 0v-7a.5.5 0 0 0-.5-.5"/>\n'
        + "</svg>",
    },
    "Indent": {
        "title": _("Indent"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-indent" viewBox="0 0 16 16">\n'
        + '  <path fill-rule="evenodd" d="M3 8a.5.5 0 0 1 .5-.5h6.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H3.5A.5.5 0 0 1 3 8"/>\n'
        + '  <path fill-rule="evenodd" d="M12.5 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5"/>\n'
        + "</svg>",
    },
    "Blockquote": {
        "title": _("Blockquote"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-blockquote-left" viewBox="0 0 16 16">\n'
        + '  <path d="M2.5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1zm5 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1zm0 3a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1zm-5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1zm.79-5.373q.168-.117.444-.275L3.524 6q-.183.111-.452.287-.27.176-.51.428a2.4 2.4 0 0 0-.398.562Q2 7.587 2 7.969q0 .54.217.873.217.328.72.328.322 0 .504-.211a.7.7 0 0 0 .188-.463q0-.345-.211-.521-.205-.182-.568-.182h-.282q.036-.305.123-.498a1.4 1.4 0 0 1 .252-.37 2 2 0 0 1 .346-.298zm2.167 0q.17-.117.445-.275L5.692 6q-.183.111-.452.287-.27.176-.51.428a2.4 2.4 0 0 0-.398.562q-.165.31-.164.692 0 .54.217.873.217.328.72.328.322 0 .504-.211a.7.7 0 0 0 .188-.463q0-.345-.211-.521-.205-.182-.568-.182h-.282a1.8 1.8 0 0 1 .118-.492q.087-.194.257-.375a2 2 0 0 1 .346-.3z"/>\n'
        + "</svg>",
    },
    "Link": {
        "title": _("Link"),
        "form": [
            # {
            #     "type": "link",
            #     "url": '#',
            #     "label": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" '
            #              'class="bi bi-box-arrow-up-left" viewBox="0 0 16 16">'
            #              '<path fill-rule="evenodd" d="M7.364 3.5a.5.5 0 0 1 .5-.5H14.5A1.5 1.5 0 0 1 16 4.5v10a1.5 '
            #              '1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 3 14.5V7.864a.5.5 0 1 1 1 0V14.5a.5.5 0 0 0 .5.5h10a.5.5 '
            #              '0 0 0 .5-.5v-10a.5.5 0 0 0-.5-.5H7.864a.5.5 0 0 1-.5-.5"/><path fill-rule="evenodd" '
            #              'd="M0 .5A.5.5 0 0 1 .5 0h5a.5.5 0 0 1 0 1H1.707l8.147 8.146a.5.5 0 0 1-.708.708L1 '
            #              '1.707V5.5a.5.5 0 0 1-1 0z"/></svg>',
            # },
            {
                "name": "href_select",
                "type": "hidden",
                "required": False,
            },
            {
                "name": "href",
                "label": _("Type URL or search for a destination"),
                "placeholder": _("URL or search"),
                "type": "text",
                "class": "js-linkfield",
                "required": False,
            },
            {
                "type": "section",
                "label": _("Link options"),
                "content": [
                    {
                        "name": "target",
                        "label": _("Target"),
                        "type": "select",
                        "options": [
                            {"value": "", "label": "-----"},
                            {"value": "_blank", "label": _("New window")},
                            {"value": "_self", "label": _("Same window")},
                            {"value": "_parent", "label": _("Parent window")},
                        ],
                        "required": False,
                    }
                ],
            },
        ],
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-link-45deg" viewBox="0 0 16 16">\n'
        + '  <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/>\n'
        + '  <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>\n'
        + "</svg>",
    },
    "Unlink": {
        "title": _("Unlink"),
        "icon": '<svg width="16" height="16" fill="currentColor"'
        + '   viewBox="0 0 16 16"  xmlns="http://www.w3.org/2000/svg">'
        + '  <path d="m 10.660156,1.96875 a 3.0002541,3.0002541 0 0 0 -2.2460935,0.875 l -1.015625,1.015625 0.7050781,0.7070312 1.015625,-1.015625 A 2.0011676,2.0011676 0 1 1 11.949219,6.3808594 L 11.15625,7.171875 c 0.04831,0.1811506 0.08077,0.3654706 0.103516,0.5507812 l 0.380859,0.3808594 1.015625,-1.015625 A 3.0002541,3.0002541 0 0 0 10.660156,1.96875 Z M 3.8613281,7.3964844 3.34375,7.9140625 A 3.0002541,3.0002541 0 1 0 7.5859375,12.15625 l 0.515625,-0.515625 C 7.8663008,11.405107 7.6295925,11.171326 7.3945312,10.935547 L 6.8808594,11.449219 A 2.0011676,2.0011676 0 0 1 4.0507812,8.6191406 L 4.5683594,8.1035156 C 4.3326823,7.8675541 4.0973009,7.6320603 3.8613281,7.3964844 Z" />\n'
        + '  <path fill-rule="evenodd" d="m 13.718276,13.311496 a 0.5,0.5 0 0 1 -0.708,0 L 2.0102757,2.3114959 a 0.5006316,0.5006316 0 0 1 0.708,-0.708 L 13.718276,12.603496 a 0.5,0.5 0 0 1 0,0.708" />'
        + "</svg>",
    },
    "Table": {
        "title": _("Table"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-table" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm15 2h-4v3h4zm0 4h-4v3h4zm0 4h-4v3h3a1 1 0 0 0 1-1zm-5 3v-3H6v3zm-5 0v-3H1v2a1 1 0 0 0 1 1zm-4-4h4V8H1zm0-4h4V4H1zm5-3v3h4V4zm4 4H6v3h4z"/></svg>',
    },
    "toggleHeaderRow": {
        "title": _("Header row"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-table" viewBox="0 0 16 16"><path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm15 2h-4v3h4zm0 4h-4v3h4zm0 4h-4v3h3a1 1 0 0 0 1-1zm-5 3v-3H6v3zm-5 0v-3H1v2a1 1 0 0 0 1 1zm-4-4h4V8H1zm0-4h4V4H1zm5-3v3h4V4zm4 4H6v3h4z"/></svg>',
    },
    "toggleHeaderColumn": {
        "title": _("Header column"),
        "icon": '<svg class="bi bi-table" width="16" height="16" fill="currentColor" version="1.1" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="m2 16a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2zm2-15v4h3v-4zm4 0v4h3v-4zm4 0v4h3v-3a1 1 0 0 0-1-1zm3 5h-3v4h3zm0 5h-3v4h2a1 1 0 0 0 1-1zm-4 4v-4h-3v4zm-4 0v-4h-3v4zm-3-5h3v-4h-3zm4-4v4h3v-4z"/></svg>',
    },
    "addRowBefore": {
        "title": _("Add row before"),
        "icon": '<svg version="1.1" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m19 9.3271h-1v4h-16v-4h-1v3.5a1.5 1.5 0 0 0 1.5 1.5h15a1.5 1.5 0 0 0 1.5-1.5z" style="opacity:.6"/><path d="m8 13.327v-4h-1v4z" style="opacity:.6"/><path d="m13 13.327v-4h-1v4z" style="opacity:.6"/><path d="m8 9.3271h4v-2h-4z"/><path d="m13 1.3271v8h5v-2h-4v-4h4v-2z"/><path d="m12 1.3271v8h1v-8z"/><path d="m8 1.3271v2h4v-2z"/><path d="m7 1.3271v8h1v-8z"/><path d="m2 1.3271v2h4v4h-4v2h5v-8z"/><path d="m1 9.3271h1v-8h-1z"/><path d="m1 9.3271v-8a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1z"/><path d="m19 1.3271h-1v8h1z"/><path d="m19 1.3271v8a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1z"/><path d="m16.012 12.062a0.5 0.5 0 0 1 0.5 0.5v3h3a0.5 0.5 0 0 1 0 1h-3v3a0.5 0.5 0 0 1-1 0v-3h-3a0.5 0.5 0 0 1 0-1h3v-3a0.5 0.5 0 0 1 0.5-0.5"/></svg>',
    },
    "addRowAfter": {
        "title": _("Add row after"),
        "icon": '<svg version="1.1" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m2.5 1a1.5 1.5 0 0 0-1.5 1.5v3.5h1v-4h16v4h1v-3.5a1.5 1.5 0 0 0-1.5-1.5z" style="opacity:.6"/><path d="m12 6h1v-4h-1z" style="opacity:.6"/><path d="m7 6h1v-4h-1z" style="opacity:.6"/><path d="m8 14h4v-2h-4z" style=""/><path d="m17.469 12v2h0.53125v-2z" style=""/><path d="m13 6v8h1.4297v-2h-0.42969v-4h4v-2z" style=""/><path d="m12 6v8h1v-8z" style=""/><path d="m8 6v2h4v-2z" style=""/><path d="m7 6v8h1v-8z" style=""/><path d="m2 6v2h4v4h-4v2h5v-8z" style=""/><path d="m1 14h1v-8h-1z" style=""/><path d="m1 14v-8a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1z" style=""/><path d="m19 6h-1v8h1z" style=""/><path d="m19 6v8a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1z" style=""/><path d="m15.962 12.017a0.5 0.5 0 0 1 0.5 0.5v3h3a0.5 0.5 0 0 1 0 1h-3v3a0.5 0.5 0 0 1-1 0v-3h-3a0.5 0.5 0 0 1 0-1h3v-3a0.5 0.5 0 0 1 0.5-0.5"/></svg>',
    },
    "addColumnBefore": {
        "title": _("Add column before"),
        "icon": '<svg version="1.1" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m9.079 1v1h4v16h-4v1h3.5a1.5 1.5 0 0 0 1.5-1.5v-15a1.5 1.5 0 0 0-1.5-1.5z" style="opacity:.6"/><path d="m13.079 7v1h-10.944v-1zm0 5v1h-10.944v-1z" opacity=".6" style="stroke-width:.82703"/><path d="m9.079 19h-8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1z"/><path d="m9.079 18h-8v1h8z"/><path d="m9.079 2h-2v4h-4v-4h-2v16h2v-4h4v4h2zm-6 6h4v4h-4z"/><path d="m9.079 1h-8v1h8z"/><path d="m2.079 0a1 1 0 0 0-1 1h8a1 1 0 0 0-1-1z"/><path d="m15.941 11.962a0.5 0.5 0 0 1 0.5 0.5v3h3a0.5 0.5 0 0 1 0 1h-3v3a0.5 0.5 0 0 1-1 0v-3h-3a0.5 0.5 0 0 1 0-1h3v-3a0.5 0.5 0 0 1 0.5-0.5"/></svg>',
    },
    "addColumnAfter": {
        "title": _("Add column after"),
        "icon": '<svg version="1.1" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m6 19v-1h-4v-16h4v-1h-3.5a1.5 1.5 0 0 0-1.5 1.5v15a1.5 1.5 0 0 0 1.5 1.5z" style="opacity:.6"/><path d="m12.837 7v1h-10.837v-1zm0 5v1h-10.837v-1z" opacity=".6" style="stroke-width:.82298"/><path d="m14 19h-8a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1z" style=""/><path d="m14 18h-8v1h8z" style=""/><path d="m14 17.125h-2v0.875h2z" style=""/><path d="m6 2v16h2v-4h4v0.57422h2v-12.574h-2v4h-4v-4zm2 6h4v4h-4z" style=""/><path d="m14 1h-8v1h8z" style=""/><path d="m7 0a1 1 0 0 0-1 1h8a1 1 0 0 0-1-1z" style=""/><path d="m15.882 11.882a0.5 0.5 0 0 1 0.5 0.5v3h3a0.5 0.5 0 0 1 0 1h-3v3a0.5 0.5 0 0 1-1 0v-3h-3a0.5 0.5 0 0 1 0-1h3v-3a0.5 0.5 0 0 1 0.5-0.5"/></svg>',
    },
    "deleteRow": {
        "title": _("Delete row"),
        "icon": '<svg version="1.1" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m2.5 1a1.5 1.5 0 0 0-1.5 1.5v15a1.5 1.5 0 0 0 1.5 1.5h7.0137a6.7974 6.7974 0 0 1-0.60938-1h-6.9043v-16h16v6.9102a6.7974 6.7974 0 0 1 1 0.60938v-7.0195a1.5 1.5 0 0 0-1.5-1.5z" style="opacity:.6"/><path d="m12 2v6.8906a6.7974 6.7974 0 0 1 1-0.39258v-6.498z" style="opacity:.6"/><path d="m7 2v16h1v-16z" style="opacity:.6"/><path d="m1 6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h7.252a6.7974 6.7974 0 0 1 0.63086-2h-0.88281v-4h4v0.89258a6.7974 6.7974 0 0 1 2-0.625v-0.26758h4v0.91016a6.7974 6.7974 0 0 1 2 1.5078v-3.418a1 1 0 0 0-1-1h-18zm1 2h4v4h-4v-4z"/><path d="m14.974 10.027a4.9673 4.9673 0 0 0-4.9668 4.9668 4.9673 4.9673 0 0 0 4.9668 4.9668 4.9673 4.9673 0 0 0 4.9668-4.9668 4.9673 4.9673 0 0 0-4.9668-4.9668zm-3.5 4.4668h7a0.5 0.5 0 0 1 0 1h-7a0.5 0.5 0 0 1 0-1z" style="fill:#000000;stroke-width:0"/></svg>',
    },
    "deleteColumn": {
        "title": _("Delete column"),
        "icon": '<svg version="1.1" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m2.5 1a1.5 1.5 0 0 0-1.5 1.5v15a1.5 1.5 0 0 0 1.5 1.5h7.0254a6.7974 6.7974 0 0 1-0.61328-1h-6.9121v-16h16v6.9023a6.7974 6.7974 0 0 1 1 0.60547v-7.0078a1.5 1.5 0 0 0-1.5-1.5h-15z"/><path d="m2 7v1h16v-1z" style="opacity:.6"/><path d="m8.5039 13a6.7974 6.7974 0 0 1 0.39648-1h-6.9004v1z" style="opacity:.6"/><path d="m7 0a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h3.4102a6.7974 6.7974 0 0 1-1.498-2h-0.91211v-4h0.2793a6.7974 6.7974 0 0 1 0.63477-2h-0.91406v-4h4v0.91406a6.7974 6.7974 0 0 1 2-0.63281v-7.2812a1 1 0 0 0-1-1h-6zm1 2h4v4h-4v-4z"/><path d="m15 10.034a4.9673 4.9673 0 0 0-4.9668 4.9668 4.9673 4.9673 0 0 0 4.9668 4.9668 4.9673 4.9673 0 0 0 4.9668-4.9668 4.9673 4.9673 0 0 0-4.9668-4.9668zm-3.5 4.4668h7a0.5 0.5 0 0 1 0 1h-7a0.5 0.5 0 0 1 0-1z" style="fill:#000000;stroke-width:0"/></svg>',
    },
    "deleteTable": {
        "title": _("Delete table"),
    },
    "mergeOrSplit": {
        "title": _("Merge/split cells"),
        "icon": '<svg version="1.1" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="m2.5 1a1.5 1.5 0 0 0-1.5 1.5v15a1.5 1.5 0 0 0 1.5 1.5h4.459v-1h-4.959v-16h16v4.8203h1v-4.3203a1.5 1.5 0 0 0-1.5-1.5z" style="opacity:.6"/><path d="m7.5614 6.3318h11.006a1.1006 1.1121 0 0 1 1.1006 1.1121v11.121a1.1006 1.1121 0 0 1-1.1006 1.1121h-11.006a1.1006 1.1121 0 0 1-1.1006-1.1121v-11.121a1.1006 1.1121 0 0 1 1.1006-1.1121zm-0.36687 0.74142v11.863h11.74v-11.863z" opacity=".6" style="opacity:1;stroke-width:.73757"/><path d="m6.7285 13v-1h-4.7285v1z" style="opacity:.6"/><path d="m6.7285 8v-1h-4.7285v1z" style="opacity:.6"/><path d="m12 6.6816h1v-4.6816h-1z" style="opacity:.6"/><path d="m7 2v4.6816h1v-4.6816z" style="opacity:.6"/></svg>',
    },
    "Code": {
        "title": _("Code"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-code" viewBox="0 0 16 16">\n'
        + '  <path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8z"/>\n'
        + "</svg>",
    },
    "Small": {
        "title": _("Small"),
    },
    "Kbd": {
        "title": _("Keyboard input"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-alt" viewBox="0 0 16 16">\n'
        + '  <path d="M1 13.5a.5.5 0 0 0 .5.5h3.797a.5.5 0 0 0 .439-.26L11 3h3.5a.5.5 0 0 0 0-1h-3.797a.5.5 0 0 0-.439.26L5 13H1.5a.5.5 0 0 0-.5.5m10 0a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 0-1h-3a.5.5 0 0 0-.5.5"/>\n'
        + "</svg>",
    },
    "CodeBlock": {
        "title": _("Code block"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-code-square" viewBox="0 0 16 16">\n'
        + '  <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>\n'
        + '  <path d="M6.854 4.646a.5.5 0 0 1 0 .708L4.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0m2.292 0a.5.5 0 0 0 0 .708L11.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0"/>\n'
        + "</svg>",
    },
    "Heading1": {
        "title": _("Heading 1"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-h1" viewBox="0 0 16 16">\n'
        + '  <path d="M7.648 13V3H6.3v4.234H1.348V3H0v10h1.348V8.421H6.3V13zM14 13V3h-1.333l-2.381 1.766V6.12L12.6 4.443h.066V13z"/>\n'
        + "</svg>",
    },
    "Heading2": {
        "title": _("Heading 2"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-h2" viewBox="0 0 16 16">\n'
        + '  <path d="M7.495 13V3.201H6.174v4.15H1.32V3.2H0V13h1.32V8.513h4.854V13zm3.174-7.071v-.05c0-.934.66-1.752 1.801-1.752 1.005 0 1.76.639 1.76 1.651 0 .898-.582 1.58-1.12 2.19l-3.69 4.2V13h6.331v-1.149h-4.458v-.079L13.9 8.786c.919-1.048 1.666-1.874 1.666-3.101C15.565 4.149 14.35 3 12.499 3 10.46 3 9.384 4.393 9.384 5.879v.05z"/>\n'
        + "</svg>",
    },
    "Heading3": {
        "title": _("Heading 3"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-h3" viewBox="0 0 16 16">\n'
        + '  <path d="M11.07 8.4h1.049c1.174 0 1.99.69 2.004 1.724s-.802 1.786-2.068 1.779c-1.11-.007-1.905-.605-1.99-1.357h-1.21C8.926 11.91 10.116 13 12.028 13c1.99 0 3.439-1.188 3.404-2.87-.028-1.553-1.287-2.221-2.096-2.313v-.07c.724-.127 1.814-.935 1.772-2.293-.035-1.392-1.21-2.468-3.038-2.454-1.927.007-2.94 1.196-2.981 2.426h1.23c.064-.71.732-1.336 1.744-1.336 1.027 0 1.744.64 1.744 1.568.007.95-.738 1.639-1.744 1.639h-.991V8.4ZM7.495 13V3.201H6.174v4.15H1.32V3.2H0V13h1.32V8.513h4.854V13z"/>\n'
        + "</svg>",
    },
    "Heading4": {
        "title": _("Heading 4"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-h4" viewBox="0 0 16 16">\n'
        + '  <path d="M13.007 3H15v10h-1.29v-2.051H8.854v-1.18C10.1 7.513 11.586 5.256 13.007 3m-2.82 6.777h3.524v-5.62h-.074a95 95 0 0 0-3.45 5.554zM7.495 13V3.201H6.174v4.15H1.32V3.2H0V13h1.32V8.513h4.854V13z"/>\n'
        + "</svg>",
    },
    "Heading5": {
        "title": _("Heading 5"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-h5" viewBox="0 0 16 16">\n'
        + '  <path d="M9 10.516h1.264c.193.976 1.112 1.364 2.01 1.364 1.005 0 2.067-.782 2.067-2.247 0-1.292-.983-2.082-2.089-2.082-1.012 0-1.658.596-1.924 1.077h-1.12L9.646 3h5.535v1.141h-4.415L10.5 7.28h.072c.201-.316.883-.84 1.967-.84 1.709 0 3.13 1.177 3.13 3.158 0 2.025-1.407 3.403-3.475 3.403-1.809 0-3.1-1.048-3.194-2.484ZM7.495 13V3.201H6.174v4.15H1.32V3.2H0V13h1.32V8.512h4.854V13z"/>\n'
        + "</svg>",
    },
    "Heading6": {
        "title": _("Heading 6"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-h6" viewBox="0 0 16 16">\n'
        + '  <path d="M15.596 5.178H14.3c-.106-.444-.62-1.072-1.706-1.072-1.332 0-2.325 1.269-2.325 3.947h.07c.268-.67 1.043-1.445 2.445-1.445 1.494 0 3.017 1.064 3.017 3.073C15.8 11.795 14.37 13 12.48 13c-1.036 0-2.093-.36-2.77-1.452C9.276 10.836 9 9.808 9 8.37 9 4.656 10.494 3 12.636 3c1.812 0 2.883 1.113 2.96 2.178m-5.151 4.566c0 1.367.944 2.15 2.043 2.15 1.128 0 2.037-.684 2.037-2.136 0-1.41-1-2.065-2.03-2.065-1.19 0-2.05.853-2.05 2.051M7.495 13V3.201H6.174v4.15H1.32V3.2H0V13h1.32V8.513h4.854V13z"/>\n'
        + "</svg>",
    },
    "Paragraph": {
        "title": _("Paragraph"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-paragraph" viewBox="0 0 16 16">\n'
        + '  <path d="M10.5 15a.5.5 0 0 1-.5-.5V2H9v12.5a.5.5 0 0 1-1 0V9H7a4 4 0 1 1 0-8h5.5a.5.5 0 0 1 0 1H11v12.5a.5.5 0 0 1-.5.5"/>\n'
        + "</svg>",
    },
    "Anchor": {
        "title": _("Anchor"),
    },
    "Format": {
        "title": _("Block format"),
        "class": "vertical",
    },
    "Styles": {
        "title": _("Styles"),
        "menu": [],
    },
    "Font": {
        "title": _("Font"),
    },
    "FontSize": {
        "title": _("Font size"),
    },
    "CMSPlugins": {
        "title": _("CMS Plugins"),
        "aria": _("CMS Plugins"),
        "editLabel": _("Edit CMS Plugin"),
        "addLabel": _("Add CMS Plugin"),
        "icon": '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" '
        'class="bi bi-puzzle" viewBox="0 0 16 16"><path d="M3.112 3.645A1.5 1.5 0 0 1 4.605 '
        "2H7a.5.5 0 0 1 .5.5v.382c0 .696-.497 1.182-.872 1.469a.5.5 0 0 0-.115.118l-.012.025L6.5 "
        "4.5v.003l.003.01q.005.015.036.053a.9.9 0 0 0 .27.194C7.09 4.9 7.51 5 8 5c.492 0 "
        ".912-.1 1.19-.24a.9.9 0 0 0 .271-.194.2.2 0 0 0 .039-.063v-.009l-.012-.025a.5.5 0 0 "
        "0-.115-.118c-.375-.287-.872-.773-.872-1.469V2.5A.5.5 0 0 1 9 2h2.395a1.5 1.5 0 0 1 "
        "1.493 1.645L12.645 6.5h.237c.195 0 .42-.147.675-.48.21-.274.528-.52.943-.52.568 0 "
        ".947.447 1.154.862C15.877 6.807 16 7.387 16 8s-.123 1.193-.346 "
        "1.638c-.207.415-.586.862-1.154.862-.415 0-.733-.246-.943-.52-.255-.333-.48-.48-.675-.48h-.237l.243 "
        "2.855A1.5 1.5 0 0 1 11.395 14H9a.5.5 0 0 1-.5-.5v-.382c0-.696.497-1.182.872-1.469a.5.5 0 0 0 "
        ".115-.118l.012-.025.001-.006v-.003a.2.2 0 0 0-.039-.064.9.9 0 0 0-.27-.193C8.91 11.1 8.49 11 "
        "8 11s-.912.1-1.19.24a.9.9 0 0 0-.271.194.2.2 0 0 "
        "0-.039.063v.003l.001.006.012.025c.016.027.05.068.115.118.375.287.872.773.872 1.469v.382a.5.5 "
        "0 0 1-.5.5H4.605a1.5 1.5 0 0 1-1.493-1.645L3.356 9.5h-.238c-.195 0-.42.147-.675.48-.21.274"
        "-.528.52-.943.52-.568 0-.947-.447-1.154-.862C.123 9.193 0 8.613 0 8s.123-1.193.346-1.638C.553 "
        "5.947.932 5.5 1.5 5.5c.415 0 .733.246.943.52.255.333.48.48.675.48h.238zM4.605 3a.5.5 0 0 "
        "0-.498.55l.001.007.29 3.4A.5.5 0 0 1 3.9 7.5h-.782c-.696 0-1.182-.497-1.469-.872a.5.5 0 0 "
        "0-.118-.115l-.025-.012L1.5 6.5h-.003a.2.2 0 0 0-.064.039.9.9 0 0 0-.193.27C1.1 7.09 1 7.51 1 "
        "8s.1.912.24 1.19c.07.14.14.225.194.271a.2.2 0 0 0 .063.039H1.5l.006-.001.025-.012a.5.5 0 0 0 "
        ".118-.115c.287-.375.773-.872 1.469-.872H3.9a.5.5 0 0 1 .498.542l-.29 3.408a.5.5 0 0 0 "
        ".497.55h1.878c-.048-.166-.195-.352-.463-.557-.274-.21-.52-.528-.52-.943 "
        "0-.568.447-.947.862-1.154C6.807 10.123 7.387 10 8 10s1.193.123 1.638.346c.415.207.862.586.862 "
        "1.154 0 .415-.246.733-.52.943-.268.205-.415.39-.463.557h1.878a.5.5 0 0 0 "
        ".498-.55l-.001-.007-.29-3.4A.5.5 0 0 1 12.1 8.5h.782c.696 0 1.182.497 "
        "1.469.872.05.065.091.099.118.115l.025.012.006.001h.003a.2.2 0 0 0 .064-.039.9.9 0 0 0 "
        ".193-.27c.14-.28.24-.7.24-1.191s-.1-.912-.24-1.19a.9.9 0 0 0-.194-.271.2.2 0 0 "
        "0-.063-.039H14.5l-.006.001-.025.012a.5.5 0 0 0-.118.115c-.287.375-.773.872-1.469.872H12.1a.5.5 0 0 "
        "1-.498-.543l.29-3.407a.5.5 0 0 0-.497-.55H9.517c.048.166.195.352.463.557.274.21.52.528.52.943 0 "
        ".568-.447.947-.862 1.154C9.193 5.877 8.613 6 8 6s-1.193-.123-1.638-.346C5.947 5.447 5.5 5.068 5.5 "
        '4.5c0-.415.246-.733.52-.943.268-.205.415-.39.463-.557z"/></svg>',
    },
}

DEFAULT_TOOLBAR_CMS = [
    ["Undo", "Redo"],
    ["CMSPlugins", "cmswidget", "-", "ShowBlocks"],
    ["Format", "Styles"],
    ["TextColor", "BGColor", "-", "PasteText", "PasteFromWord"],
    ["Maximize"],
    [
        "Bold",
        "Italic",
        "Underline",
        "-",
        "Code",
        "-",
        "Subscript",
        "Superscript",
    ],
    ["JustifyLeft", "JustifyCenter", "JustifyRight", "JustifyBlock"],
    ["Link", "Unlink"],
    ["NumberedList", "BulletedList"],
    ["HorizontalRule", "CodeBlock"],
    ["Outdent", "Indent", "-", "Blockquote", "-", "Table"],
    ["ImagePlugin"],
    ["Source"],
]

DEFAULT_TOOLBAR_HTMLField = [
    ["Undo", "Redo"],
    ["ShowBlocks"],
    ["Format", "Styles"],
    ["TextColor", "BGColor", "-", "PasteText", "PasteFromWord"],
    ["Maximize"],
    [
        "Bold",
        "Italic",
        "Underline",
        "-",
        "Code",
        "-",
        "Subscript",
        "Superscript",
    ],
    ["JustifyLeft", "JustifyCenter", "JustifyRight", "JustifyBlock"],
    ["Link", "Unlink"],
    ["NumberedList", "BulletedList"],
    ["HorizontalRule", "CodeBlock"],
    ["Outdent", "Indent", "-", "Blockquote", "-", "Table"],
    ["Source"],
]


class RTEConfig:
    """
    Initializes an instance of RTEConfig.

    Args:
        name (str): The name of the RTE configuration.
        config (str): The configuration string.
        js (Iterable[str]): An iterable of JavaScript files to include.
        css (dict): A dictionary of CSS files to include.

    Attributes:
        name (str): The name of the RTE configuration.
        config (str): The configuration string.
        js (Iterable[str]): An iterable of JavaScript files to include.
        css (dict): A dictionary of CSS files to include.
    """

    def __init__(
        self,
        name: str,
        config: str,
        js: Iterable[str] = None,
        css: dict = None,
        inline_editing: bool = False,
        child_plugin_support: bool = False,
    ):
        """ """
        self.name = name
        self.config = config
        self.js = js or []
        self.css = css or {}
        self.inline_editing = inline_editing
        self.child_plugin_support = child_plugin_support

    def process_base_config(self, base_config: dict) -> dict:
        """
        Processes the base configuration. Needs to be subclassed.

        :param base_config: The base configuration to process.
        :type base_config: dict
        """
        return base_config


configuration = {}


def register(editor: RTEConfig):
    """
    Registers an editor configuration with the system.

    :param editor: An instance of RTEConfig representing the editor configuration to register.
    :type editor: RTEConfig
    """
    if not isinstance(editor, RTEConfig):
        raise TypeError("editor must be an instance of RTEConfig")
    configuration[editor.name] = editor


def get_editor_config(editor: Optional[str] = None) -> RTEConfig:
    """
    Returns the editor configuration.

    :return: The editor configuration.
    :rtype: RTEConfig
    """

    config = editor or getattr(settings, "TEXT_EDITOR", "tiptap")
    if "." in config and config not in configuration:
        # Load the configuration from the module
        module = __import__(config.rsplit(".", 1)[0], fromlist=[""])
        rte_config_instance = getattr(module, config.rsplit(".", 1)[-1])
        # Cache editor configuration
        rte_config_instance.name = config
        register(rte_config_instance)
    return configuration[config]


def get_editor_base_config(editor: Optional[str] = None) -> dict:
    """
    Returns the base configuration for the editor.

    :return: The base configuration for the editor.
    :rtype: dict
    """
    editor_config = get_editor_config(editor)
    return editor_config.process_base_config(_EDITOR_TOOLBAR_BASE_CONFIG.copy())


register(
    RTEConfig(
        name="tiptap",
        config="TIPTAP",
        js=("djangocms_text/bundles/bundle.tiptap.min.js",),
        css={"all": ("djangocms_text/css/bundle.tiptap.min.css",)},
        inline_editing=True,
        child_plugin_support=True,
    )
)
