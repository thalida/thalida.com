# Python
from collections import Counter
from copy import deepcopy
import time

# External
from dateutil.parser import parse
import nltk

# App
from github import GithubApiError
import helpers
from .commit import Commit

class Repo:
    def __init__(self, source, api, cache_ttl=0):
        self.api = api
        self.last_fetched_at = None
        self.cache_ttl = cache_ttl

        self.id = source["id"]
        self.metadata = {
            "name": source["name"],
            "created_at": parse(source["createdAt"]),
            "updated_at": parse(source["updatedAt"]),
            "url": source["url"],
            "description": source["description"],
            "homepageUrl": source["homepageUrl"],
            "languages": [lang for lang in source["languages"]["nodes"]],
            "total_commits": source["defaultBranchRef"]["target"]["history"]["totalCount"],
            "total_branches": source["refs"]["totalCount"],
        }
        self.metadata["is_homepage_up"] = helpers.get_is_url_up(self.metadata.get("homepageUrl"))

        self.branches = [edge["node"]["name"] for edge in source["refs"]["edges"]]
        self.commits = {}

        num_languages = len(self.metadata.get("languages"))
        self.highlights = {
            "most_languages": { "count": num_languages },
            "most_commits": { "count": self.metadata.get("total_commits") },
            "fewest_commits": { "count": self.metadata.get("total_commits"), "comparison": "le" },
            "most_branches": { "count": self.metadata.get("total_branches") },
            "fewest_branches": { "count": self.metadata.get("total_branches"), "comparison": "le" },
        }
        self.aggregates = {
            "language_counts": Counter([lang["name"] for lang in self.metadata.get("languages")]),
            "total_commits": self.metadata.get("total_commits"),
            "total_branches": self.metadata.get("total_branches"),
            "branch_freq": nltk.FreqDist(self.branches),
        }
        self.averages = {
            "num_languages": num_languages,
            "commits": self.metadata.get("total_commits"),
            "branches": self.metadata.get("total_branches"),
        }
        
        self.prev_commit = None
        self.fetch_commits()

    def fetch_commits(self):
        now = time.time()

        if self.last_fetched_at is not None and now < self.last_fetched_at + self.cache_ttl:
            print("using cached data")
            return

        try:
            responses = self.api.fetch_all("commits", variables={"repo_name": self.metadata["name"]})
            self.last_fetched_at = time.time()
            
            page = 1
            for res in responses:
                print(f"Processing Commit Page: {page}")
                new_commits = self.get_collection(res)
                self.commits.update(new_commits)
                page += 1

            self.highlights = helpers.get_highlights(self.commits, self.highlights)
            self.aggregates = helpers.get_aggregates(self.commits, self.aggregates)
            self.averages = helpers.get_averages(self.commits, self.averages)

        except GithubApiError as e:
            print(e)

    def get_collection(self, response):
        raw_commits = response["data"]["repository"]["defaultBranchRef"]["target"]["history"]["nodes"]
        collection = {}
        
        for commit in raw_commits:
            commit_id = commit["id"]

            collection[commit_id] = Commit(source=commit, prev_commit=self.prev_commit)
            self.prev_commit = collection[commit_id]
        
        return collection

    def simple_dump(self):
        data = {
            "id": self.id,
            "metadata": deepcopy(self.metadata),
        }

        return data

    def full_dump(self):
        data = {
            "id": self.id,
            "metadata": deepcopy(self.metadata),
            "highlights": deepcopy(self.highlights),
            "aggregates": deepcopy(self.aggregates),
            "averages": deepcopy(self.averages),
            "branches": deepcopy(self.branches),
            "commits": { id: commit.simple_dump() for id, commit in self.commits.items() },
        }

        data["aggregates"]["branch_freq"] = data["aggregates"]["branch_freq"].most_common(5)
        data["aggregates"]["word_freq"] = data["aggregates"]["word_freq"].most_common(100)

        return data

