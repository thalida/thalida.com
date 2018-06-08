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
                    'date': '2018-01-01T00:00:00',
                    'is_draft': False,
                    'is_hidden': False,
                    'is_visible': True,
                    'random_boolean': True,
                },
            },
            {
                'file': 'posts/file2.md',
                'html': 'a',
                'meta': {
                    'url': '/x/file2',
                    'title': 'a',
                    'date': '2018-01-02T00:00:00',
                    'is_draft': False,
                    'is_hidden': False,
                    'is_visible': True,
                },
            },
            {
                'file': 'posts/file3.md',
                'html': 'b',
                'meta': {
                    'url': '/x/file3',
                    'title': 'b',
                    'date': '2018-01-02T00:00:00',
                    'is_draft': False,
                    'is_hidden': False,
                    'is_visible': True,
                },
            },
            {
                'file': 'posts/nested/nested1.md',
                'html': 'c',
                'meta': {
                    'url': '/x/nested/nested1',
                    'title': 'c',
                    'date': '2018-01-05T00:00:00',
                    'is_draft': True,
                    'is_hidden': False,
                    'is_visible': False,
                },
            },
            {
                'file': 'posts/nested/nested2.md',
                'html': 'd',
                'meta': {
                    'url': '/x/nested/nested2',
                    'title': 'd',
                    'date': '2007-09-16T00:00:00',
                    'is_draft': False,
                    'is_hidden': True,
                    'is_visible': False,
                },
            },
        ]

        self.expected_posts = {post['file']: {'html': post['html'], 'meta': post['meta']} for post in posts}
        

    def test_posts_collection_after_load(self):
        markdown = MarkdownPosts(run_load=False)
        markdown._fetch_post_filepaths = MagicMock(return_value=self.expected_posts.keys())
        markdown._fetch_post = MagicMock(side_effect=self.expected_posts.values())

        markdown._load_posts()
        actual_posts = markdown.posts_collection

        expected_visible_posts = {file:post for file,post in self.expected_posts.items() if post['meta']['is_visible'] is True}
        expected_visible_meta = [expected_visible_posts[post]['meta'] for post in expected_visible_posts]
        expected_visible_meta_by_date = [
            expected_visible_meta[2],
            expected_visible_meta[1],
            expected_visible_meta[0],
        ]
        expected_total_posts = len(self.expected_posts.keys())
        expected_total_visible_posts = len(expected_visible_posts.keys())

        self.assertEqual(markdown._fetch_post_filepaths.call_count, 1)
        self.assertEqual(markdown._fetch_post.call_count, expected_total_posts)

        self.assertEqual(len(actual_posts['all'].keys()), expected_total_posts)
        self.assertEqual(len(actual_posts['visible'].keys()), expected_total_visible_posts)
        self.assertEqual(len(actual_posts['visible_meta']), expected_total_visible_posts)
        self.assertEqual(len(actual_posts['visible_meta_by_date']), expected_total_visible_posts)

        self.assertEqual(actual_posts['all'].keys(), self.expected_posts.keys())
        self.assertEqual(actual_posts['visible'].keys(), expected_visible_posts.keys())
        self.assertEqual(actual_posts['visible_meta'], expected_visible_meta)
        self.assertEqual(actual_posts['visible_meta_by_date'], expected_visible_meta_by_date)

        self.assertEqual(markdown.visible_meta, expected_visible_meta)
        self.assertEqual(markdown.visible_meta_by_date, expected_visible_meta_by_date)

    def test_format_meta(self):
        unformatted_meta = { file: {k.title(): [str(v)] for k,v in post['meta'].items() if k is not 'is_visible'} for file,post in self.expected_posts.items()}
        unformatted_meta['posts/nested/nested2.md'].pop('Date')
        unformatted_meta['posts/nested/nested2.md'].pop('Is_Draft')

        markdown = MarkdownPosts(run_load=False)

        for path, post in self.expected_posts.items():
            expected = post['meta']
            actual = markdown._format_meta(unformatted_meta[path], path)
            self.assertEqual(actual, expected)

    def test_convert_url_to_path(self):
        markdown = MarkdownPosts(run_load=False)

        for path, post in self.expected_posts.items():
            actual = markdown._convert_url_to_path(post['meta']['url'])
            expected = path
            self.assertEqual(actual, expected)

    def test_convert_path_to_url(self):
        markdown = MarkdownPosts(run_load=False)

        for path, post in self.expected_posts.items():
            actual = markdown._convert_path_to_url(path)
            expected = post['meta']['url']
            self.assertEqual(actual, expected)

if __name__ == '__main__':
    unittest.main()
