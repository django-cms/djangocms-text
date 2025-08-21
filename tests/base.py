import os

from django.conf import settings

try:
    from cms.test_utils.testcases import CMSTestCase
except ModuleNotFoundError:  # pragma: no cover
    from django.test import TestCase as CMSTestCase


class BaseTestCase(CMSTestCase):
    def create_filer_image_object(self):
        from django.core.files import File as DjangoFile

        from filer.models import Image
        from PIL import Image as PilImage
        from PIL import ImageDraw

        image = PilImage.new("RGB", (800, 600))
        draw = ImageDraw.Draw(image)
        x_bit, y_bit = 800 // 10, 600 // 10
        draw.rectangle((x_bit, y_bit * 2, x_bit * 7, y_bit * 3), "red")
        draw.rectangle((x_bit * 2, y_bit, x_bit * 3, y_bit * 8), "red")

        image_name = "test_file.jpg"
        filename = os.path.join(settings.FILE_UPLOAD_TEMP_DIR, image_name)
        image.save(filename, "JPEG")
        file_obj = DjangoFile(open(filename, "rb"), name=image_name)
        return Image.objects.create(owner=self.superuser, file=file_obj, original_filename=image_name)
