# Python
from collections import defaultdict, Counter
from copy import deepcopy
from datetime import datetime
import numbers
import operator

# External
from dateutil.parser import parse
from nltk import FreqDist
import requests

# App
import helpers
import github
from .commit import Commit

class Repo:
    def __init__(self, source):
        self.id = source["id"],
        self.metadata = {
            "name": source["name"],
            "created_at": parse(source["createdAt"]),
            "updated_at": parse(source["updatedAt"]),
            "url": source["url"],
            "description": source["description"],
            "homepageUrl": source["homepageUrl"],
            "languages": [lang for lang in source["languages"]["nodes"]],
        }
        self.metadata["is_homepage_up"] = helpers.get_is_url_up(self.metadata.get("homepageUrl"))

        self.commits = {}
        self.highlights = {
            "most_languages": { "count": len(self.metadata.get("languages")) },
        }
        self.aggregates = {
            "language_counts": Counter([lang["name"] for lang in self.metadata.get("languages")]),
        }

        self.fetch_commits()

    def fetch_commits(self, page=1):
        if page == 1:
            self.prev_commit = None

        try:
            res = github.api.fetch_commits_by_repo(self.metadata["name"])
            self.parse_response(res, page=page)
            
            if github.api.fetch_commits_cursor:
                self.fetch_commits(page=page+1)
        except github.GithubApiError as e:
            print(e)

    def parse_response(self, response, page=1):
        print(f'Processing Commits - Page {page}')

        commits = response["data"]["repository"]["defaultBranchRef"]["target"]["history"]["nodes"]
        for commit in commits:
            commit_id = commit["id"]

            self.commits[commit_id] = Commit(source=commit, prev_commit=self.prev_commit)

            for key, highlight in self.commits[commit_id].highlights.items():
                found = key in self.highlights
                has_count = highlight.get("count") is not None
                operator_fn = getattr(operator, highlight.get("comparison", "gt"))
                is_better = operator_fn(highlight["count"], self.highlights[key]["count"]) if found and has_count else False
                if (not found and has_count) or (is_better):
                    self.highlights[key] = {
                        "commit_id": commit_id,
                        "commit_oid": self.commits[commit_id].metadata['oid'],
                        **highlight
                    }

            for key, aggregate in self.commits[commit_id].aggregates.items():
                if key not in self.aggregates:
                    self.aggregates[key] = aggregate
                    continue

                self.aggregates[key] += aggregate
            
            self.prev_commit = self.commits[commit_id]


    def simple_dump(self):
        data = {
            "id": self.id,
            "metadata": deepcopy(self.metadata),
            "highlights": deepcopy(self.highlights),
            "aggregates": deepcopy(self.aggregates),
        }

        data["aggregates"]["word_freq"] = data["aggregates"]["word_freq"].most_common(50)

        return data

