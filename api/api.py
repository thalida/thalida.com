# Python
import os
os.environ['TZ'] = 'UTC'
import logging

# External
from flask import Flask, make_response, jsonify, abort
from flask_cors import CORS
from dotenv import load_dotenv

# App
import helpers
from github import GithubApi
from models import Repos

load_dotenv()

logger = logging.getLogger(__name__)
app = Flask(__name__)
cors = CORS(app, resources={r"*": {"origins": "*"}})

gh_api = GithubApi(owner="thalida", token=os.getenv('GITHUB_TOKEN'), cache_ttl=helpers.DEFAULT_CACHE_SECS)
gh_api.add_query(
  query_name="repos",
  query="""
    query ($owner:String!, $after_cursor:String, $until:GitTimestamp) {
      rateLimit {
        remaining
        used
      }
      repositoryOwner(login: $owner) {
        repositories(ownerAffiliations: OWNER, isFork: false, isLocked: false, orderBy: {field: UPDATED_AT, direction: DESC}, first: 20, after:$after_cursor) {
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
          edges {
            node {
              id
              name
              updatedAt
              createdAt
              url
              description
              homepageUrl
              languages(first: 10) {
                nodes {
                  name
                  id
                  color
                }
              }
              defaultBranchRef {
                target {
                  ... on Commit {
                    history(until: $until) {
                      totalCount
                    }
                  }
                }
              }
              refs(refPrefix: "refs/heads/", first: 50) {
                totalCount
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  """,
  cache_path_format="./.github_cache/{query_name}-{next_page}.json", 
  page_info_key="data.repositoryOwner.repositories.pageInfo",
)

gh_api.add_query(
  query_name="commits",
  query="""
    query ($owner:String!, $repo_name:String!, $after_cursor:String) {
      rateLimit {
        remaining
        used
      }
      repository(name: $repo_name, owner: $owner) {
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100, after:$after_cursor) {
                pageInfo {
                  endCursor
                  hasNextPage
                }
                totalCount
                nodes {
                  id
                  oid
                  message
                  committedDate
                  changedFiles
                  deletions
                  additions
                  url
                }
              }
            }
          }
        }
      }
    }
  """,
  cache_path_format="./.github_cache/{repo_name}-{query_name}-{next_page}.json", 
  page_info_key="data.repository.defaultBranchRef.target.history.pageInfo",
)

my_repos = Repos(gh_api, cache_ttl=helpers.DEFAULT_CACHE_SECS)

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
#   app.config['TEMPLATES_AUTO_RELOAD'] = True
  app.run(debug=True, host='0.0.0.0', port='5001')