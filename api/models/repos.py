# Python
from copy import deepcopy
import time
import numbers
import operator
import urllib.request

# External
from nltk import FreqDist

# App
import github
from .repo import Repo

class Repos:
    def __init__(self):
        self.last_fetched_at = None
        self.cache_ttl = 60 * 1000
        
        self.repos = {}
        self.highlights = {}
        self.aggregates = {}

    def fetch(self):
        now = time.time()
        if self.last_fetched_at is not None and now < self.last_fetched_at + self.cache_ttl:
            print("using cached repos data")
            return

        try:
            res = github.api.fetch_repos()
            self.parse_response(res)
            self.last_fetched_at = time.time()
            
            if github.api.fetch_repos_cursor:
                return self.fetch()
            
        except github.GithubApiError as e:
            print(e)

    def parse_response(self, response):
        repos = response["data"]["repositoryOwner"]["repositories"]["nodes"]
        for repo in repos:
            print(f"Processing Repo: {repo['name']}")

            repo_id = repo["id"]
            self.repos[repo_id] = Repo(source=repo)

            for key, highlight in self.repos[repo_id].highlights.items():
                found = key in self.highlights
                operator_fn = getattr(operator, highlight.get("comparison", "gt"))
                is_better = operator_fn(highlight["count"], self.highlights[key]["count"]) if found else False
                if not found or is_better:
                    self.highlights[key] = {
                        "repo_id": repo_id,
                        **highlight,
                    }

            for key, aggregate in self.repos[repo_id].aggregates.items():
                if key not in self.aggregates:
                    self.aggregates[key] = aggregate
                    continue

                self.aggregates[key] += aggregate

    
    def simple_dump(self):
        data = {
            "last_fetched_at": self.last_fetched_at,
            "cache_ttl": self.cache_ttl,
            "highlights": self.highlights,
            "aggregates": deepcopy(self.aggregates),
            "repos": { id: repo.simple_dump() for id, repo in self.repos.items() },
        }
        data["aggregates"]["word_freq"] = data["aggregates"]["word_freq"].most_common(50)

        return data