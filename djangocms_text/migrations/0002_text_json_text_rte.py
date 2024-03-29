# Generated by Django 5.0.1 on 2024-01-16 21:21

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("djangocms_text", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="text",
            name="json",
            field=models.JSONField(blank=True, null=True, verbose_name="json"),
        ),
        migrations.AddField(
            model_name="text",
            name="rte",
            field=models.CharField(
                blank=True,
                default="",
                help_text="The rich text editor used to create this text. JSON formats vary between editors.",
                max_length=16,
            ),
        ),
    ]
