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

    def __init__(self):
        self.markdown = markdown.Markdown(extensions=self.MARKDOWN_EXTENSIONS, extension_configs=self.MARKDOWN_EXTENSION_CONFIGS)
        self.posts_collection = self.load_posts()

    def load_posts(self):
        posts_collection = {
            'all': {},
            'visible': {},
            'visible_meta': [],
            'visible_meta_by_date': [],
        }

        search_path = '{dir}**/*{ext}'.format(dir=self.POSTS_DIR, ext=self.POSTS_EXT)
        for file_path in glob.iglob(search_path, recursive=True):
            post = self.fetch_post(file_path)
            
            posts_collection['all'][file_path] = post

            if post['meta']['is_visible']:
                posts_collection['visible'][file_path] = post
                posts_collection['visible_meta'].append(post['meta'])

        posts_collection['visible_meta_by_date'] = sorted(posts_collection['visible_meta'], key=lambda x: (x['date'], x['title']), reverse=True)

        return posts_collection

    def fetch_post(self, path):
        with open(path, 'r') as f:
            file_contents = f.read()
            html = self.markdown.reset().convert(file_contents)
            meta = self.format_meta(self.markdown.Meta, path)
            date = meta['date']
            return {
                'html': html,
                'meta': meta
            }

    def format_meta(self, meta, path):
        formatted_meta = dict()

        defaults = {
            'date': '2007-09-16',
            'is_hidden': '',
            'is_draft': '',
        }

        for k, v in meta.items():
            formatted_meta[k.lower()] = v[0] if len(v) <= 1 else v

        for key in defaults:
            formatted_meta[key] = formatted_meta.get(key, defaults[key])

        for key in ('is_hidden', 'is_draft'):
            formatted_meta[key] = formatted_meta.get(key).lower() in ('true', 'yes')

        formatted_meta['is_visible'] = not formatted_meta['is_hidden'] and not formatted_meta['is_draft']
        formatted_meta['url'] = self.convert_path_to_url(path)
        formatted_meta['date'] = dateparser.parse(formatted_meta.get('date')).isoformat()

        return formatted_meta

    def convert_url_to_path(self, url):
        relative_path = url.replace(self.POSTS_URL_DECORATOR, '', 1)
        return '{posts_dir}{filepath}{ext}'.format(posts_dir=self.POSTS_DIR, filepath=relative_path, ext=self.POSTS_EXT)

    def convert_path_to_url(self, path): 
        url = path.replace(self.POSTS_DIR, self.POSTS_URL_DECORATOR, 1)
        url = url.rsplit(self.POSTS_EXT, 1)[0]
        return url

    def get_post_by_url(self, url):
        path = self.convert_url_to_path(url)
        return self.get_post_by_path(path)

    def get_post_by_path(self, path):
        return self.posts_collection['visible'][path]

    def get_visible_meta(self):
        return self.posts_collection['visible_meta']

    def get_visible_meta_by_date(self):
        return self.posts_collection['visible_meta_by_date']
