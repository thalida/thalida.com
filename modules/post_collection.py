# Builtins
import os
import glob
import re
from datetime import datetime
from pprint import pprint
from collections import OrderedDict
from operator import itemgetter
from functools import cmp_to_key

# Third Party
import markdown
import pymdownx
# import mdx_outline
import dateparser


class PostCollection:
    """Posts Collection Class

    Manages the markdown posts collection, groups and organizes posts and collections,
    provides lookups for posts by url.

    Variables:
        MARKDOWN_EXTENSIONS {list} -- Markdown Plugin Extensions
        MARKDOWN_EXTENSION_CONFIGS {dict} -- Configs for the Markdown Plugins

        META_DEFAULTS {dict} -- Default types and values for post meta data
        META_FALLBACK_DEFAULT {tuple} -- Fallback type and value for all metadata

        markdown {dict} -- Markdown plugin instance

        url_decorator {str} -- URL path to prepend on all posts
        posts_dir {str} -- Server directory where posts are located
        posts_ext {str} -- File extension used on posts
        collection_prefix {str} -- Prefix used on directories that should be considered collections
        default_collection_key {str} -- Default collection for posts that don't have any

        posts_meta {dict} -- All post meta data keyed by path
        posts_html {dict} -- All post html keyed by path
        post_url_to_path {dict} -- Map of posts urls to their corresponding paths

        collections {dict} -- All post collections keyed by collection name
        collections_order {list} -- List of post collections names in visual order
    """
    MARKDOWN_EXTENSIONS = [
        # 'outline',
        'pymdownx.keys',
        'pymdownx.mark',
        'pymdownx.caret',
        'pymdownx.tilde',
        'pymdownx.emoji',
        'pymdownx.tasklist',
        'pymdownx.betterem',
        'pymdownx.magiclink',
        'pymdownx.escapeall',
        'pymdownx.highlight',
        'pymdownx.superfences',
        'pymdownx.inlinehilite',
        'pymdownx.smartsymbols',
        'markdown.extensions.meta',
        'markdown.extensions.nl2br',
        'markdown.extensions.tables',
        'markdown.extensions.smarty',
        'markdown.extensions.attr_list',
        'markdown.extensions.sane_lists',
    ]
    MARKDOWN_EXTENSION_CONFIGS = {
        'pymdownx.highlight': {
            'guess_lang': True
        }
    }

    META_DEFAULTS = {}
    META_FALLBACK_DEFAULT = ()

    def __init__(self, posts_dir='./posts_collection/', url_decorator='/x/', posts_ext='.md', collection_prefix='/collection.', default_collection_key='default', run_load=True):
        """Class Init

        Init/setup function for PostsCollection Class, loads in data by default
        unless told otherwise by args

        Keyword Arguments:
            run_load {bool} -- Should init run the load function to get data? (default: {True})
        """

        # Setup default types & values for post/collection meta data
        self.META_DEFAULTS = {
            'visual_index':  (PostCollection._cast_to_int, None, ['index']),
            'title': (PostCollection._cast_to_string, "Untitled", []),
            'summary': (PostCollection._cast_to_string, "", []),
            'subtext': (PostCollection._cast_to_string, "", []),
            'date_posted': (PostCollection._cast_to_date, PostCollection._cast_to_date("2007-09-16"), ['date']),
            'date_updated': (PostCollection._cast_to_date, None, []),
            'image': (PostCollection._cast_to_string, "", []),
            'icons': (PostCollection._cast_to_list, [], ['icon']),
            'tags': (PostCollection._cast_to_list, [], ['tag']),
            'sort_posts_by': (PostCollection._cast_to_list, [], []),
            'is_hidden': (PostCollection._cast_to_bool, False, ['hidden']),
            'is_draft': (PostCollection._cast_to_bool, False, ['draft']),
            'is_featured': (PostCollection._cast_to_bool, False, ['featured']),
            'is_collection_meta': (PostCollection._cast_to_bool, False, []),
            'is_post_meta': (PostCollection._cast_to_bool, False, []),
        }
        self.META_FALLBACK_DEFAULT = (PostCollection._cast_to_string, "", [])

        # Get an instance of the markdown function
        self.markdown = markdown.Markdown(
            extensions=self.MARKDOWN_EXTENSIONS,
            extension_configs=self.MARKDOWN_EXTENSION_CONFIGS,
            lazy_ol=False
        )

        # Set posts collection params
        self.posts_dir = posts_dir
        self.url_decorator = url_decorator
        self.posts_ext = posts_ext
        self.collection_prefix = collection_prefix
        self.default_collection_key = default_collection_key

        # Setup defaults
        self.posts_meta = {}
        self.posts_html = {}
        self.post_url_to_path = {}
        self.collections = {}
        self.collections_order = []

        # Setup regex patterns
        re_posts_dir = self.posts_dir.replace('/', '\/')
        re_collection = self.collection_prefix[1:-1]
        self.url_pattern = re.compile(f'{re_posts_dir}(?:{re_collection}\.)?([\w\/\-]+)\{self.posts_ext}')
        self.collection_pattern = re.compile(f'{re_collection}\.([^\/]+)')

        if run_load:
            self._load()

    def get_post_by_url(self, url):
        """Get Post Data by Post Url

        Get the meta, html, and collection for a post by it's url

        Arguments:
            url {str} -- The url for a post

        Returns:
            [dict] -- Dict of all post data
        """
        return self.get_post_by_path(self.post_url_to_path[url])

    def get_post_by_path(self, path):
        """Get Post Data by Post Path

        Get the meta, html, and collection for a post by it's path

        Arguments:
            path {str} -- The path for a post

        Returns:
            [dict] -- Dictonary of the post meta, html, and collection meta
        """
        post_html = self.posts_html[path]
        post_meta = self.posts_meta[path]
        collection_meta = self.collections[post_meta['collection']]['meta']
        return {
            'html': post_html,
            'meta': post_meta,
            'collection_meta': collection_meta
        }

    def get_next_posts_paths(self, curr_post_path, amount=1):
        """Get the Next Posts Paths in a Collection

        Given a post path get the next n (amount) posts in the collection
        If no more posts in a collection, check the next collection, and repeat

        Arguments:
            curr_post_path {string} -- Path of the current post

        Keyword Arguments:
            amount {number} -- How many other posts to return (default: {1})

        Returns:
            [list] -- List of the next post paths
        """

        # Get the current post by path
        return self._get_next_posts_overall(curr_post_path, amount, next_posts=[])

    def _get_next_posts_overall(self, curr_post_path, amount, inclusive=False, next_posts=[]):
        if len(next_posts) < amount:
            curr_post = self.get_post_by_path(curr_post_path)
            collection_key = curr_post['meta']['collection']
            collection_posts = self.collections[collection_key]['posts_in_order']
            curr_post_index = collection_posts.index(curr_post['meta']['path'])

            # Get the start and end index for the next set of posts
            start_index = curr_post_index if inclusive else curr_post_index + 1
            end_index = start_index + (amount - len(next_posts))

            # Splice the collection to get only the next posts
            next_posts.extend(collection_posts[start_index:end_index])

        if len(next_posts) >= amount:
            return next_posts[0:amount]
        else:
            curr_collection_idx = self.collections_order.index(collection_key)
            next_collection_idx = curr_collection_idx + 1 if curr_collection_idx < len(self.collections_order) - 1 else 0
            next_collection_key = self.collections_order[next_collection_idx]
            post_path = self.collections[next_collection_key]['posts_in_order'][0]
            return self._get_next_posts_overall(post_path, amount, inclusive=True, next_posts=next_posts)

    def _load(self):
        """Load Class Data

        Fetches all class data, the ONLY setter for all class data, excluding
        gloabals!
        """

        # Loop over all of the post filepaths
        filepaths = self._get_filepaths()
        for filepath in filepaths:

            # Load a file from the server
            file = self._load_file(filepath)

            # Get the post path and collection name for later
            path = file['meta']['path']
            collection = file['meta']['collection']

            # If this collection doesn't exist yet, lets create it!
            if collection not in self.collections:
                self.collections[collection] = {
                    'key': collection,
                    'meta': {},
                    'posts': [],
                    'posts_in_order': []
                }

            # If we're working with a collection file save it to the right place
            if file['meta']['is_collection_meta']:
                self.collections[collection]['meta'] = file['meta']

            # If we're workign wtih a post file save it properly
            if file['meta']['is_post_meta']:
                self.posts_meta[path] = file['meta']
                self.posts_html[path] = file['html']

                # Update the collection with the post path
                self.collections[collection]['posts'].append(path)

                # Update the helper dict mapping post urls to paths
                self.post_url_to_path[file['meta']['url']] = path

        # Get the collections key value pairs
        collection_items = self.collections.items()
        num_collections = len(collection_items)

        # Create an empty list the exact size of the # of collections we have
        # this list will be updated to list the collections in order
        tmp_collections_order = [None] * num_collections

        # skipped_collections list will be used to fill in the collections who
        # don't havea specified order
        skipped_collections = []

        for collection_key, collection in collection_items:
            collection['posts_in_order'] = self._sort_posts(collection['posts'], collection['meta']['sort_posts_by'])

            # Get the visual index for post and check that it's within the bounds
            # of the # of posts we have
            visual_index = collection['meta']['visual_index']
            if visual_index is not None and visual_index < num_collections:
                # Update or insert the collection at it's correct visual index
                tmp_collections_order = self._upsert(tmp_collections_order, collection_key, index=visual_index)

            # If no visual index given lets skip inserting this collection for now!
            else:
                skipped_collections.append(collection_key)

        # After we've inserted all the collections that had valid visual indexes
        # Lets fill in the blanks with any skipped collections
        for collection_key in skipped_collections:
            tmp_collections_order = self._upsert(tmp_collections_order, collection_key)

        # We're done setting up the order of the collections, lets remove any lingering blanks (Nones)
        self.collections_order = [c for c in tmp_collections_order if self._is_valid_collection(c)]

    def _is_valid_collection(self, collection_key):
        is_valid_key = collection_key is not None
        is_hidden = self.collections[collection_key]['meta']['is_hidden'] if is_valid_key else True
        has_posts = len(self.collections[collection_key]['posts']) > 0 if is_valid_key else False
        return is_valid_key and not is_hidden and has_posts

    def _get_filepaths(self):
        """Get all the files in our posts folder

        Given a posts directory, fetch all the matching file paths

        Returns:
            [list] -- List of all post/collection files
        """
        search_path = '{dir}**/*{ext}'.format(dir=self.posts_dir, ext=self.posts_ext)
        return glob.glob(search_path, recursive=True)

    def _load_file(self, path):
        """Loads a File Given it's Path

        Fetchs a file at the given path and formats the markdown and meta data

        Arguments:
            path {str} -- A file path
        """
        with open(path, 'r') as f:
            file_contents = f.read()
            html = self.markdown.reset().convert(file_contents)
            meta = self._format_meta(self.markdown.Meta, path)
            return {
                'html': html,
                'meta': meta
            }


    def _cmp(self, a, b):
        try:
            return (a > b) - (a < b)
        except TypeError:
            print("CMP Error:", a, b)
            return -1


    def _multikeysort(self, items, columns, functions={}, getter=itemgetter):
        """Sort a list of dictionary objects or objects by multiple keys bidirectionally.
        From: https://gist.github.com/malero/418204/3afe18d1adfe5762dcad3c83b13a702291f0913a

        Keyword Arguments:
        items -- A list of dictionary objects or objects
        columns -- A list of column names to sort by. Use -column to sort in descending order
        functions -- A Dictionary of Column Name -> Functions to normalize or process each column value
        getter -- Default "getter" if column function does not exist
        """
        comparers = []
        for col in columns:
            column = col[1:] if col.startswith('-') else col
            if column not in functions:
                functions[column] = getter(column)
            comparers.append((functions[column], 1 if column == col else -1))

        def comparer(left, right):
            for func, polarity in comparers:
                result = self._cmp(func(left), func(right))
                if result:
                    return polarity * result
            else:
                return 0
        return sorted(items, key=cmp_to_key(comparer))

    def _get_sort_visual_index(self, meta):
        return meta['visual_index'] if meta['visual_index'] is not None else 999

    def _get_sort_date(self, meta):
        return meta['date_updated'] + ' Z' if meta.get('date_updated') is not None else meta['date_posted'] + ' A'

    def _get_sort_title(self, meta):
        return meta['title'].lower()

    def _sort_posts(self, post_paths, force_sort_by):
        """Sorts Posts

        Sorts pots by date and title

        Arguments:
            post_paths {list} -- List of post paths
        """
        # Get a list of the meta data for the given posts
        posts_meta = [self.posts_meta[path] for path in post_paths]

        sort_fns = {
            'sort_visual_index': self._get_sort_visual_index,
            'sort_date': self._get_sort_date,
            'sort_title': self._get_sort_title
        }

        sort_cols = force_sort_by + ['sort_visual_index', '-sort_date', 'sort_title']

        # Sort posts by date and title and return the paths in order
        sorted_posts = self._multikeysort(posts_meta, sort_cols, functions=sort_fns)
        return [post['path'] for post in sorted_posts if not post['is_hidden']]


    def _format_meta(self, meta, path):
        """Formats File Metadata

        Given the markdown file meta data, lets format it into a dict we can
        use by filling in missing keys with default data, and converting to the
        correct type.

        (The markdown data currently returns all keys in sentence case,and
        values as a list of strings)

        Arguments:
            meta {dict} -- The markdown metadata for a file
            path {string} -- A filepath

        Returns:
            [dict] -- Formatted metadat
        """

        # Combine the keys in the meta data with a list of defautl keys
        all_meta_keys = list(set(list(meta.keys()) + list(self.META_DEFAULTS.keys())))

        formatted_meta = {}
        for key in all_meta_keys:
            key = key.lower()
            (cast_fn, default_value, alias_keys) = self.META_DEFAULTS.get(key, self.META_FALLBACK_DEFAULT)

            meta_value = default_value
            alias_keys = alias_keys + [key]

            for alias in alias_keys:
                if meta.get(alias) is not None:
                    meta_value = meta.get(alias)
                    break

            if isinstance(meta_value, list):
                # Let's make a copy of the list so we're passing around a new reference
                if cast_fn is PostCollection._cast_to_list:
                    meta_value = meta_value.copy()

                # Markdown meta data returns all meta values as a list of 1, so lets get
                # the first (and only) value if we're not expecting a list
                else:
                    meta_value = meta_value[0]

            formatted_meta[key] = cast_fn(meta_value) if meta_value is not None else meta_value

        # Add some additonal keys to the meta data
        formatted_meta['path'] = path
        formatted_meta['collection'] = self._get_collection_key(path)
        formatted_meta['is_external'] = 'external_url' in formatted_meta
        formatted_meta['is_visible'] = not formatted_meta['is_hidden'] and not formatted_meta['is_draft']
        formatted_meta['is_default_date'] = formatted_meta.get('date_posted') == self.META_DEFAULTS['date_posted'][1]

        if formatted_meta.get('is_external'):
            formatted_meta['icons'].append('external')

        all_icons = list(OrderedDict.fromkeys(formatted_meta['icons']))
        # Icons that should come after the title
        after_icons = ['external', 'outgoing-link']
        formatted_meta['icons'] = {
            'all': all_icons,
            'before': [icon for icon in all_icons if icon not in after_icons],
            'after':  [icon for icon in all_icons if icon in after_icons],
        }

        if path.find('_collection-meta.md') > 0:
            formatted_meta['is_collection_meta'] = True
        else:
            formatted_meta['is_post_meta'] = True
            formatted_meta['url'] = self._get_post_url(path)

        # print(formatted_meta)
        # print('+++++++++')
        return formatted_meta

    def _get_post_url(self, path):
        """Gets the post url from it's path

        Given a path convert it to the url used on site

        Arguments:
            path {string} -- A post path

        Returns:
            [str] -- A relative url for a post
        """
        m = re.search(self.url_pattern, path)
        return f'{self.url_decorator}{m.group(1)}'

    def _get_collection_key(self, path):
        """Get the Collection Key (Name) from a Path

        Given a path get the collection name from it, if no collection name
        found then return the default collection

        Arguments:
            path {str} -- A post path

        Returns:
            [str] -- A collection name
        """
        m = re.search(self.collection_pattern, path)

        try:
            group = m.group(1)
        except AttributeError:
            group = self.default_collection_key

        return group

    def _upsert(self, arr, val, index=None, empty_value=None):
        """Update or Insert a Value into An Array

        Given an array and a value update or insert the value into the array
        at a provided index. If no index provided then find the first "empty" (None)
        slot in the array and insert the value there.

        Arguments:
            arr {list} -- An array
            val {any} -- Any value

        Keyword Arguments:
            index {int} -- Index to insert the value at (default: {None})
            empty_value {any} -- Value that indicates an empty state in the array

        Returns:
            [list] -- The updated array
        """

        # If no index is provided find the first empty slot, if none found then
        # set the index to be the end of the list
        if index is None:
            try:
                index = arr.index(empty_value)
            except ValueError:
                index = len(arr)

        # If we're inserting at an empty spot fill it
        if arr[index] is empty_value:
            arr[index] = val
        # Else if there's something already at that index insert at the index and
        # shift the array to the right
        else:
            arr.insert(index, val)

        return arr

    def _cast_meta(self, key, value):
        """Casts a meta value to defautl types/values

        Given a meta key value pair update the value to be the correc type,
        if no value is provided set to it's default value

        Arguments:
            key {[type]} -- [description]
            value {[type]} -- [description]

        Returns:
            [type] -- [description]
        """

        # Get the default type and value for a given meta key
        (default_type, default_value) = self.META_DEFAULTS.get(key, self.META_FALLBACK_DEFAULT)

        # Let's make a copy of the list so we're passing around a new reference
        if default_type is PostCollection._cast_to_list and isinstance(default_value, list):
            default_value = default_value.copy()

        # Markdown meta data returns all meta values as a list of 1, so lets get
        # the first (and only) value if we're not expecting a list
        if default_type is not PostCollection._cast_to_list and value is not None:
            value = value[0]

        return default_value if value is None else default_type(value)

    @staticmethod
    def _cast_to_int(value):
        """Casts any Value to an Int

        Converts any value to an int, if it can't it'll just return the orig value

        Arguments:
            value {any} -- Any Value

        Returns:
            [int] -- Converted Int
        """
        try:
            return int(value)
        except TypeError:
            return value

    @staticmethod
    def _cast_to_list(value):
        """Casts any Value to a List

        Converts any value to a list (unless it's already a list)

        Arguments:
            value {any} -- Any Value

        Returns:
            [list] -- A list of value
        """
        return value if isinstance(value, list) else [value]

    @staticmethod
    def _cast_to_string(value):
        """Casts any Value to a String

        What the summary says.

        Arguments:
            value {any} -- Any Value

        Returns:
            [str] -- A string
        """
        return str(value)

    @staticmethod
    def _cast_to_bool(value):
        """Casts any Value to a Boolean

        Converts any value to a string, then checks it if the string value is one
        of any of the valid truthy states

        Arguments:
            value {any} -- Any Value

        Returns:
            [bool] -- Value as a boolean
        """
        return PostCollection._cast_to_string(value).lower() in ['true','1', 'yes', 'y']

    @staticmethod
    def _cast_to_date(value):
        """Casts any Value to a Date

        Given a value convert it to a string, then try to convert that string
        into a data

        Arguments:
            value {any} -- Any Value

        Returns:
            [date] -- Returns a date as an isoformat
        """
        value = PostCollection._cast_to_string(value).lower()
        return dateparser.parse(value).isoformat()
