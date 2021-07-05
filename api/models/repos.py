# Python
from copy import deepcopy
import time

# App
from github import GithubApiError
import helpers
from .repo import Repo

class Repos:
    def __init__(self, api, cache_ttl=0):
        self.api = api
        self.last_fetched_at = None
        self.cache_ttl = cache_ttl
        
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
            responses = self.api.fetch_all("repos")
            self.last_fetched_at = time.time()
            self.total_repos = responses[0]["data"]["repositoryOwner"]["repositories"]["totalCount"]
            
            for res in responses:
                new_repos = self.get_collection(res)
                self.repos.update(new_repos)

            self.highlights = helpers.get_highlights(self.repos, self.highlights)
            self.aggregates = helpers.get_aggregates(self.repos, self.aggregates)
            self.averages = helpers.get_averages(self.repos, self.averages)

        except GithubApiError as e:
            print(e)

    def get_collection(self, response):
        raw_repos = [edge["node"] for edge in response["data"]["repositoryOwner"]["repositories"]["edges"]]
        collection = {}

        for repo in raw_repos:
            print(f"Processing Repo: {repo['name']}")
            collection[repo["id"]] = Repo(source=repo, api=self.api, cache_ttl=self.cache_ttl)

        return collection
    
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