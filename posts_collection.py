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
        self.collections_order = ['whats-on-my', self.DEFAULT_COLLECTION_KEY, 'elsewhere']

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
        start_index = collection_posts.index(curr_post['meta']['path']) + 1
        end_index = start_index + amount
        next_posts = collection_posts[start_index:end_index]

        if len(next_posts) < amount:
            from_start = amount - len(next_posts)
            next_posts.extend(collection_posts[0:from_start])

        return next_posts

    def _load(self):
        for filepath in self._fetch_post_filepaths():
            post = self._fetch_post(filepath)
            path = post['meta']['path']
            collection = post['meta']['collection']

            if collection not in self.collections:
                self.collections[collection] = {'meta': {}, 'posts': [], 'posts_in_order': []}

            if post['meta']['is_collection_meta']:
                self.collections[collection]['meta'] = post['meta']

            if post['meta']['is_post_meta'] and post['meta']['is_visible']:
                self.posts_meta[path] = post['meta']
                self.posts_html[path] = post['html']
                self.collections[collection]['posts'].append(path)
                self.url_to_path[post['meta']['url']] = path

        for key, collection in self.collections.items():
            collection_post_meta = [self.posts_meta[post] for post in collection['posts']]
            posts_by_date = sorted(collection_post_meta, key=lambda x: (x['date'], x['title']), reverse=True)
            collection['posts_in_order'] = [post['path'] for post in posts_by_date]

    def _fetch_post_filepaths(self):
        search_path = '{dir}**/*{ext}'.format(dir=self.POSTS_DIR, ext=self.POSTS_EXT)
        return glob.glob(search_path, recursive=True)

    def _fetch_post(self, path):
        with open(path, 'r') as f:
            file_contents = f.read()
            html = self.markdown.reset().convert(file_contents)
            meta = self._format_meta(self.markdown.Meta, path)
            return {
                'html': html,
                'meta': meta
            }

    def _format_meta(self, meta, path):
        formatted_meta = dict()

        defaults = {
            'date': '2007-09-16',
            'is_hidden': False,
            'is_draft': False,
            'is_collection_meta': False,
            'is_post_meta': False,
        }

        for k, v in meta.items():
            key = k.lower()
            formatted_meta[k.lower()] = self._parse_str(v[0]) if len(v) <= 1 else v

        for key in defaults:
            formatted_meta[key] = formatted_meta.get(key, defaults[key])

        formatted_meta['path'] = path
        formatted_meta['collection'] = self._get_collection_from_path(path)

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

    def _get_collection_from_path(self, path):
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

