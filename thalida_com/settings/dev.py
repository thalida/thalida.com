from .base import *  # NOQA

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "django-insecure-ta@e8gh0-5v#a8&==3&2reo_gf#^$*y&ox60&10p6gn5rc==47"

# SECURITY WARNING: define the correct hosts in production!
ALLOWED_HOSTS = ["*"]

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


try:
    from .local import *  # NOQA
except ImportError:
    pass
