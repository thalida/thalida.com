# Builtins
import logging
import json
from datetime import datetime

# Third Party
from flask import Flask, request, make_response, render_template, redirect, url_for, abort
from darksky import forecast
import dateparser
import geocoder

# Locals
import secrets
from markdown_posts import MarkdownPosts

logger = logging.getLogger(__name__)
app = Flask(__name__)
posts = MarkdownPosts()

NEWYORK = [40.7081, -73.9571]
COOKIE_NAMESPACE = 'TIA'
COOKIE_KEYS = {
    'WEATHER': 'weather',
    'LAST_VISIT': 'visit_timestamp',
    'NUM_VISITS': 'total_visits',
}

@app.route('/')
def index():
    try:
        currently, from_cookie = get_current_weather(request)
        posts_meta = posts.visible_meta_by_date
        work_history = [
            {'company': 'Etsy', 'title': 'Senior Software Engineer', 'dates': [format_date('May 2017'), None]},
            {'company': 'Kinnek', 'title': 'Senior Frontend Engineer', 'dates': [format_date('November 2015'), format_date('May 2017')]},
            {'company': 'OkCupid', 'title': 'Frontend Engineer', 'dates': [format_date('January 2014'), format_date('November 2015')]},
            {'company': 'Webs', 'title': 'Frontend Engineer Intern', 'dates': [format_date('January 2013'), format_date('January 2014')]},
            {'company': 'NASA Goddard/Space Operations Institute', 'title': 'Software Engineer Intern', 'dates': [format_date('March 2010'), format_date('January 2013')]},
        ]
        response = make_response(render_template(
            'home.html', 
            posts_meta=posts_meta, 
            weather=currently, 
            work_history=work_history
        ))
        update_cookies(request, response, visit=True, weather=currently if not from_cookie else None)
        return response
    except KeyError:
        abort(404)
    except Exception:
        logger.exception('500 Error Fetching Index')
        abort(500)

@app.route('{posts_path}<path:path>'.format(posts_path=posts.POSTS_URL_DECORATOR))
def post(path):
    try:
        post = posts.get_post_by_url(request.path)
        response = make_response(render_template('post.html', post=post))
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

def format_date(date):
    return dateparser.parse(date).isoformat()

def get_current_weather(request):
    # Get current weather for location based on IP
    weather_cookie = request.cookies.get(format_cookie_key(COOKIE_KEYS['WEATHER']))
    if weather_cookie:
        current_weather = json.loads(weather_cookie)
        from_cookie = True;
    else:
        ip = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)
        geo = geocoder.ip(ip)
        lat, lon = geo.latlng if len(geo.latlng) == 2 else NEWYORK
        geo_forecast = forecast(secrets.FORECAST_KEY, lat, lon)
        current_weather = geo_forecast['currently']
        from_cookie = False

    return current_weather, from_cookie

def format_cookie_key(name):
    return '{namespace}-{name}'.format(namespace=COOKIE_NAMESPACE, name=name)

def update_cookies(req, res, visit=True, weather=None):
    if weather is not None:
        res.set_cookie(format_cookie_key(COOKIE_KEYS['WEATHER']), json.dumps(weather), max_age=60*15) # keep for 15min

    if visit:
        now = datetime.now()
        last_visit = request.cookies.get(format_cookie_key(COOKIE_KEYS['LAST_VISIT']), now.isoformat())
        last_visit_as_datetime = dateparser.parse(last_visit)
        time_since_last_visit = (now - last_visit_as_datetime).total_seconds()
        num_visits = int(req.cookies.get(format_cookie_key(COOKIE_KEYS['NUM_VISITS']), 0))

        # Only increment visits if there's been at least 1min from the last visit
        if time_since_last_visit > 60 or num_visits == 0:
            num_visits = num_visits + 1
            res.set_cookie(format_cookie_key(COOKIE_KEYS['NUM_VISITS']), str(num_visits), max_age=60*24*60*60) # save for 60 days
        
        res.set_cookie(format_cookie_key(COOKIE_KEYS['LAST_VISIT']), str(now.isoformat()), max_age=120*24*60*60) # save for 120 days

if __name__ == '__main__':
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(debug=False, host='0.0.0.0')
