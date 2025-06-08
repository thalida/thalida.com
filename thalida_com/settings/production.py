from .base import *  # NOQA

DEBUG = False

try:
    from .local import *  # NOQA
except ImportError:
    pass
