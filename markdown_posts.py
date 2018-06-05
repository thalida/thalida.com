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
        self.force_url_decorator = True
        self.markdown = markdown.Markdown(extensions=self.MARKDOWN_EXTENSIONS, extension_configs=self.MARKDOWN_EXTENSION_CONFIGS)

    def is_valid_path(self, filepath): 
        return filepath.startswith(self.POSTS_DIR) and filepath.endswith(self.POSTS_EXT)

    def format_path(self, filepath):
        # The file is already formatted correctly
        if filepath.startswith(self.POSTS_DIR) and filepath.endswith(self.POSTS_EXT):
            return filepath

        # Yass let's format this path!
        return '{posts_dir}{filepath}{ext}'.format(posts_dir=self.POSTS_DIR, filepath=filepath, ext=self.POSTS_EXT)

    def format_meta(self, meta, path):
        formatted_meta = dict()

        for k, v in meta.items():
            formatted_meta[k] = v[0] if len(v) <= 1 else v

        for key in ('is_hidden', 'is_draft'):
            formatted_meta[key] = formatted_meta.get(key, '').lower() in ('true', 'yes')

        formatted_meta['is_visible'] = not formatted_meta.get('is_hidden') and not formatted_meta.get('is_draft')
        formatted_meta['url'] = path.replace(self.POSTS_DIR, self.POSTS_URL_DECORATOR)

        return formatted_meta

    def get_post_by_path(self, path):
        with open(self.format_path(path), 'r') as f:
            file_contents = f.read()
            html = self.markdown.reset().convert(file_contents)
            meta = self.format_meta(self.markdown.Meta, path)
            return {
                'html': html,
                'meta': meta,
            }

    def get_all_post_meta(self):
        posts = []
        for file_path in glob.iglob('posts/**/*.md', recursive=True):
            post = self.get_post_by_path(file_path)
            if post['meta'].get('is_visible'):
                posts.append(post['meta'])

        return posts
