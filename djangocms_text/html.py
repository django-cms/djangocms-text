import base64
import io
import re
import uuid
import warnings
from copy import deepcopy
from typing import Optional, Union

from django.apps import apps
from django.db import models

import nh3
from lxml import etree
from lxml.etree import Element

from . import settings


dyn_attr_pattern = re.compile(r"<[^>]*data-cms-[^>]*>")


class NH3Parser:
    """

    NH3Parser

    This class represents a HTML parser for sanitation using NH3. It provides methods to configure the NH3 sanitizer

    Attributes:
    - ALLOWED_TAGS: A set of allowed HTML tags.
    - ALLOWED_ATTRIBUTES: A dictionary mapping HTML tags to sets of allowed attributes for each tag.
    - generic_attribute_prefixes: A set of prefixes that can be used in attribute names to indicate generic attributes.

    Methods:
    - __init__: Initializes the NH3Parser object.
    """

    def __init__(
        self,
        additional_attributes: Optional[dict[str, set[str]]] = None,
        generic_attribute_prefixes: Optional[set[str]] = None,
    ):
        self.ALLOWED_TAGS: set[str] = deepcopy(nh3.ALLOWED_TAGS)
        self.ALLOWED_ATTRIBUTES: dict[str, set[str]] = deepcopy(nh3.ALLOWED_ATTRIBUTES)
        self.generic_attribute_prefixes: set[str] = generic_attribute_prefixes or set()
        additional_attributes = {
            **settings.TEXT_ADDITIONAL_ATTRIBUTES,
            **(additional_attributes or {}),
        }
        if additional_attributes:
            self.ALLOWED_TAGS |= set(additional_attributes.keys())
            for tag, attributes in additional_attributes.items():
                self.ALLOWED_ATTRIBUTES[tag] = self.ALLOWED_ATTRIBUTES.get(tag, set()) | attributes

    def __call__(self) -> dict[str, Union[dict[str, set[str]], set[str], None]]:
        """
        Return a dictionary containing the attributes, tags, generic_attribute_prefixes, and link_rel values for
        immidiate passing to the nh3.clean function.

        :return: A dictionary with the following keys:
            - "attributes": A dictionary containing the allowed attributes setting.
            - "tags": The set of allowed tags.
            - "generic_attribute_prefixes": The set of generic attribute prefixes.
            - "link_rel": None

        The dictionary represents the allowed configurations for the method.

        :rtype: dict[str, Union[dict[str, set[str]], set[str], None]]
        """
        return {
            "attributes": self.ALLOWED_ATTRIBUTES,
            "tags": self.ALLOWED_TAGS,
            "generic_attribute_prefixes": self.generic_attribute_prefixes,
            "link_rel": None,
        }


cms_parser: NH3Parser = NH3Parser(
    additional_attributes={
        "a": {"href", "target", "rel"},
        "cms-plugin": {"id", "title", "name", "alt", "render-plugin", "type"},
        "*": {"style", "class"},
    },
    generic_attribute_prefixes={"data-"},
)
#: An instance of NH3Parser with the default configuration for CMS text content.


def clean_html(data: str, full: bool = False, cleaner: NH3Parser = cms_parser) -> str:
    """
    Cleans HTML from XSS vulnerabilities using nh3
    If full is False, only the contents inside <body> will be returned (without
    the <body> tags).
    """

    if full is not False:
        warnings.warn(
            "full argument is deprecated and will be removed",
            category=DeprecationWarning,
            stacklevel=2,
        )
    return nh3.clean(data, **cleaner())


dynamic_attr_pool = {}
#: A dictionary mapping attribute names to functions that update dynamic attribute values.


def get_xpath(pool: dict) -> str:
    """
    Generate an xpath expression based on the given pool of attributes.

    :param pool: A dictionary of attributes to be included in the xpath expression.
    :type pool: dict

    :return: A string representing the xpath expression.
    :rtype: str
    """
    if pool:
        return "//*[@" + "] | //".join(pool.keys())
    return ""


