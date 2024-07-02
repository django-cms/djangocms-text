# Generated by Django 3.2.25 on 2024-07-02 14:09

from django.db import migrations, models, OperationalError


def migrate_text_ckeditor_fields(apps, schema_editor):
    class CKEditorText(models.Model):
        class Meta:
            managed = False
            db_table = "djangocms_text_ckeditor_text"
        cmsplugin_ptr_id = models.PositiveIntegerField(primary_key=True)
        body = models.TextField()

    class Text_Text(models.Model):  # Name must not be used elsewhere as model
        class Meta:
            managed = False
            db_table = "djangocms_text_text"
        cmsplugin_ptr_id = models.PositiveIntegerField(primary_key=True)
        body = models.TextField()
        json = models.JSONField(blank=True, null=True)
        rte = models.CharField(max_length=16, blank=True)

    try:
        existing_texts = Text_Text.objects.all().values_list("cmsplugin_ptr_id", flat=True)
        qs = CKEditorText.objects.using(schema_editor.connection.alias).exclude(cmsplugin_ptr_id__in=existing_texts)
        Text_Text.objects.using(schema_editor.connection.alias).bulk_create(
            Text_Text(body=ckeditor_text.body, rte="text_ckeditor4", cmsplugin_ptr_id=ckeditor_text.cmsplugin_ptr_id)
            for ckeditor_text in qs
        )
    except OperationalError as e:
        if "no such table" in str(e):
            return
        raise e


class Migration(migrations.Migration):

    dependencies = [
        ('djangocms_text', '0002_text_json_text_rte'),
    ]

    operations = [
        migrations.RunPython(
            code=migrate_text_ckeditor_fields,
        )
    ]
