# !!!!!
import os
os.environ['TZ'] = 'UTC'

import logging
from flask import Flask, request, make_response, render_template, jsonify, redirect, url_for, abort
from pprint import pprint
from datetime import datetime

import modules.utils as utils
import modules.cookies as cookies
from modules.work import work
from modules.window import Window
from modules.post_collection import PostCollection

logger = logging.getLogger(__name__)
app = Flask(__name__)

demo_posts = PostCollection(
    posts_dir='./posts/demo/',
    url_decorator='/demo/x/'
)
my_posts = PostCollection(
    posts_dir='./posts/collection/'
)
my_window = Window()

@app.route('/')
def index():
    """Index Route

    Main landing pae for thalida.com (as well as fallback route for 404s)

    Decorators:
        app.route

    Returns:
        response -- A flask response including template + variables
    """

    try:
        force_update = cookies.get_force_update(request)
        weather_cookie = request.cookies.get(cookies.format_cookie_key(cookies.KEYS['WEATHER']))

        # Gather the data needed to render the page
        window = my_window.get_state(request, force_update, weather_cookie)
        collections_order = my_posts.collections_order

        response = make_response(render_template(
            'home.html',
            **get_globals(my_posts),
            window=window,
            collections_order=collections_order,
            work=work,
        ))

        cookies.set_cookies(request, response, weather=window['weather'])

        return response
    except Exception:
        logger.exception('500 Error Fetching Index')
        abort(500)


@app.route('{posts_path}<path:path>'.format(posts_path=my_posts.url_decorator))
def post(path):
    """View Post Route

    Renders a post given a set of rules, otherwise throws a 404 and aborts

    Decorators:
        app.route

    Arguments:
        path {string} -- The given url path

    Returns:
        response -- A flask response including template + variables

    Raises:
        ValueError -- An attempt to access a post that doesn't exist, is hidden,
                      or is part of a hidden collection
    """
    try:
        post = my_posts.get_post_by_url(request.path)

        # Don't render a post that's hidden or is in a hidden collection
        if not post['collection_meta']['is_visible'] or not post['meta']['is_visible']:
            raise ValueError('Attempted to access a hidden collection or post')

        # Return to an external url if the post defines one in it's meta
        if post['meta']['is_external']:
            return redirect(post['meta']['external_url'])

        # Get a set of next posts to read after this one
        next_posts_paths = my_posts.get_next_posts_paths(post['meta']['path'], amount=3)

        # Build the repsonse object for a post
        response = make_response(render_template(
            'post.html',
            **get_globals(my_posts),
            post=post,
            next_posts=next_posts_paths,
        ))

        cookies.set_cookies(request, response)

        return response
    except (ValueError, KeyError):
        abort(404)
    except Exception:
        logger.exception('500 Error Fetching Post')
        abort(500)


@app.route('/api/window-data', methods=['GET'])
def get_window_data():
    try:
        timestamp = request.args.get('timestamp')
        force_update = cookies.get_force_update(request)
        weather_cookie = request.cookies.get(cookies.format_cookie_key(cookies.KEYS['WEATHER']))

        # Gather the data needed to render the page
        window = my_window.get_state(request, force_update, weather_cookie, timestamp)
        window_outside_html = render_template('_partials/window-outside.html', window=window)
        window_label_html = render_template('_partials/window-label-text.html', window=window)
        response = make_response(jsonify({
            'window_outside_html': window_outside_html,
            'window_label_html': window_label_html,
            'data': window,
        }))

        cookies.set_cookies(request, response, weather=window['weather'], visit=False)

        return response
    except Exception:
        logger.exception('500 Error Fetching Window Outside')
        abort(500)


@app.route('/colors')
def colors():
    """Colors Route

    Test page for colors over the day

    Decorators:
        app.route

    Returns:
        response -- A flask response including template + variables
    """

    try:
        timestamp = request.args.get('timestamp')
        force_update = cookies.get_force_update(request)
        weather_cookie = request.cookies.get(cookies.format_cookie_key(cookies.KEYS['WEATHER']))
        range_24hr = my_window.get_range_over_day(request, force_update, weather_cookie, timestamp)
        response = make_response(render_template(
            'colors.html',
            **get_globals(my_posts),
            range_24hr=range_24hr
        ))

        return response
    except Exception:
        logger.exception('500 Error Fetching Index')
        abort(500)


@app.route('/demo')
def demo_index():
    """Demo Route

    Demo landing pae for thalida.com

    Decorators:
        app.route

    Returns:
        response -- A flask response including template + variables
    """

    try:
        force_update = cookies.get_force_update(request)
        weather_cookie = request.cookies.get(cookies.format_cookie_key(cookies.KEYS['WEATHER']))

        # Gather the data needed to render the page
        window = my_window.get_state(request, force_update, weather_cookie)
        collections_order = demo_posts.collections_order

        response = make_response(render_template(
            'home.html',
            **get_globals(demo_posts),
            window=window,
            collections_order=collections_order,
            work=work,
        ))

        cookies.set_cookies(request, response, weather=window['weather'])

        return response
    except Exception:
        logger.exception('500 Error Fetching Index')
        abort(500)


@app.route('{posts_path}<path:path>'.format(posts_path=demo_posts.url_decorator))
def demo_post(path):
    """Demo View Post Route

    Renders a post given a set of rules, otherwise throws a 404 and aborts

    Decorators:
        app.route

    Arguments:
        path {string} -- The given url path

    Returns:
        response -- A flask response including template + variables

    Raises:
        ValueError -- An attempt to access a post that doesn't exist, is hidden,
                      or is part of a hidden collection
    """
    try:
        post = demo_posts.get_post_by_url(request.path)

        # Don't render a post that's hidden or is in a hidden collection
        if not post['collection_meta']['is_visible'] or not post['meta']['is_visible']:
            raise ValueError('Attempted to access a hidden collection or post')

        # Return to an external url if the post defines one in it's meta
        if post['meta']['is_external']:
            return redirect(post['meta']['external_url'])

        # Get a set of next posts to read after this one
        next_posts_paths = demo_posts.get_next_posts_paths(post['meta']['path'], amount=3)

        # Build the repsonse object for a post
        response = make_response(render_template(
            'post.html',
            **get_globals(demo_posts),
            post=post,
            next_posts=next_posts_paths,
        ))

        cookies.set_cookies(request, response)

        return response
    except (ValueError, KeyError):
        abort(404)
    except Exception:
        logger.exception('500 Error Fetching Post')
        abort(500)


@app.errorhandler(404)
def not_found(exc):
    """404 Page

    What to do when accessing a page that does not exist

    Decorators:
        app.errorhandler

    Arguments:
        exc {Exception

    Returns:
        redirect -- Redirects the visitor to the index page
    """
    return redirect(url_for('index'))


def get_globals(posts):
    """Global View Data

    Global data for all view templates

    Returns:
        [dict] -- Dict of globally accessible data
    """
    now = datetime.now()
    return {
        'globals': {
            'image_version': str(1),
            'datetime': {
                'now': now,
                'current_year': now.strftime('%Y'),
                'server_start': cookies.SERVER_START_TIME,
            },
            'all_collections': posts.collections,
            'all_posts_meta': posts.posts_meta,
        }
    }

"""=============================================================================
Main
============================================================================="""
app.jinja_env.filters['datetime'] = utils.format_datetime

if __name__ == '__main__':
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(debug=True, host='0.0.0.0', port='5001')
