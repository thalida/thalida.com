# Builtins
import logging
import json
from datetime import datetime
from pprint import pprint

# Third Party
from flask import Flask, request, make_response, render_template, jsonify, redirect, url_for, abort
import dateparser

# Locals
from posts_collection import PostCollection
from window import Window

CSS_VERSION = 6;
JS_VERSION = 5; 

COOKIE_NAMESPACE = 'TIA'
COOKIE_KEYS = {
    'WEATHER': 'weather',
    'LAST_VISIT': 'visit_timestamp',
    'NUM_VISITS': 'total_visits',
}


logger = logging.getLogger(__name__)
app = Flask(__name__)
demo_posts = PostCollection(
    posts_dir='./demo_posts_collection/',
    url_decorator='/demo/x/'
)
my_posts = PostCollection()
my_window = Window()

now = datetime.now()
cookie_update_date = dateparser.parse('2019-06-24T00:00:00')

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
        force_update = get_force_update(request)
        weather_cookie = request.cookies.get(format_cookie_key(COOKIE_KEYS['WEATHER']))
        
        # Gather the data needed to render the page
        window = my_window.get_state(request, force_update, weather_cookie)
        work = get_work()
        collections_order = my_posts.collections_order

        response = make_response(render_template(
            'home.html', 
            **get_globals(my_posts),
            window=window, 
            collections_order=collections_order, 
            work=work,
        ))

        set_cookies(request, response, weather=window['weather'])
        
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

        set_cookies(request, response)

        return response
    except (ValueError, KeyError):
        abort(404)
    except Exception:
        logger.exception('500 Error Fetching Post')
        abort(500)


@app.route('/api/window-data', methods=['GET'])
def get_window_data():
    try:
        force_update = get_force_update(request)
        weather_cookie = request.cookies.get(format_cookie_key(COOKIE_KEYS['WEATHER']))
        
        # Gather the data needed to render the page
        window = my_window.get_state(request, force_update, weather_cookie)
        window_outside_html = render_template('api/window-outside.html', window=window)
        window_label_html = render_template('api/window-label-text.html', window=window)
        response = make_response(jsonify({
            'window_outside_html': window_outside_html,
            'window_label_html': window_label_html,
        }))

        set_cookies(request, response, weather=window['weather'])
        
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
        force_update = get_force_update(request)
        weather_cookie = request.cookies.get(format_cookie_key(COOKIE_KEYS['WEATHER']))
        range_24hr = my_window.get_range_over_day(request, force_update, weather_cookie)

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
        force_update = get_force_update(request)
        weather_cookie = request.cookies.get(format_cookie_key(COOKIE_KEYS['WEATHER']))
        
        # Gather the data needed to render the page
        window = my_window.get_state(request, force_update, weather_cookie)
        work = get_work()
        collections_order = demo_posts.collections_order

        response = make_response(render_template(
            'home.html', 
            **get_globals(demo_posts),
            time_debugging=time_debugging,
            range_24hr=range_24hr if time_debugging else None,
            window=window, 
            collections_order=collections_order, 
            work=work,
        ))

        set_cookies(request, response, weather=window['weather'])
        
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

        set_cookies(request, response)

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


"""=============================================================================
Getters
============================================================================="""

def get_globals(posts):
    """Global View Data
    
    Global data for all view templates

    Returns:
        [dict] -- Dict of globally accessible data
    """
    return {
        'globals': {
            'css_version': str(CSS_VERSION),
            'js_version': str(JS_VERSION),
            'image_version': str(1),
            'datetime': {
                'now': now,
                'current_year': now.strftime('%Y'),
            },
            'all_collections': posts.collections,
            'all_posts_meta': posts.posts_meta,
        }
    }

def get_work():
    """Work History
    
    Work history (start and end dates, job title, and employer) as well as stats
    about my employment history
    
    Returns:
        [dict] -- Work history and stats
    """

    work_history = [
        {
            'company': 'Etsy',
            'title': 'Senior Software Engineer',
            'dates': [format_datetime('May 2017'), None],
            'is_hiring': True
        },
        {
            'company': 'Kinnek',
            'title': 'Senior Frontend Engineer',
            'dates': [format_datetime('November 2015'), format_datetime('May 2017')]
        },
        {
            'company': 'OkCupid',
            'title': 'Frontend Engineer',
            'dates': [format_datetime('January 2014'), format_datetime('November 2015')]
        },
        {
            'company': 'Webs',
            'title': 'Frontend Engineer Intern',
            'dates': [format_datetime('January 2013'), format_datetime('January 2014')]
        },
        {
            'company': 'NASA&nbsp;Goddard&nbsp;/ Space&nbsp;Operations&nbsp;Institute',
            'title': 'Software Engineer Intern',
            'dates': [format_datetime('March 2010'), format_datetime('January 2013')]
        },
    ]
    
    first_job_startdate = dateparser.parse(work_history[-1]['dates'][0])
    years_since_start = int(now.strftime('%Y')) - int(first_job_startdate.strftime('%Y'))
    
    return {
        'history': work_history,
        'years_since_start': years_since_start,
    }

