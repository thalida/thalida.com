# Python
import os
os.environ['TZ'] = 'UTC'
import logging

# External
from dotenv import load_dotenv
import requests

load_dotenv()

class GithubApiError(Exception):
  pass

class GithubApi:
  def __init__(self):
    self.headers = {"Authorization": f"bearer {os.getenv('GITHUB_TOKEN')}"} 

    self.fetch_repos_cursor = None
    self.fetch_repos_query = """
      query ($after_cursor:String) {
        rateLimit {
          remaining
          used
        }
        repositoryOwner(login: "thalida") {
          repositories(ownerAffiliations: OWNER, isFork: false, isLocked: false, orderBy: {field: UPDATED_AT, direction: DESC}, first: 10, after:$after_cursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
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
            }
          }
        }
      }
    """

    self.fetch_commits_cursor = None
    self.fetch_commits_query = """
      query ($repo_name:String!, $after_cursor:String) {
        rateLimit {
          remaining
          used
        }
        repository(name: $repo_name, owner: "thalida") {
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 50, after:$after_cursor) {
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
    """
    

  def query_api(self, query, variables):
    json = {'query': query, 'variables': variables}
    request = requests.post('https://api.github.com/graphql', json=json, headers=self.headers)
    if request.status_code == 200:
        return request.json()
    else:
        raise GithubApiError("Query failed to run by returning code of {}.\nQuery: {}\nVariables: {}".format(request.status_code, query, variables))

  def fetch_repos(self):
    variables = {
        "after_cursor": self.fetch_repos_cursor
    }

    try:
      response = self.query_api(self.fetch_repos_query, variables)
      page_info = response["data"]["repositoryOwner"]["repositories"]["pageInfo"]
      
      if page_info["hasNextPage"]:
        self.fetch_repos_cursor = page_info["endCursor"]
      else:
        self.fetch_repos_cursor = None
      
      return response
    except Exception as e:
      raise

  def fetch_commits_by_repo(self, repo_name):
    variables = {
      "repo_name": repo_name,
      "after_cursor": self.fetch_commits_cursor,
    }

    try:
      response = self.query_api(self.fetch_commits_query, variables)
      page_info = response["data"]["repository"]["defaultBranchRef"]["target"]["history"]["pageInfo"]
      
      if page_info["hasNextPage"]:
        self.fetch_commits_cursor = page_info["endCursor"]
      else:
        self.fetch_commits_cursor = None
      
      return response
    except Exception as e:
      raise

api = GithubApi()