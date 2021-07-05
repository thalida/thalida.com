# Python
from collections import Counter
from copy import deepcopy
import time

# External
from dateutil.parser import parse
import nltk

# App
import github.errors
import github.helpers
from github.models.commit import Commit

class Repo:
    def __init__(self, source, api, cache_ttl=github.helpers.DEFAULT_INSIGHTS_CACHE_TTL):
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
        self.metadata["is_homepage_up"] = github.helpers.get_is_url_up(self.metadata.get("homepageUrl"))
        self.branches = [edge["node"]["name"] for edge in source["refs"]["edges"]]
        self.commits = {}
        self.insights = self.setup_insights()
        self.prev_commit = None
        self.fetch_commits()

    def setup_insights(self):
        num_languages = len(self.metadata.get("languages"))

        highlights = {
            "most_languages": { "count": num_languages },
            "most_commits": { "count": self.metadata.get("total_commits") },
            "fewest_commits": { "count": self.metadata.get("total_commits"), "comparison": "le" },
            "most_branches": { "count": self.metadata.get("total_branches") },
            "fewest_branches": { "count": self.metadata.get("total_branches"), "comparison": "le" },
        }

        aggregates = {
            "language_counts": Counter([lang["name"] for lang in self.metadata.get("languages")]),
            "total_commits": self.metadata.get("total_commits"),
            "total_branches": self.metadata.get("total_branches"),
        }

        frequencies = {
            "branch_names": nltk.FreqDist(self.branches),
        }

        averages = {
            "num_languages": num_languages,
            "commits": self.metadata.get("total_commits"),
            "branches": self.metadata.get("total_branches"),
        }

        return {
            "highlights": highlights,
            "aggregates": aggregates,
            "averages": averages,
            "frequencies": frequencies,
        }

    def fetch_commits(self):
        now = time.time()

        if self.last_fetched_at is not None and now < self.last_fetched_at + self.cache_ttl:
            return

        try:
            responses = self.api.fetch_all("commits", variables={"repo_name": self.metadata["name"]})
            self.last_fetched_at = time.time()
            
            page = 1
            for res in responses:
                new_commits = self.get_collection(res)
                self.commits.update(new_commits)
                page += 1

            insights = github.helpers.generate_insights(self.commits)
            github.helpers.deep_update(self.insights, insights)

        except github.errors.GithubApiError as e:
            raise

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
            "insights": deepcopy(self.insights),
            "branches": deepcopy(self.branches),
            "commits": { id: commit.simple_dump() for id, commit in self.commits.items() },
        }
        
        data["insights"]["frequencies"] = github.helpers.get_top_frequencies(data["insights"]["frequencies"])

        return data