def get_force_update(request):
    """Get If We Should Force an Update
    
    Check when I last updated the cookies and if the visitor hasn't been to the
    site since then force an update
    
    Arguments:
        request -- A Flast Request
    
    Returns:
        [bool] -- Boolean on if we should force a site/cookie update
    """
    last_visit = request.cookies.get(format_cookie_key(COOKIE_KEYS['LAST_VISIT']), now.isoformat())
    last_visit_as_datetime = dateparser.parse(last_visit)
    force_update = (cookie_update_date - last_visit_as_datetime).total_seconds() > 0

    return force_update


"""=============================================================================
Formatters
============================================================================="""

def format_datetime(str, format='iso'):
    """Convert String into the Given Datetime Format
    
    Given a string convert it into the provided format, if no format is given
    lets use ISO!
    
    Arguments:
        str {string} -- A string representation of a date
    
    Keyword Arguments:
        format {str} -- Datetime format to convert the string into  (default: {'iso'})
    
    Returns:
        [string] -- The newly formatted datetime string
    """

    try:
        date = dateparser.parse(str)
        if format is 'iso':
            return date.isoformat()
        elif format is 'post':
            return date.strftime('%d %B %Y')
        else:
            return date.strftime(format)
    except TypeError:
        return str

def format_cookie_key(name):
    """Format a Name into the Cookie Format
    
    Add the proper namspacing to my cookies to differentiate them
    
    Arguments:
        name {string} -- Any string name for a cookie
    """
    return '{namespace}-{name}'.format(namespace=COOKIE_NAMESPACE, name=name)


"""=============================================================================
Setters
============================================================================="""

def set_cookies(request, response, weather=None, visit=True):
    """Set/Update Cookie Values
    
    Given the data provided update my site cookies with visitor data
    
    Arguments:
        request -- A Flask Request
        response -- A Flast Response
    
    Keyword Arguments:
        weather {dict} -- Current weater data dictionary (default: {None})
        visit {bool} -- Does this call to set cookies count as a site visit? (default: {True})
    """

    # check if a force update of cookies is required
    force_update = get_force_update(request)

    # Set the weather cookie if we have weather data and we're forced to or the
    # weather wasn't fetched from a cookie already
    if weather is not None and (force_update or weather['from_cookie'] is False):
        response.set_cookie(
            format_cookie_key(COOKIE_KEYS['WEATHER']), 
            json.dumps(weather['current']), 
            max_age=60*15  # keep for 15min - the weather will update every 15min
        )

    if force_update or visit:
        # Get the time the guest last visited
        last_visit = request.cookies.get(format_cookie_key(COOKIE_KEYS['LAST_VISIT']), now.isoformat())
        last_visit_as_datetime = dateparser.parse(last_visit)

        # Only increment visits if there's been at least 1min from the last visit
        # or if this is the first visit
        time_since_last_visit = (now - last_visit_as_datetime).total_seconds()
        num_visits = int(request.cookies.get(format_cookie_key(COOKIE_KEYS['NUM_VISITS']), 0))
        if time_since_last_visit > 60 or num_visits == 0:
            num_visits = num_visits + 1
            response.set_cookie(
                format_cookie_key(COOKIE_KEYS['NUM_VISITS']), 
                str(num_visits), 
                max_age=60*24*60*60 # save for 60 days
            )

        # Update last visit cookie with current datetime
        response.set_cookie(
            format_cookie_key(COOKIE_KEYS['LAST_VISIT']), 
            str(now.isoformat()), 
            max_age=120*24*60*60 # save for 120 days
        )


"""=============================================================================
Main
============================================================================="""
app.jinja_env.filters['datetime'] = format_datetime

if __name__ == '__main__':
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(debug=True, host='0.0.0.0')
