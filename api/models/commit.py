# Python
from collections import defaultdict, Counter
from copy import deepcopy
from datetime import datetime
import operator

# External
from dateutil.parser import parse
import nltk

# App
import helpers

class Commit:
    def __init__(self, source, prev_commit=None):
        self.id = source["id"]
        self.metadata = {
            "oid": source["oid"],
            "message": source["message"],
            "commited_on": parse(source["committedDate"]),
            "changed_files": source["changedFiles"],
            "deletions": source["deletions"],
            "additions": source["additions"],
            "url": source["url"],
        }

        prev_commit_id = prev_commit.id if prev_commit else None
        prev_commit_oid = prev_commit.metadata.get("oid") if prev_commit else None
        commit_gap = (prev_commit.metadata.get("commited_on") - self.metadata.get("commited_on")).total_seconds() if prev_commit else None
        
        found_emoji = helpers.get_emoji(self.metadata.get("message"))
        num_emojis = len(found_emoji)

        meaningful_words = helpers.get_meaningful_words(self.metadata.get("message"))
        message_length = len(self.metadata.get("message"))
        num_meaninful_words = len(meaningful_words)

        self.highlights = {
            "longest_commit_gap": { "count": commit_gap, "comparison": "gt", "prev_commit_id": prev_commit_id, "prev_commit_oid": prev_commit_oid },
            "shortest_commit_gap": { "count": commit_gap, "comparison": "lt", "prev_commit_id": prev_commit_id, "prev_commit_oid": prev_commit_oid },
            "most_additions": { "count": self.metadata.get("additions") },
            "fewest_additions": { "count": self.metadata.get("additions"), "comparison": "lt"},
            "most_deletions": { "count": self.metadata.get("deletions") },
            "fewest_deletions": { "count": self.metadata.get("deletions"), "comparison": "lt"},
            "most_changed_files": { "count": self.metadata.get("changed_files") },
            "fewest_deletions": { "count": self.metadata.get("changed_files"), "comparison": "lt"},
            "longest_message": { "count": message_length },
            "shortest_message": { "count": message_length, "comparison": "lt" },
            "most_meaninful_words": { "count": num_meaninful_words },
            "fewest_meaninful_words": { "count": num_meaninful_words, "comparison": "lt" },
            "most_emojis": { "count": num_emojis },
        }

        self.aggregates = {
            "num_emojis": num_emojis,
            "emoji_counts": Counter(found_emoji),
            "word_freq": nltk.FreqDist(meaningful_words),
        }

        self.averages = {
            "commit_gap": commit_gap if commit_gap else 0,
            "additions": self.metadata.get("additions"),
            "deletions": self.metadata.get("deletions"),
            "changed_files": self.metadata.get("changed_files"),
            "message_length": message_length,
            "num_meaninful_words": num_meaninful_words,
        }

    def simple_dump(self):
        data = {
            "id": self.id,
            "metadata": deepcopy(self.metadata),
        }

        return data