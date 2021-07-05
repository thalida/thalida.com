# Internal
from copy import deepcopy
from functools import reduce
import operator

# External
import emoji
import nltk
import requests
nltk.download("stopwords")
nltk.download("punkt")

DEFAULT_CACHE_SECS = 5 * 60 # 5 minutues

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

def get_highlights(collection, highlights=None):
    if highlights is None:
        highlights = {}

    highlights = deepcopy(highlights)

    for id, item_cls in collection.items():
        for key, item_highlight in item_cls.highlights.items():
            if item_highlight.get("count") is None:
                continue
                
            key_exists = key in highlights
            operator_fn = getattr(operator, item_highlight.get("comparison", "ge"))
            is_new_highlight = operator_fn(item_highlight["count"], highlights[key]["count"]) if key_exists else False
            
            if key_exists and not is_new_highlight:
                continue
            
            if key_exists and item_highlight["count"] == highlights[key]["count"]:
                highlight_items = highlights[key]["items"]
            else:
                highlight_items = list()
            
            highlight_items.append(id)
            highlights[key] = {
                "count": item_highlight.get("count"),
                "comparison": item_highlight.get("comparison", "ge"),
                "items": highlight_items,
            }
    
    return highlights

def get_aggregates(collection, aggregates=None):
    if aggregates is None:
        aggregates = {} 

    aggregates = deepcopy(aggregates)

    for id, item_cls in collection.items():
        for key, item_aggregate in item_cls.aggregates.items():
            if key not in aggregates:
                aggregates[key] = item_aggregate
                continue

            aggregates[key] += item_aggregate

    return aggregates

def get_averages(collection, averages=None):
    if averages is None:
        averages = {}

    averages = deepcopy(averages)

    for id, item_cls in collection.items():
        for key, item_average in collection[id].averages.items():
            if key not in averages:
                averages[key] = item_average
                continue

            averages[key] = (averages[key] + item_average) / 2

    return averages