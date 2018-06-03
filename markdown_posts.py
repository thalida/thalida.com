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

    def find_by_name(self, filename):
        file_path = self.format_path(filename)
        return self.find_by_path(file_path)

    def find_by_path(self, file_path):
        with open(file_path, 'r') as f:
            file_contents = f.read()
            html = self.markdown.reset().convert(file_contents)
            meta = self.format_meta(self.markdown.Meta)
            return {
                'html': html,
                'meta': meta,
            }

    def get_all_meta(self):
        posts = []
        post_paths = glob.glob("posts/*.md")
        for (file_path) in post_paths:
            post = self.find_by_path(file_path)
            if post['meta'].get('is_visible'):
                posts.append(post['meta'])

        return posts
