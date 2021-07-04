# Python
import os
os.environ['TZ'] = 'UTC'
import logging

# External
from flask import Flask, make_response, jsonify, abort
from flask_cors import CORS

# App
from models import Repos

logger = logging.getLogger(__name__)
app = Flask(__name__)
cors = CORS(app, resources={r"*": {"origins": "*"}})

my_repos = Repos()

@app.route('/api/repos', methods=['GET'])
def get_repos():
    try:
        my_repos.fetch()
        response = my_repos.simple_dump()
        return make_response(jsonify(response))
    except Exception as e:
        logger.exception(e)
        abort(500)

@app.route('/api/repo/<string:repo_id>', methods=['GET'])
def get_repo_by_id(repo_id):
    try:
        has_repo = repo_id in my_repos.repos
        
        if not has_repo:
          my_repos.fetch()

        response = my_repos.repos[repo_id].full_dump()
        return make_response(jsonify(response))
    except Exception as e:
        logger.exception(e)
        abort(500)


"""=============================================================================
Main
============================================================================="""
if __name__ == '__main__':
  app.config['TEMPLATES_AUTO_RELOAD'] = True
  app.run(debug=True, host='0.0.0.0', port='5001')