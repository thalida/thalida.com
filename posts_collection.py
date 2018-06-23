# Builtins
import os
import glob
from datetime import datetime
from pprint import pprint

# Third Party
import markdown
import dateparser

class PostCollection:
    POSTS_URL_DECORATOR = '/x/'
    POSTS_DIR = 'posts_collection/'
    POSTS_EXT = '.md'
    COLLECTION_PREFIX = '/collection.'
    DEFAULT_COLLECTION_KEY = 'default'

    MARKDOWN_EXTENSIONS = [
        'markdown.extensions.attr_list',
        'markdown.extensions.fenced_code',
        'markdown.extensions.smart_strong',
        'markdown.extensions.meta',
        'markdown.extensions.nl2br',
        'markdown.extensions.sane_lists',
        'markdown.extensions.smarty',
        'markdown.extensions.tables',
        'markdown.extensions.codehilite',
    ]
    MARKDOWN_EXTENSION_CONFIGS = {
        'markdown.extensions.codehilite': {
            'css_class': 'highlight'
        }
    }

    def __init__(self, run_load=True):
        self.markdown = markdown.Markdown(extensions=self.MARKDOWN_EXTENSIONS, extension_configs=self.MARKDOWN_EXTENSION_CONFIGS)

        self.posts_meta = {}
        self.posts_html = {}
        self.url_to_path = {}
        self.collections = {}
        self.collections_order = []

        self.META_DEFAULTS = {
            'index':  (PostCollection._cast_to_int, None), 
            'title': (PostCollection._cast_to_string, "Untitled"), 
            'date': (PostCollection._cast_to_date, "2007-09-16"), 
            'date_updated': (PostCollection._cast_to_date, None), 
            'date_posted': (PostCollection._cast_to_date, None), 
            'tags': (PostCollection._cast_to_list, []), 
            'is_hidden': (PostCollection._cast_to_bool, False), 
            'is_draft': (PostCollection._cast_to_bool, False), 
            'is_collection_meta': (PostCollection._cast_to_bool, False), 
            'is_post_meta': (PostCollection._cast_to_bool, False),
        }

        self.META_FALLBACK_DEFAULT = (PostCollection._cast_to_string, "")

        if run_load:
            self._load()

    def get_post_by_url(self, url):
        post = self.get_post_by_path(self.url_to_path[url])
        return post

    def get_post_by_path(self, path):
        post_html = self.posts_html[path]
        post_meta = self.posts_meta[path]
        collection_meta = self.collections[post_meta['collection']]['meta']
        return {
            'html': post_html,
            'meta': post_meta,
            'collection_meta': collection_meta
        }

    def get_next_posts(self, curr_post, amount=1):
        collection_posts = self.collections[curr_post['meta']['collection']]['posts_in_order']
        curr_post_index = collection_posts.index(curr_post['meta']['path'])
        start_index = curr_post_index + 1
        end_index = start_index + amount
        next_posts = collection_posts[start_index:end_index]

        if len(next_posts) < amount:
            from_start = amount - len(next_posts)
            next_posts.extend(collection_posts[0:from_start])

        return next_posts

    def _load(self):
        filepaths = self._get_filepaths()

        for filepath in filepaths:
            file = self._load_file(filepath)

            path = file['meta']['path']
            collection = file['meta']['collection']

            if collection not in self.collections:
                self.collections[collection] = {
                    'key': collection, 
                    'meta': {}, 
                    'posts': [], 
                    'posts_in_order': []
                }

            if file['meta']['is_collection_meta']:
                self.collections[collection]['meta'] = file['meta']

            if file['meta']['is_post_meta']:
                self.posts_meta[path] = file['meta']
                self.posts_html[path] = file['html']

                self.collections[collection]['posts'].append(path)
                self.url_to_path[file['meta']['url']] = path

        collection_items = self.collections.items()
        collections_in_order = [None] * len(collection_items)
        skipped_collections = []

        for collection_key, collection in collection_items:
            collection['posts_in_order'] = self._sort_posts(collection['posts'])
            index = collection['meta']['index']

            if index is not None and index < len(collections_in_order):
                collections_in_order = self._upsert(collections_in_order, collection_key, index=index)
            else:
                skipped_collections.append(collection_key)

        for collection_key in skipped_collections:
            collections_in_order = self._upsert(collections_in_order, collection_key)

        self.collections_order = [c for c in collections_in_order if c is not None]

    def _get_filepaths(self):
        search_path = '{dir}**/*{ext}'.format(dir=self.POSTS_DIR, ext=self.POSTS_EXT)
        return glob.glob(search_path, recursive=True)

    def _load_file(self, path):
        with open(path, 'r') as f:
            file_contents = f.read()
            html = self.markdown.reset().convert(file_contents)
            meta = self._format_meta(self.markdown.Meta, path)
            return {
                'html': html,
                'meta': meta
            }

    def _sort_posts(self, post_keys):
        posts_meta = [self.posts_meta[post_key] for post_key in post_keys]
        posts_by_date = sorted(posts_meta, key=lambda x: (x['date'], x['title']), reverse=True)
        return [post['path'] for post in posts_by_date]

    def _format_meta(self, meta, path):
        all_meta_keys = list(set([k.lower() for k in meta.keys()] + list(self.META_DEFAULTS.keys())))

        formatted_meta = {k.lower(): self._cast(k, meta.get(k)) for k in all_meta_keys}
        formatted_meta['path'] = path
        formatted_meta['collection'] = self._parse_collection_from_path(path)
        formatted_meta['is_visible'] = not formatted_meta['is_hidden'] and not formatted_meta['is_draft']
        formatted_meta['is_default_date'] = formatted_meta.get('date') is self.META_DEFAULTS['date'][1]

        if path.find('_collection-meta.md') > 0:
            formatted_meta['is_collection_meta'] = True
        else:
            formatted_meta['is_post_meta'] = True
            formatted_meta['url'] = self._convert_path_to_url(path)
            formatted_meta['is_external'] = 'external_url' in formatted_meta
        
        # print(formatted_meta)
        # print('============')
        return formatted_meta

    def _convert_path_to_url(self, path): 
        url = path.replace(self.POSTS_DIR, self.POSTS_URL_DECORATOR, 1)
        url = url.replace(self.COLLECTION_PREFIX, '/', 1)
        url = url.rsplit(self.POSTS_EXT, 1)[0]
        return url

    def _parse_collection_from_path(self, path):
        if path.find(self.COLLECTION_PREFIX) == -1:
            return self.DEFAULT_COLLECTION_KEY

        parts = path.split(self.COLLECTION_PREFIX, 1)
        collection_key = parts[1].split('/', 1)[0]
        return collection_key
                
    def _upsert(self, arr, val, index=None):
        index = arr.index(None) if index is None else index

        if arr[index] is None:
            arr[index] = val
        else:
            arr.insert(index, val)

        return arr

    def _cast(self, key, value):
        (return_type, default_value) = self.META_DEFAULTS.get(key, self.META_FALLBACK_DEFAULT)

        if value is None:
            value = default_value
            return value

        return return_type(value)

    @staticmethod
    def _cast_to_int(value):
        if value is None:
            return value
        return int(PostCollection._cast_to_string(value))

    @staticmethod
    def _cast_to_list(value):
        return value if isinstance(value, list) else [value]

    @staticmethod
    def _cast_to_string(value):
        if isinstance(value, list):
            value = " ".join(value)
        return str(value)

    @staticmethod
    def _cast_to_bool(value):
        if isinstance(value, bool):
            return value

        truthy = ['true', 'yes', '1']
        value = PostCollection._cast_to_string(value).lower()
        return value in truthy

    @staticmethod
    def _cast_to_date(value):
        value = PostCollection._cast_to_string(value).lower()
        return dateparser.parse(value).isoformat()

