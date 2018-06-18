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

        if run_load:
            self._load()

    def get_post_by_url(self, url):
        return self.get_post_by_path(self.url_to_path[url])

    def get_post_by_path(self, path):
        return {
            'html': self.posts_html[path],
            'meta': self.posts_meta[path],
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

            if file['meta']['is_post_meta'] and file['meta']['is_visible']:
                self.posts_meta[path] = file['meta']
                self.posts_html[path] = file['html']
                self.collections[collection]['posts'].append(path)
                self.url_to_path[file['meta']['url']] = path

        collection_items = self.collections.items()
        collections_in_order = [None] * len(collection_items)
        skipped_collections = []
        for key, collection in collection_items:
            collection['posts_in_order'] = self._sort_posts(collection['posts'])
            
            if collection['meta'].get('index') is not None:
                index = int(collection['meta'].get('index'))
                collection_in_order = self._upsert(collections_in_order, index, key)
            else:
                skipped_collections.append(key)

        for collection in skipped_collections:
            collection_in_order = self._upsert(collections_in_order, None, collection)

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
        formatted_meta = dict()

        defaults = {
            'date': '2007-09-16',
            'is_hidden': False,
            'is_draft': False,
            'is_collection_meta': False,
            'is_post_meta': False,
        }

        types = {
            'date': 'date',
            'date_updated': 'date',
            'date_posted': 'date',
            'is_hidden': 'boolean',
            'is_draft': 'boolean',
        }

        formatted_meta = {k.lower(): v for k, v in meta.items()}
        # formatted_meta = {k: formatted_meta.get(k, defaults[k]) for k in defaults}
        # formatted_meta = {k: self._cast(formatted_meta.get(k), v) for k, v in types.items()}

        for k, v in meta.items():
            key = k.lower()
            formatted_meta[k.lower()] = self._parse_str(v[0]) if len(v) <= 1 else v

        for key in defaults:
            formatted_meta[key] = formatted_meta.get(key, defaults[key])
        
        print(formatted_meta)

        formatted_meta['path'] = path
        formatted_meta['collection'] = self._parse_collection_from_path(path)

        if path.find('_collection-meta.md') > 0:
            formatted_meta['is_collection_meta'] = True
            return formatted_meta

        formatted_meta['is_post_meta'] = True
        formatted_meta['url'] = self._convert_path_to_url(path)
        formatted_meta['is_visible'] = not formatted_meta['is_hidden'] and not formatted_meta['is_draft']
        formatted_meta['is_external'] = 'external_url' in formatted_meta

        if formatted_meta.get('date') is defaults['date']:
            formatted_meta['is_default_date'] = True

        formatted_meta['date'] = dateparser.parse(formatted_meta.get('date')).isoformat()

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

    def _parse_str(self, s):
        truthy = ('true', 'yes')
        falsey = ('false', 'no')

        ls = s.lower()
        if ls in truthy:
            return True
        elif ls in falsey:
            return False
        else:
            return s

    def _cast(self, item, type):
        print(item, type)

    def _upsert(self, arr, idx, val):
        idx = arr.index(None) if idx is None else idx

        if arr[idx] is None:
            arr[idx] = val
        else:
            arr.insert(idx, val)
        return arr