def get_data_from_db(models: dict, admin_objects: bool = False) -> dict:
    """
    Retrieve data from the database.

    Parameters:
    - models (dict): A dictionary mapping model names to lists of object IDs.
    - admin_objects (bool, optional): Flag indicating whether to retrieve latest admin objects
      (e.g., unpublished versions only visible in the admin). Defaults to False.

    Returns:
    - dict: A dictionary containing the retrieved data, with model names as keys and dictionaries of objects as values.
      The inner dictionaries have object IDs as keys and objects as values
    """
    result = {}
    for model, ids in models.items():
        result[model] = {}
        try:
            DjangoModel = apps.get_model(*model.split(".")[:2])
            if admin_objects and hasattr(DjangoModel, "admin_manager"):
                DjangoModel = DjangoModel.admin_manager
            else:
                DjangoModel = DjangoModel.objects

            for obj in DjangoModel.filter(id__in=ids):
                result[model][obj.id] = obj
        except Exception:
            pass
    return result


def dynamic_href(elem: Element, obj: models.Model, attr: str) -> None:
    """
    Modifies an element's attribute to create a dynamic hyperlink based on the provided model object.
    In case the object has a "get_absolute_url" method, and it returns a non-empty value, the attribute of the
    element will be set to the URL returned by the method.
    Otherwise, the "data-cms-error" attribute of the element will be set to "ref-not-found".

    A hyperlink with a missing reference will be turned into a span element with a "data-cms-error" attribute set to
    "ref-not-found".

    :param elem: The element to modify.
    :type elem: Element
    :param obj: The model object to use for generating the hyperlink.
    :type obj: models.Model
    :param attr: The attribute name to set the generated hyperlink.
    :type attr: str
    :return: None
    """

    target_value = ""
    if hasattr(obj, "get_absolute_url"):
        target_value = obj.get_absolute_url()
        if target_value:
            elem.attrib[attr] = obj.get_absolute_url()
    if not target_value:
        elem.attrib["data-cms-error"] = "ref-not-found"
        if elem.tag == "a":
            elem.tag = "span"


def dynamic_src(elem: Element, obj: models.Model, attr: str) -> None:
    """
    This method modifies the provided element by setting the value of the specified attribute based on the provided
    object. If the object has a "get_absolute_url" method, and it returns a non-empty value, the attribute of the
    element will be set to the URL returned by the method. Otherwise, the "data-cms-error" attribute of the XML
    element will be set to "ref-not-found".

    :param elem: The XML element to modify.
    :type elem: Element
    :param obj: The object to use as the source of the attribute value.
    :type obj: models.Model
    :param attr: The attribute name to modify in the XML element.
    :type attr: str

    :return: None
    :rtype: NoneType
    """
    target_value = ""
    if hasattr(obj, "get_absolute_url"):
        target_value = obj.get_absolute_url()
        if target_value:
            elem.attrib[attr] = obj.get_absolute_url()
    if not target_value:
        elem.attrib["data-cms-error"] = "ref-not-found"


def render_dynamic_attributes(dyn_html: str, admin_objects: bool = False, remove_attr=True) -> str:
    """
    Render method to update dynamic attributes in HTML

    Parameters:
    - dyn_html (str): The HTML content with dynamic attributes
    - admin_objects (bool) (optional): Flag to indicate whether to fetch data from admin objects (default: False)
    - remove_attr (bool) (optional): Flag to indicate whether to remove dynamic attributes from the final HTML
      (default: True)

    Returns:
    - str: The updated HTML content with dynamic attributes

    """

    if not dyn_attr_pattern.search(dyn_html):
        # No dynamic attributes found, skip processing the html tree
        return dyn_html

    req_model_obj = {}
    tree = etree.fromstring(dyn_html, parser=etree.HTMLParser())
    if tree is None:
        return dyn_html
    xpath = get_xpath(dynamic_attr_pool)
    update_queue = []
    prefix = "data-cms-"

    for elem in tree.xpath(xpath):
        for attr, value in elem.attrib.items():
            if attr in dynamic_attr_pool:
                try:
                    model, pk = value.rsplit(":", 1)
                    if model.strip() in req_model_obj:
                        req_model_obj[model.strip()].add(int(pk.strip()))
                    else:
                        req_model_obj[model.strip()] = {int(pk.strip())}
                except (TypeError, ValueError):
                    pass
                update_queue.append(elem)
    from_db = get_data_from_db(req_model_obj, admin_objects=admin_objects)
    for elem in update_queue:
        for attr, value in elem.attrib.items():
            if attr in dynamic_attr_pool:
                target_attr = attr[len(prefix) :]
                try:
                    model, pk = value.rsplit(":", 1)
                    obj = from_db[model.strip()][int(pk.strip())]
                except (KeyError, ValueError):
                    obj = None
                dynamic_attr_pool[attr](elem, obj, target_attr)
                if remove_attr:
                    # Remove dynamic attribute's source for public view
                    del elem.attrib[attr]
    doc = etree.tostring(tree, method="html").decode("utf-8")
    doc = doc.removeprefix("<html>").removesuffix("</html>")  # remove html tags added by lxml
    doc = doc.removeprefix("<body>").removesuffix("</body>")  # remove body tags added by lxml
    return doc


