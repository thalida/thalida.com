# Python
from copy import deepcopy
import time
import numbers
import operator
import urllib.request

# External
from nltk import FreqDist

# App
from github import GithubApiError
import helpers
from .repo import Repo

class Repos:
    def __init__(self, api):
        self.api = api
        self.last_fetched_at = None
        self.cache_ttl = helpers.DEFAULT_API_CACHE
        
        self.total_repos = 0
        self.repos = {}
        self.highlights = {}
        self.aggregates = {}
        self.averages = {}

    def fetch(self):
        now = time.time()

        if self.last_fetched_at is not None and now < self.last_fetched_at + self.cache_ttl:
            print("using cached repos data")
            return

        try:
            res, page_info = self.api.fetch_next_page("repos")
            self.parse_response(res)
            
            if page_info["hasNextPage"]:
                self.fetch()
            else:
                self.last_fetched_at = time.time()

        except GithubApiError as e:
            print(e)

    def parse_response(self, response):
        self.total_repos = response["data"]["repositoryOwner"]["repositories"]["totalCount"]
        repos = [edge["node"] for edge in response["data"]["repositoryOwner"]["repositories"]["edges"]]

        for repo in repos:
            print(f"Processing Repo: {repo['name']}")

            repo_id = repo["id"]
            self.repos[repo_id] = Repo(api=self.api, source=repo)

            for key, highlight in self.repos[repo_id].highlights.items():
                key_exists = key in self.highlights
                operator_fn = getattr(operator, highlight.get("comparison", "ge"))
                is_new_highlight = operator_fn(highlight["count"], self.highlights[key]["count"]) if key_exists else False
                
                if key_exists and not is_new_highlight:
                    continue
                
                if key_exists and highlight["count"] == self.highlights[key]["count"]:
                    highlight_repos = self.highlights[key]["repos"]
                else:
                    highlight_repos = list()
                
                highlight_repos.append(repo_id)
                
                self.highlights[key] = {
                    "count": highlight.get("count"),
                    "comparison": highlight.get("comparison", "ge"),
                    "repos": highlight_repos,
                }

            for key, aggregate in self.repos[repo_id].aggregates.items():
                if key not in self.aggregates:
                    self.aggregates[key] = aggregate
                    continue

                self.aggregates[key] += aggregate

            for key, average in self.repos[repo_id].averages.items():
                if key not in self.averages:
                    self.averages[key] = average
                    continue

                self.averages[key] = (self.averages[key] + average) / 2

    
    def simple_dump(self):
        data = {
            "last_fetched_at": self.last_fetched_at,
            "cache_ttl": self.cache_ttl,
            "highlights": self.highlights,
            "aggregates": deepcopy(self.aggregates),
            "averages": deepcopy(self.averages),
            "total_repos": self.total_repos,
            "repos": { id: repo.simple_dump() for id, repo in self.repos.items() },
        }

        data["aggregates"]["branch_freq"] = data["aggregates"]["branch_freq"].most_common(5)
        data["aggregates"]["word_freq"] = data["aggregates"]["word_freq"].most_common(50)

        return data