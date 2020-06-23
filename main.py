import os
import logging

os.environ["TZ"] = "UTC"
logger = logging.getLogger(__name__)

import requests
from flask import Flask, jsonify, request, abort, render_template, send_file, send_from_directory
from flask_cors import CORS
from jinja2 import TemplateNotFound

os.environ["TZ"] = "UTC"
app = Flask(__name__,
    template_folder='./views',
    static_folder='./views'
)
cors = CORS(app, resources={r"/*": {"origins": "*"}})

BAD_REQUEST = 400
SERVER_ERROR = 500


@app.route('/ping', methods=['GET'])
def ping_pong():
    return jsonify('pong!')

@app.route('/demo')
def render_demo():
    return render_template('demo/index.html')

@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def render_index(path):
    try:
        render_path = f'tsh/dist/{path}'
        mimetype = "text/html"
        load_from_directory = False
        path_exts = render_path.split('.')
        num_exts = len(path_exts) - 1

        if num_exts >= 1:
            if num_exts >= 2 and path_exts[-1] == 'map':
                ext = path_exts[-2]
            else:
                ext = path_exts[-1]

            if ext == "js":
                load_from_directory = True
                mimetype = "text/javascript"
            elif ext == "css":
                load_from_directory = True
                mimetype = "text/css"
            elif ext == "png":
                load_from_directory = True
                mimetype = "image/png"
            elif ext in ['ico', 'cur']:
                load_from_directory = True
                mimetype = "image/x-icon"
            elif ext in ['jpg', 'jpeg', 'jfif', 'pjpeg', 'pjp']:
                load_from_directory = True
                mimetype = "image/jpeg"

        if load_from_directory:
            return send_from_directory('./views', render_path, mimetype=mimetype)
        else:
            return render_template(render_path)
    except TemplateNotFound:
        return render_template('tsh/dist/index.html')
    except Exception:
        logger.exception('500 Error Fetching Index')
        abort(SERVER_ERROR)

# @app.route("/api/<version>/items", methods=["GET"])
# def api_get_items(version):
#     """GET all items for a given version of Minecraft Java Edition

#     Arguments:
#         version {string} -- Version of Minecraft Java Edition

#     Returns:
#         list -- all items
#     """
#     try:
#         items = cookbook.data.fetch_all_items(version, force_create=app.debug)
#         return jsonify(items)
#     except Exception as e:
#         logger.exception(e)
#         abort(SERVER_ERROR)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port="5000")
