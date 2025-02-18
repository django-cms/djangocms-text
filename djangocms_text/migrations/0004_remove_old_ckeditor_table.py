from django.db import migrations


def drop_table_if_exists(apps, schema_editor):
    table_name = "djangocms_text_ckeditor_text"
    if table_name in schema_editor.connection.introspection.table_names():
        if schema_editor.connection.vendor == "postgresql":
            schema_editor.execute("DROP TABLE IF EXISTS djangocms_text_ckeditor_text CASCADE;")
        else:
            schema_editor.execute("DROP TABLE IF EXISTS djangocms_text_ckeditor_text;")


class Migration(migrations.Migration):
    dependencies = [
        ("djangocms_text", "0003_auto_20240702_1409"),
    ]

    operations = [
        migrations.RunPython(
            code=drop_table_if_exists,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
