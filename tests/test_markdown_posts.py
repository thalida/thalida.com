from pprint import pprint
import unittest
from unittest.mock import patch, MagicMock
# from unittest import TestCase, mock

from markdown_posts import MarkdownPosts

class TestMarkdownPosts(unittest.TestCase):
    def setUp(self):
        posts = [
            {
                'file': 'posts/file1.md',
                'html': 'a',
                'meta': {
                    'url': '/x/file1',
                    'title': 'a',
                    'date': '1',
                    'is_visible': True,
                },
            },
            {
                'file': 'posts/file2.md',
                'html': 'a',
                'meta': {
                    'url': '/x/file2',
                    'title': 'a',
                    'date': '2',
                    'is_visible': True,
                },
            },
            {
                'file': 'posts/file3.md',
                'html': 'b',
                'meta': {
                    'url': '/x/file3',
                    'title': 'b',
                    'date': '2',
                    'is_visible': True,
                },
            },
            {
                'file': 'posts/nested/nested1.md',
                'html': 'c',
                'meta': {
                    'url': '/x/nested/nested1',
                    'title': 'c',
                    'date': '2',
                    'is_visible': False,
                },
            },
        ]

        self.provide_posts = {v['file']: {'html': v['html'], 'meta': v['meta']} for v in posts}
        self.provide_visible_posts = {k:v for k,v in self.provide_posts.items() if v['meta']['is_visible'] is True}
        self.provide_visible_meta = [self.provide_visible_posts[k]['meta'] for k in self.provide_visible_posts]
        self.provide_visible_meta_by_date = [
            self.provide_visible_meta[2],
            self.provide_visible_meta[1],
            self.provide_visible_meta[0],
        ]
        self.total_posts = len(self.provide_posts.keys())
        self.total_visible_posts = len(self.provide_visible_posts.keys())

    def test_posts_collection_after_load(self):
        markdown = MarkdownPosts(run_load=False)
        markdown._fetch_post_filepaths = MagicMock(return_value=self.provide_posts.keys())
        markdown._fetch_post = MagicMock(side_effect=self.provide_posts.values())

        markdown._load_posts()
        posts = markdown.posts_collection

        assert markdown._fetch_post_filepaths.call_count == 1
        assert markdown._fetch_post.call_count == self.total_posts

        assert len(posts['all'].keys()) == self.total_posts
        assert len(posts['visible'].keys()) == self.total_visible_posts
        assert len(posts['visible_meta']) == self.total_visible_posts
        assert len(posts['visible_meta_by_date']) == self.total_visible_posts

        assert posts['all'].keys() == self.provide_posts.keys()
        assert posts['visible'].keys() == self.provide_visible_posts.keys()
        assert posts['visible_meta'] == self.provide_visible_meta
        assert posts['visible_meta_by_date'] == self.provide_visible_meta_by_date

        assert markdown.visible_meta == self.provide_visible_meta
        assert markdown.visible_meta_by_date == self.provide_visible_meta_by_date

    def test_format_meta(self):
        markdown = MarkdownPosts(run_load=False)
        markdown._convert_path_to_url = MagicMock(side_effect=[v['meta']['url'] for k,v in self.provide_posts.items()])


if __name__ == '__main__':
    unittest.main()
