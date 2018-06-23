# Builtins
import logging
import json
from datetime import datetime
from pprint import pprint

# Third Party
from flask import Flask, request, make_response, render_template, redirect, url_for, abort
from darksky import forecast
import dateparser
import geocoder

# Locals
import secrets
from posts_collection import PostCollection


COOKIE_NAMESPACE = 'TIA'
COOKIE_KEYS = {
    'WEATHER': 'weather',
    'LAST_VISIT': 'visit_timestamp',
    'NUM_VISITS': 'total_visits',
}


logger = logging.getLogger(__name__)
app = Flask(__name__)
my_posts = PostCollection()

now = datetime.now()
cookie_update_date = dateparser.parse('2017-06-24T00:00:00')


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
        # Gather the data needed to render the page
        weather = get_current_weather(request)
        dynamic_time_data = get_dynamic_time_data(request)
        work = get_work()
        collections_order = my_posts.collections_order

        response = make_response(render_template(
            'home.html', 
            **get_globals(),
            weather=weather['current'], 
            time_group=time_group,
            collections_order=collections_order, 
            work=work,
        ))

        set_cookies(request, response, weather=weather)
        
        return response
    except Exception:
        logger.exception('500 Error Fetching Index')
        abort(500)


@app.route('{posts_path}<path:path>'.format(posts_path=my_posts.POSTS_URL_DECORATOR))
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
        next_posts = my_posts.get_next_posts(post, amount=3)

        # Build the repsonse object for a post
        response = make_response(render_template(
            'post.html', 
            **get_globals(),
            post=post,
            next_posts=next_posts,
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

def get_globals():
    """Global View Data
    
    Global data for all view templates

    Returns:
        [dict] -- Dict of globally accessible data
    """
    return {
        'globals': {
            'css_version': str(1),
            'js_version': str(1),
            'image_version': str(1),
            'datetime': {
                'now': now,
                'current_year': now.strftime('%Y'),
            },
            'all_collections': my_posts.collections,
            'all_posts_meta': my_posts.posts_meta,
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
            'company': 'NASA Goddard/Space Operations Institute',
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

def get_dynamic_time_data(request):
    """Dynamic Information Based on Current Time
    
    Get current greetings, activies, colors, etc based on the current time
    
    Arguments:
        request -- A Flosk Request
    """
    return {'greeting': "Hello", 'label': 'late-night'}

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

def get_current_weather(request):
    """Get Current Weather Based on IP Address
    
    Based on the current ip location, getthe current weather (or use NY if location 
    is not available.) Save that data to a cookie to reduce # of api calls.
    
    Arguments:
        request -- A Flast Request
    """
    force_update = get_force_update(request)

    # Get current weather for location based on IP
    weather_cookie = request.cookies.get(format_cookie_key(COOKIE_KEYS['WEATHER']))
    if weather_cookie and not force_update:
        from_cookie = True;
        current_weather = json.loads(weather_cookie)
    else:
        from_cookie = False

        # fallback latitute/longitude data
        newyork_latlng = [40.7081, -73.9571]

        # Get the visitors IP and lat/lng for that IP
        ip = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)
        geo = geocoder.ip(ip)
        lat, lng = geo.latlng if len(geo.latlng) == 2 else newyork_latlng

        # Use Darksky to get the current forcast for that lat/lng
        geo_forecast = forecast(secrets.FORECAST_KEY, lat, lng)

        # Get and format the current weather
        current_weather = geo_forecast['currently']
        current_weather['units'] = geo_forecast['flags']['units'] # F or C

    return {'current': current_weather, 'from_cookie': from_cookie}


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

    date = dateparser.parse(str)
    if format is 'iso':
        return date.isoformat()
    else:
        return date.strftime(format)

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
    app.run(debug=False, host='0.0.0.0')
