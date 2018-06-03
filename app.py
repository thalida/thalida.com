import os

from flask import Flask, render_template, Markup, redirect, url_for, abort
import markdown

app = Flask(__name__, template_folder="views")

POSTS_DIRS = 'posts'
MARKDOWN_EXTENSIONS = [
    'markdown.extensions.attr_list',
    'markdown.extensions.fenced_code',
    'markdown.extensions.smart_strong',
    'markdown.extensions.meta',
    'markdown.extensions.nl2br',
    'markdown.extensions.sane_lists',
    'markdown.extensions.smarty',
    'markdown.extensions.tables',
    'markdown.extensions.codehilite',
]

@app.route('/')
def index():
    html = "<div>hi</div>"
    return render_template('home/home.html', content=html)

@app.route('/x/<path:page>')
def post(page):
    file_path = '{dir}/{file}.md'.format(dir=POSTS_DIRS, file=page)

    try:
        with open(file_path, 'r') as f:
            file_contents = f.read()
            md = markdown.Markdown(extensions=MARKDOWN_EXTENSIONS)
            
            content = md.reset().convert(file_contents)
            meta = md.Meta
            return render_template('post/post.html', content=content, meta=meta)
    except FileNotFoundError:
        abort(404)
    except Exception:
        abort(500)

@app.errorhandler(404)
def not_found(exc):
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(debug=True, host='0.0.0.0')
