# Builtins
import os
import glob
from datetime import datetime

# Third Party
import markdown
import dateparser

class MarkdownPosts:
    POSTS_URL_DECORATOR = '/x/'
    POSTS_DIR = 'posts/'
    POSTS_EXT = '.md'
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
        if run_load:
            self._load_posts()

    @property
    def visible_meta(self):
        return self.posts_collection['visible_meta']

    @property
    def visible_meta_by_date(self):
        return self.posts_collection['visible_meta_by_date']

    @property
    def visible_post_order(self):
        return self.posts_collection['visible_post_order']

    @property
    def total_visible_posts(self):
        return len(self.posts_collection['visible_meta'])
    

    def get_post_by_url(self, url):
        path = self._convert_url_to_path(url)
        return self.get_post_by_path(path)

    def get_post_by_path(self, path):
        return self.posts_collection['visible'][path]

    def get_prev_next(self, path):
        index = self.visible_post_order.index(path)
        
        prev_index = index - 1 if index - 1 >= 0 else self.total_visible_posts - 1
        next_index = index + 1 if index + 1 < self.total_visible_posts else 0

        prev_post_path = self.visible_post_order[prev_index]
        next_post_path = self.visible_post_order[next_index]

        prev_post = self.get_post_by_path(prev_post_path)
        next_post = self.get_post_by_path(next_post_path)

        return (prev_post, next_post)


    def _load_posts(self):
        posts_collection = {
            'all': {},
            'visible': {},
            'visible_meta': [],
            'visible_meta_by_date': [],
        }

        for filepath in self._fetch_post_filepaths():
            post = self._fetch_post(filepath)
            posts_collection['all'][filepath] = post

            if post['meta']['is_visible']:
                posts_collection['visible'][filepath] = post
                posts_collection['visible_meta'].append(post['meta'])

        posts_collection['visible_meta_by_date'] = sorted(posts_collection['visible_meta'], key=lambda x: (x['date'], x['title']), reverse=True)
        posts_collection['visible_post_order'] = [meta['path'] for meta in posts_collection['visible_meta_by_date']]

        self.posts_collection = posts_collection

        return self.posts_collection

    def _fetch_post_filepaths(self):
        search_path = '{dir}**/*{ext}'.format(dir=self.POSTS_DIR, ext=self.POSTS_EXT)
        return glob.glob(search_path, recursive=True)

    def _fetch_post(self, path):
        with open(path, 'r') as f:
            file_contents = f.read()
            html = self.markdown.reset().convert(file_contents)
            meta = self._format_meta(self.markdown.Meta, path)
            return {
                'path': path,
                'html': html,
                'meta': meta
            }

    def _format_meta(self, meta, path):
        formatted_meta = dict()

        defaults = {
            'date': '2007-09-16',
            'is_hidden': False,
            'is_draft': False,
        }

        for k, v in meta.items():
            key = k.lower()
            formatted_meta[k.lower()] = self._parse_str(v[0]) if len(v) <= 1 else v

        for key in defaults:
            formatted_meta[key] = formatted_meta.get(key, defaults[key])

        formatted_meta['path'] = path
        formatted_meta['is_visible'] = not formatted_meta['is_hidden'] and not formatted_meta['is_draft']
        formatted_meta['url'] = self._convert_path_to_url(path)

        if formatted_meta.get('date') is defaults['date']:
            formatted_meta['is_default_date'] = True

        formatted_meta['date'] = dateparser.parse(formatted_meta.get('date')).isoformat()

        return formatted_meta

    def _convert_url_to_path(self, url):
        relative_path = url.replace(self.POSTS_URL_DECORATOR, '', 1)
        return '{posts_dir}{filepath}{ext}'.format(posts_dir=self.POSTS_DIR, filepath=relative_path, ext=self.POSTS_EXT)

    def _convert_path_to_url(self, path): 
        url = path.replace(self.POSTS_DIR, self.POSTS_URL_DECORATOR, 1)
        url = url.rsplit(self.POSTS_EXT, 1)[0]
        return url

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

