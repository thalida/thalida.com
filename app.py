import logging
from flask import Flask, request, render_template, redirect, url_for, abort
from markdown_posts import Markdown_Posts
from weather import Weather

logger = logging.getLogger(__name__)
app = Flask(__name__, template_folder="views")
md_posts = Markdown_Posts()

@app.route('/')
def index():
    forecast = Weather(request).get_forecast()
    posts = md_posts.fetch_all_meta()
    return render_template('home/home.html', posts=posts, weather=forecast['currently'])

@app.route('/x/<path:page>')
def post(page):
    try:
        content, meta = md_posts.fetch_by_name(page)

        if not meta.get('is_visible'):
            raise FileNotFoundError 

        return render_template('post/post.html', content=content, meta=meta)
    except FileNotFoundError:
        abort(404)
    except Exception:
        logger.exception('500 Error Fetch Post')
        abort(500)

@app.errorhandler(404)
def not_found(exc):
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(debug=False, host='0.0.0.0')
