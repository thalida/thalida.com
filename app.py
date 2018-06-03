
from darksky import forecast
from flask import Flask, request, make_response, render_template, redirect, url_for, abort
from markdown_posts import Markdown_Posts
from secrets import Secrets
import geocoder
import json
import logging

logger = logging.getLogger(__name__)
app = Flask(__name__)
posts = Markdown_Posts()

NEWYORK = [40.7081, -73.9571]
COOKIE_NAMESPACE = 'TIA'
WEATHER_COOKIE_KEY = 'weather'
VISITS_COOKIE_KEY = 'visits'

@app.route('/')
def index():
    weather_cookie = request.cookies.get(format_cookie_key(WEATHER_COOKIE_KEY))
    if weather_cookie:
        currently = json.loads(weather_cookie)
        update_weather_cookie = False;
    else:
        currently = get_forecast(request)['currently']
        update_weather_cookie = True

    response = make_response(render_template('home.html', posts_meta=posts.get_all_meta(), weather=currently))

    if update_weather_cookie:
        response.set_cookie(format_cookie_key(WEATHER_COOKIE_KEY), json.dumps(currently), max_age=60*15) # keep for 15min
    
    increment_visits_cookie(request, response)
    return response

@app.route('/x/<path:page>')
def post(page):
    try:
        post = posts.find_by_name(page)

        if not post['meta'].get('is_visible'):
            raise FileNotFoundError 

        response = make_response(render_template('post.html', post=post))
        
        increment_visits_cookie(request, response)
        return response
    except FileNotFoundError:
        abort(404)
    except Exception:
        logger.exception('500 Error Fetch Post')
        abort(500)

@app.errorhandler(404)
def not_found(exc):
    return redirect(url_for('index'))


def get_forecast(request):
    ip = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)
    geo = geocoder.ip(ip)
    lat, lon = geo.latlng if len(geo.latlng) == 2 else NEWYORK
    return forecast(Secrets.FORECAST_KEY, lat, lon)

def format_cookie_key(name):
    return '{namespace}-{name}'.format(namespace=COOKIE_NAMESPACE, name=name)

def increment_visits_cookie(req, res):
    visits_cookie = req.cookies.get(format_cookie_key(VISITS_COOKIE_KEY))
    visits = int(visits_cookie) + 1 if visits_cookie else 1
    res.set_cookie(format_cookie_key(VISITS_COOKIE_KEY), str(visits), max_age=60*24*60*60) # save for 60 days


if __name__ == '__main__':
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(debug=False, host='0.0.0.0')
