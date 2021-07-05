# Python
from collections import defaultdict, Counter
from copy import deepcopy
from datetime import datetime
import numbers
import operator

# External
from dateutil.parser import parse
import nltk
import requests

# App
from github import GithubApiError
import helpers
from .commit import Commit

class Repo:
    def __init__(self, source, api):
        self.api = api
        self.id = source["id"],
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
        try:
            res, page_info = self.api.fetch_next_page("commits", variables={"repo_name": self.metadata["name"]})
            print(f'Processing Commits - Page {page_info["curr_page"]}')
            
            self.parse_response(res)
            
            if page_info["hasNextPage"]:
                self.fetch_commits()
        
        except GithubApiError as e:
            print(e)

    def parse_response(self, response):
        commits = response["data"]["repository"]["defaultBranchRef"]["target"]["history"]["nodes"]
        for commit in commits:
            commit_id = commit["id"]

            self.commits[commit_id] = Commit(source=commit, prev_commit=self.prev_commit)

            for key, highlight in self.commits[commit_id].highlights.items():
                if highlight.get("count") is None:
                    continue

                key_exists = key in self.highlights
                operator_fn = getattr(operator, highlight.get("comparison", "ge"))
                is_new_highlight = operator_fn(highlight["count"], self.highlights[key]["count"]) if key_exists else False

                if key_exists and not is_new_highlight:
                    continue
                
                if key_exists and highlight["count"] == self.highlights[key]["count"]:
                    highlight_commits = self.highlights[key]["commits"]
                else:
                    highlight_commits = list()
                
                highlight_commits.append(commit_id)

                self.highlights[key] = {
                    "count": highlight.get("count"),
                    "comparison": highlight.get("comparison", "ge"),
                    "commits": highlight_commits,
                }

            for key, aggregate in self.commits[commit_id].aggregates.items():
                if key not in self.aggregates:
                    self.aggregates[key] = aggregate
                    continue

                self.aggregates[key] += aggregate

            for key, average in self.commits[commit_id].averages.items():
                if key not in self.averages:
                    self.averages[key] = average
                    continue

                self.averages[key] = (self.averages[key] + average) / 2
            
            self.prev_commit = self.commits[commit_id]


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

