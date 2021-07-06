# Internal
import os
import collections
from copy import deepcopy
from functools import reduce
import math
import operator

# External
import emoji
import nltk
import requests
nltk.download("stopwords")
nltk.download("punkt")

DISABLE_CACHE = False
DEFAULT_API_CACHE_TTL = 60 * 60 # 1 hour
DEFAULT_INSIGHTS_CACHE_TTL = 30 * 60 # 30 minutes

if DISABLE_CACHE:
    DEFAULT_API_CACHE_TTL = 0
    DEFAULT_INSIGHTS_CACHE_TTL = 0

# https://stackoverflow.com/a/46890853
def deep_get(dictionary, keys, default=None):
    return reduce(lambda d, key: d.get(key, default) if isinstance(d, dict) else default, keys.split("."), dictionary)

def deep_update(source, overrides):
    for k, v in overrides.items():
        if k in source:
            source[k].update(v)
        else:
            source[k] = deepcopy(v)

    return source

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

def generate_insights(collection):
    return {
        "highlights": get_highlights(collection),
        "aggregates": get_aggregates(collection),
        "averages": get_averages(collection),
        "frequencies": get_frequencies(collection),
    }

def get_highlights(collection):
    highlights = {}

    for id, item_cls in collection.items():
        for key, item_highlight in item_cls.insights["highlights"].items():
            if item_highlight.get("count") is None:
                continue
                
            key_exists = key in highlights
            operator_fn = getattr(operator, item_highlight.get("comparison", "ge"))
            is_new_highlight = operator_fn(item_highlight["count"], highlights[key]["count"]) if key_exists else False
            
            if key_exists and not is_new_highlight:
                continue

            if key_exists and item_highlight["count"] == highlights[key]["count"]:
                highlight_items = deepcopy(highlights[key]["items"])
            else:
                highlight_items = list()
            
            highlight_items.append(id)
            highlights[key] = {
                "count": item_highlight.get("count"),
                "comparison": item_highlight.get("comparison", "ge"),
                "items": highlight_items,
            }
    
    return highlights

def get_aggregates(collection):
    aggregates = {}
    
    for id, item_cls in collection.items():
        for key, item_aggregate in item_cls.insights["aggregates"].items():
            if key not in aggregates:
                aggregates[key] = item_aggregate
                continue

            aggregates[key] += item_aggregate

    return aggregates

def get_averages(collection):
    averages = {}

    for id, item_cls in collection.items():
        for key, item_average in item_cls.insights["averages"].items():
            if key not in averages:
                averages[key] = item_average
                continue

            averages[key] = (averages[key] + item_average) / 2

    return averages

def get_frequencies(collection):
    frequencies = {}
    
    for id, item_cls in collection.items():
        for key, freq in item_cls.insights["frequencies"].items():
            if key not in frequencies:
                frequencies[key] = freq
                continue

            frequencies[key] += freq

    return frequencies

def get_top_frequencies(collection, top_percent=10, max=100):
    top_collection = {}
    
    for key, freq in collection.items():
        n = math.ceil(len(freq) * (top_percent / 100))
        n = max if n > max else n
        top_collection[key] = freq.most_common(n)

    return top_collection