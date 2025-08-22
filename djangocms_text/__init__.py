"""
See PEP 440 (https://www.python.org/dev/peps/pep-0440/)

Release logic:
 1. Increase version number (change __version__ below).
 2. Assure that all changes have been documented in CHANGELOG.rst.
 3. In ``pyproject.toml`` check that
   - versions from all third party packages are pinned in ``requirements``.
   - the list of ``classifiers`` is up to date.
 4. git add djangocms_text/__init__.py CHANGELOG.rst setup.py
 5. git commit -m 'chore: Bump to {new version}'
 6. git push
 7. Assure that all tests pass on https://github.com/django-cms/djangocms-text-ckeditor/actions
 8. Create a new release on https://github.com/django-cms/djangocms-text-ckeditor/releases/new
 9. Publish the release when ready
10. Github actions will publish the new package to pypi
"""

__version__ = "0.9.3"
