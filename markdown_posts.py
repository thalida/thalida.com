import os
import glob
import markdown

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
        self.posts = self.load_posts()

    def load_posts(self):
        posts = {
            'all': {},
            'visible': {},
            'visible_meta': {},
        }
        search_path = '{dir}**/*{ext}'.format(dir=self.POSTS_DIR, ext=self.POSTS_EXT)
        for file_path in glob.iglob(search_path, recursive=True):
            post = self.fetch_post(file_path)
            posts['all'][file_path] = post
            if post['meta']['is_visible']:
                posts['visible'][file_path] = post
                posts['visible_meta'][file_path] = post['meta']

        return posts

    def fetch_post(self, path):
        with open(path, 'r') as f:
            file_contents = f.read()
            html = self.markdown.reset().convert(file_contents)
            meta = self.format_meta(self.markdown.Meta, path)
            return {
                'html': html,
                'meta': meta,
            }

    def format_meta(self, meta, path):
        formatted_meta = dict()

        for k, v in meta.items():
            formatted_meta[k] = v[0] if len(v) <= 1 else v

        for key in ('is_hidden', 'is_draft'):
            formatted_meta[key] = formatted_meta.get(key, '').lower() in ('true', 'yes')

        formatted_meta['is_visible'] = not formatted_meta['is_hidden'] and not formatted_meta['is_draft']
        formatted_meta['url'] = self.convert_path_to_url(path)

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
        return self.posts['visible'][path]

    def get_visible_meta(self):
        return list(self.posts['visible_meta'].values())
