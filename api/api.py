# Python
import os
os.environ['TZ'] = 'UTC'
import logging

# External
from flask import Flask, make_response, jsonify, abort
from flask_cors import CORS
from dotenv import load_dotenv

# App
from github import Github

load_dotenv()

logger = logging.getLogger(__name__)
app = Flask(__name__)
cors = CORS(app, resources={r"*": {"origins": "*"}})

gh = Github(owner="thalida", token=os.getenv('GITHUB_TOKEN'))
gh.repos.fetch()

@app.route('/api/repos', methods=['GET'])
def get_repos():
    try:
        gh.repos.fetch()
        response = gh.repos.simple_dump()
        return make_response(jsonify(response))
    except Exception as e:
        logger.exception(e)
        abort(500)

@app.route('/api/repo/<string:repo_id>', methods=['GET'])
def get_repo_by_id(repo_id):
    try:
        if len(gh.repos.collection.keys()) == 0:
          gh.repos.fetch()
        
        repo = gh.repos.collection.get(repo_id)
        response = repo.full_dump()
        return make_response(jsonify(response))
    except Exception as e:
        logger.exception(e)
        abort(500)


"""=============================================================================
Main
============================================================================="""
if __name__ == '__main__':
#   app.config['TEMPLATES_AUTO_RELOAD'] = True
  app.run(debug=True, host='0.0.0.0', port='5001')