# Python
from collections import Counter
from copy import deepcopy

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

        self.prev_commit = prev_commit
        commit_gap = (self.prev_commit.metadata.get("commited_on") - self.metadata.get("commited_on")).total_seconds() if self.prev_commit else None
        
        found_emoji = helpers.get_emoji(self.metadata.get("message"))
        num_emojis = len(found_emoji)

        meaningful_words = helpers.get_meaningful_words(self.metadata.get("message"))
        message_length = len(self.metadata.get("message"))
        num_meaninful_words = len(meaningful_words)

        self.highlights = {
            "longest_commit_gap": { "count": commit_gap, "comparison": "ge", "used_prev": True },
            "shortest_commit_gap": { "count": commit_gap, "comparison": "le", "used_prev": True },
            "most_additions": { "count": self.metadata.get("additions") },
            "fewest_additions": { "count": self.metadata.get("additions"), "comparison": "le" },
            "most_deletions": { "count": self.metadata.get("deletions") },
            "fewest_deletions": { "count": self.metadata.get("deletions"), "comparison": "le" },
            "most_changed_files": { "count": self.metadata.get("changed_files") },
            "fewest_deletions": { "count": self.metadata.get("changed_files"), "comparison": "le" },
            "longest_message": { "count": message_length },
            "shortest_message": { "count": message_length, "comparison": "le" },
            "most_meaninful_words": { "count": num_meaninful_words },
            "fewest_meaninful_words": { "count": num_meaninful_words, "comparison": "le" },
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
            "prev_commit_id": self.prev_commit.id if self.prev_commit else None
        }

        return data