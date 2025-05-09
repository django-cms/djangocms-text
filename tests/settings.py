import os
from tempfile import mkdtemp


def gettext(s):
    return s


class DisableMigrations(dict):
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


MIGRATION_MODULES = DisableMigrations()

SECRET_KEY = "djangocms-text-test-suite"

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sites",
    "django.contrib.sessions",
    "django.contrib.admin",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "easy_thumbnails",
    "filer",
    "cms",
    "menus",
    "treebeard",
    "sekizai",
    "djangocms_picture",
    "djangocms_link",
    "djangocms_text",
    "djangocms_text.contrib.text_ckeditor4",
    "tests.test_app",
]

MIDDLEWARE = [
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "cms.middleware.user.CurrentUserMiddleware",
    "cms.middleware.page.CurrentPageMiddleware",
    "cms.middleware.toolbar.ToolbarMiddleware",
    "cms.middleware.language.LanguageCookieMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [
            os.path.join(os.path.dirname(__file__), "templates"),
            # insert your TEMPLATE_DIRS here
        ],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

CMS_LANGUAGES = {
    1: [
        {
            "code": "en",
            "name": gettext("English"),
            "public": True,
        },
        {
            "code": "it",
            "name": gettext("Italiano"),
            "public": True,
        },
        {
            "code": "fr",
            "name": gettext("French"),
            "public": True,
        },
    ],
    "default": {
        "hide_untranslated": False,
    },
}

LANGUAGES = (
    ("en", gettext("English")),
    ("fr", gettext("French")),
    ("it", gettext("Italiano")),
)

LANGUAGE_CODE = "en"
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
CMS_PERMISSION = False
CMS_PLACEHOLDER_CONF = {
    "content": {
        "plugins": ["TextPlugin", "PicturePlugin"],
        "text_only_plugins": ["LinkPlugin"],
        "extra_context": {"width": 640},
        "name": gettext("Content"),
        "language_fallback": True,
        "default_plugins": [
            {
                "plugin_type": "TextPlugin",
                "values": {
                    "body": "<p>Lorem ipsum dolor sit amet...</p>",
                },
            },
        ],
        "child_classes": {
            "TextPlugin": ["PicturePlugin", "LinkPlugin"],
        },
        "parent_classes": {
            "LinkPlugin": ["TextPlugin"],
        },
        "plugin_modules": {
            "LinkPlugin": "Extra",
        },
        "plugin_labels": {
            "LinkPlugin": "Add a link",
        },
    },
}

FILE_UPLOAD_TEMP_DIR = mkdtemp()
SITE_ID = 1
THUMBNAIL_PROCESSORS = (
    "easy_thumbnails.processors.colorspace",
    "easy_thumbnails.processors.autocrop",
    "filer.thumbnail_processors.scale_and_crop_with_subject_location",
    "easy_thumbnails.processors.filters",
)

CMS_TEMPLATES = (
    ("page.html", "Normal page"),
    ("plugin_with_sekizai.html", "Plugin with sekizai"),
)

DJANGOCMS_TRANSLATIONS_CONF = {
    "Bootstrap3ButtonCMSPlugin": {"text_field_child_label": "label"},
    "DummyLinkPlugin": {"text_field_child_label": "label"},
}

TEXT_INLINE_EDITING = True

CMS_CONFIRM_VERSION4 = True

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": "mydatabase",  # This is where you put the name of the db file.
        # If one doesn't exist, it will be created at migration time.
    }
}

ROOT_URLCONF = "tests.urls"

STATIC_URL = "/static/"
MEDIA_URL = "/media/"

SESSION_ENGINE = "django.contrib.sessions.backends.cache"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

TEXT_SAVE_IMAGE_FUNCTION = "tests.test_html.save_image"

TEXT_ADDITIONAL_ATTRIBUTES = {
    "source": {"src"},
}