def register_attr(attr: str, render_func: callable) -> None:
    dynamic_attr_pool[attr] = render_func


register_attr("data-cms-href", dynamic_href)
register_attr("data-cms-src", dynamic_src)


try:
    import html5lib
    from PIL import Image
except ModuleNotFoundError:

    class PIL:
        pass


def extract_images(data, plugin):
    """
    extracts base64 encoded images from drag and drop actions in browser and saves
    those images as plugins
    """
    from .utils import plugin_to_tag

    if not settings.TEXT_SAVE_IMAGE_FUNCTION:
        return data
    tree_builder = html5lib.treebuilders.getTreeBuilder("dom")
    parser = html5lib.html5parser.HTMLParser(tree=tree_builder)
    dom = parser.parse(data)
    found = False
    for img in dom.getElementsByTagName("img"):
        src = img.getAttribute("src")
        if not src.startswith("data:"):
            # nothing to do
            continue
        width = img.getAttribute("width")
        height = img.getAttribute("height")
        # extract the image data
        data_re = re.compile(r'data:(?P<mime_type>[^"]*);(?P<encoding>[^"]*),(?P<data>[^"]*)')
        m = data_re.search(src)
        dr = m.groupdict()
        mime_type = dr["mime_type"]
        image_data = dr["data"]
        if mime_type.find(";"):
            mime_type = mime_type.split(";")[0]
        try:
            image_data = base64.b64decode(image_data)
        except Exception:
            image_data = base64.urlsafe_b64decode(image_data)
        try:
            image_type = mime_type.split("/")[1]
        except IndexError:
            # No image type specified -- will convert to jpg below if it's valid image data
            image_type = ""
        image = io.BytesIO(image_data)
        # genarate filename and normalize image format
        if image_type == "jpg" or image_type == "jpeg":
            file_ending = "jpg"
        elif image_type == "png":
            file_ending = "png"
        elif image_type == "gif":
            file_ending = "gif"
        else:
            # any not "web-safe" image format we try to convert to jpg
            im = Image.open(image)
            new_image = io.BytesIO()
            file_ending = "jpg"
            im.save(new_image, "JPEG")
            new_image.seek(0)
            image = new_image
        filename = f"{uuid.uuid4()}.{file_ending}"
        # transform image into a cms plugin
        image_plugin = img_data_to_plugin(
            filename,
            image,
            parent_plugin=plugin,
            width=width,
            height=height,
        )
        # render the new html for the plugin
        new_img_html = plugin_to_tag(image_plugin)
        # replace the original image node with the newly created cms plugin html
        img.parentNode.replaceChild(parser.parseFragment(new_img_html).childNodes[0], img)
        found = True
    if found:
        return "".join([y.toxml() for y in dom.getElementsByTagName("body")[0].childNodes])
    else:
        return data


def img_data_to_plugin(filename, image, parent_plugin, width=None, height=None):
    func_name = settings.TEXT_SAVE_IMAGE_FUNCTION.split(".")[-1]
    module = __import__(
        ".".join(settings.TEXT_SAVE_IMAGE_FUNCTION.split(".")[:-1]),
        fromlist=[func_name],
    )
    func = getattr(module, func_name)
    return func(filename, image, parent_plugin, width=width, height=height)
