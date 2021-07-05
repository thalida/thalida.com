# Internal
from functools import reduce

# External
import emoji
import nltk
import requests
nltk.download("stopwords")
nltk.download("punkt")

DEFAULT_API_CACHE = 60 * 1000

# https://stackoverflow.com/a/46890853
def deep_get(dictionary, keys, default=None):
    return reduce(lambda d, key: d.get(key, default) if isinstance(d, dict) else default, keys.split("."), dictionary)

def get_emoji(message):
    return emoji.get_emoji_regexp().findall(message)

def get_meaningful_words(message):
    words = nltk.tokenize.word_tokenize(message)
    stop_words = set(nltk.corpus.stopwords.words("english"))
    meaningful_words = [word.casefold() for word in words if word.casefold() not in stop_words]
    return meaningful_words

def get_is_url_up(url):
    try:
        req = requests.get(url)
        return req.status_code == requests.codes.ok
    except Exception as e:
        return False