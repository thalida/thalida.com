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
from markdown_posts import MarkdownPosts
from markdown_collections import MarkdownCollections

logger = logging.getLogger(__name__)
app = Flask(__name__)
posts = MarkdownPosts()

new_posts = MarkdownCollections()
pprint(new_posts)

COOKIE_NAMESPACE = 'TIA'
COOKIE_KEYS = {
    'WEATHER': 'weather',
    'LAST_VISIT': 'visit_timestamp',
    'NUM_VISITS': 'total_visits',
}

now = datetime.now()
cookie_update_date = dateparser.parse('2019-06-11T00:00:00')

global_tpl_vars = {
    'css_version': str(1),
    'js_version': str(1),
    'image_version': str(1),
    'current_year': now.strftime('%Y'),
}

@app.route('/')
def index():
    try:
        weather = get_current_weather(request)
        time_group = get_time_group(request)
        posts_meta = posts.visible_meta_by_date
        work = {
            'history': [
                {'company': 'Etsy', 'title': 'Senior Software Engineer', 'dates': [format_datetime('May 2017'), None], 'is_hiring': True},
                {'company': 'Kinnek', 'title': 'Senior Frontend Engineer', 'dates': [format_datetime('November 2015'), format_datetime('May 2017')]},
                {'company': 'OkCupid', 'title': 'Frontend Engineer', 'dates': [format_datetime('January 2014'), format_datetime('November 2015')]},
                {'company': 'Webs', 'title': 'Frontend Engineer Intern', 'dates': [format_datetime('January 2013'), format_datetime('January 2014')]},
                {'company': 'NASA Goddard/Space Operations Institute', 'title': 'Software Engineer Intern', 'dates': [format_datetime('March 2010'), format_datetime('January 2013')]},
            ],
            'years_since_start': 0,
        }
        first_job_startdate = dateparser.parse(work['history'][-1]['dates'][0])
        work['years_since_start'] = int(now.strftime('%Y')) - int(first_job_startdate.strftime('%Y'))

        response = make_response(render_template(
            'home.html', 
            **global_tpl_vars,
            weather=weather['current'], 
            time_group=time_group,
            posts=posts_meta, 
            work=work,

            newstuff={
                'collections': new_posts.collections,
                'posts_meta': new_posts.posts_meta,
                'collections_order': new_posts.collections_order,
            }
        ))
        update_cookies(request, response, visit=True, weather=weather)
        return response
    except KeyError:
        abort(404)
    except Exception:
        logger.exception('500 Error Fetching Index')
        abort(500)

@app.route('{posts_path}<path:path>'.format(posts_path=posts.POSTS_URL_DECORATOR))
def post(path):
    try:
        post = new_posts.get_post_by_url(request.path)
        collection = new_posts.collections[post['meta']['collection']]

        if post['meta']['is_external']:
            return redirect(post['meta']['external_url'])

        next_posts = new_posts.get_next_posts(post, amount=3)
        response = make_response(render_template(
            'post.html', 
            **global_tpl_vars,
            post=post,
            posts_meta=new_posts.posts_meta,
            next_posts=next_posts,
            collection=collection
        ))
        update_cookies(request, response, visit=True)
        return response
    except KeyError:
        abort(404)
    except Exception:
        logger.exception('500 Error Fetching Post')
        abort(500)

@app.errorhandler(404)
def not_found(exc):
    return redirect(url_for('index'))

def get_time_group(request):
    return {'greeting': "Hello", 'label': 'late-night'}

def get_current_weather(request):
    last_visit = request.cookies.get(format_cookie_key(COOKIE_KEYS['LAST_VISIT']), now.isoformat())
    last_visit_as_datetime = dateparser.parse(last_visit)
    force_update = (last_visit_as_datetime - cookie_update_date).total_seconds() < 0

    # Get current weather for location based on IP
    weather_cookie = request.cookies.get(format_cookie_key(COOKIE_KEYS['WEATHER']))
    if weather_cookie and not force_update:
        current_weather = json.loads(weather_cookie)
        from_cookie = True;
    else:
        newyork_latlng = [40.7081, -73.9571]
        ip = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)
        geo = geocoder.ip(ip)
        lat, lng = geo.latlng if len(geo.latlng) == 2 else newyork_latlng
        geo_forecast = forecast(secrets.FORECAST_KEY, lat, lng)
        current_weather = geo_forecast['currently']
        current_weather['units'] = geo_forecast['flags']['units']
        from_cookie = False

    return {'current': current_weather, 'from_cookie': from_cookie}




def format_datetime(value, format='iso'):
    if not isinstance(value, str):
        return value

    date = dateparser.parse(value)
    if format is 'iso':
        return date.isoformat()
    else:
        return date.strftime(format)

def format_cookie_key(name):
    return '{namespace}-{name}'.format(namespace=COOKIE_NAMESPACE, name=name)

def update_cookies(request, response, visit=True, weather=None):
    last_visit = request.cookies.get(format_cookie_key(COOKIE_KEYS['LAST_VISIT']), now.isoformat())
    last_visit_as_datetime = dateparser.parse(last_visit)
    
    # check if a force update of cookies is required
    force_update = (last_visit_as_datetime - cookie_update_date).total_seconds() < 0
    print('force_update',force_update)

    if weather is not None and (force_update or weather['from_cookie'] is False):
        response.set_cookie(format_cookie_key(COOKIE_KEYS['WEATHER']), json.dumps(weather['current']), max_age=60*15) # keep for 15min

    if force_update or visit:
        # Update cookie with this visit timestamp
        response.set_cookie(format_cookie_key(COOKIE_KEYS['LAST_VISIT']), str(now.isoformat()), max_age=120*24*60*60) # save for 120 days

        # Only increment visits if there's been at least 1min from the last visit
        # or if this is the first visit
        time_since_last_visit = (now - last_visit_as_datetime).total_seconds()
        num_visits = int(request.cookies.get(format_cookie_key(COOKIE_KEYS['NUM_VISITS']), 0))
        if time_since_last_visit > 60 or num_visits == 0:
            num_visits = num_visits + 1
            response.set_cookie(format_cookie_key(COOKIE_KEYS['NUM_VISITS']), str(num_visits), max_age=60*24*60*60) # save for 60 days


app.jinja_env.filters['datetime'] = format_datetime
if __name__ == '__main__':
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(debug=False, host='0.0.0.0')
