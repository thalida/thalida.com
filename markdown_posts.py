import os
import glob
import markdown

class Markdown_Posts:
    DIR = 'posts'
    EXT = 'md'
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

    def format_path(self, filename):
        return '{dir}/{filename}.{ext}'.format(dir=self.DIR, filename=filename, ext=self.EXT)

    def format_meta(self, meta):
        formatted_meta = dict()

        for k, v in meta.items():
            formatted_meta[k] = v[0] if len(v) <= 1 else v

        for key in ('is_hidden', 'is_draft'):
            formatted_meta[key] = formatted_meta.get(key, '').lower() in ('true', 'yes')

        formatted_meta['is_visible'] = not formatted_meta.get('is_hidden') and not formatted_meta.get('is_draft')

        return formatted_meta

    def fetch_by_name(self, filename):
        file_path = self.format_path(filename)
        return self.fetch_by_path(file_path)

    def fetch_by_path(self, file_path):
        with open(file_path, 'r') as f:
            file_contents = f.read()
            html = self.markdown.reset().convert(file_contents)
            meta = self.format_meta(self.markdown.Meta)
            return html, meta

    def fetch_all_meta(self):
        posts = []
        post_paths = glob.glob("posts/*.md")
        for (file_path) in post_paths:
            post_html, post_meta = self.fetch_by_path(file_path)
            if post_meta.get('is_visible'):
                posts.append(post_meta)

        return posts
