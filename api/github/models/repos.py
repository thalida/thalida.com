# Python
from copy import deepcopy
import datetime
import time

# App
import github.helpers
from github.models.repo import Repo

class Repos:
    def __init__(self, api, cache_ttl=github.helpers.DEFAULT_INSIGHTS_CACHE_TTL):
        self.api = api
        self.last_fetched_at = None
        self.cache_ttl = cache_ttl
        
        self.total_repos = 0
        self.collection = {}
        self.insights = {}

    def fetch(self):
        now = time.time()

        if self.last_fetched_at is not None and now < self.last_fetched_at + self.cache_ttl:
            return

        try:
            responses = self.api.fetch_all("repos", variables={"until": datetime.datetime.now().isoformat()})
            self.last_fetched_at = time.time()
            self.total_repos = responses[0]["data"]["repositoryOwner"]["repositories"]["totalCount"]
            
            for res in responses:
                new_repos = self.get_collection(res)
                self.collection.update(new_repos)

            insights = github.helpers.generate_insights(self.collection)
            github.helpers.deep_update(self.insights, insights)

        except Exception:
            raise

    def get_collection(self, response):
        raw_repos = [edge["node"] for edge in response["data"]["repositoryOwner"]["repositories"]["edges"]]
        collection = {}

        for repo in raw_repos:
            collection[repo["id"]] = Repo(source=repo, api=self.api, cache_ttl=self.cache_ttl)

        return collection
    
    def simple_dump(self):
        data = {
            "insights": deepcopy(self.insights),
            "total_repos": self.total_repos,
            "repos": { id: repo.simple_dump() for id, repo in self.collection.items() },
        }

        data["insights"]["frequencies"] = github.helpers.get_top_frequencies(data["insights"]["frequencies"])

        return data