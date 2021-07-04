# Python
from collections import defaultdict, Counter
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

        meaningful_words = helpers.get_meaningful_words(self.metadata.get("message"))
        found_emoji = helpers.get_emoji(self.metadata.get("message"))
        num_emojis = len(found_emoji)
        commit_gap = (prev_commit.metadata.get("commited_on") - self.metadata.get("commited_on")).total_seconds() if prev_commit else None
        
        self.highlights = {
            "longest_commit_gap": { "count": commit_gap, "comparison": "gt", "prev_commit_id": prev_commit_id, "prev_commit_oid": prev_commit_oid },
            "shortest_commit_gap": { "count": commit_gap, "comparison": "lt", "prev_commit_id": prev_commit_id, "prev_commit_oid": prev_commit_oid },
            "most_deletions": { "count": self.metadata.get("deletions") },
            "most_additions": { "count": self.metadata.get("additions") },
            "most_changed_files": { "count": self.metadata.get("changed_files") },
            "longest_message": { "count": len(self.metadata.get("message")) },
            "num_meaninful_words": { "count": len(meaningful_words) },
            "most_emojis": { "count": num_emojis },
        }

        self.aggregates = {
            "num_emojis": num_emojis,
            "emoji_counts": Counter(found_emoji),
            "word_freq": nltk.FreqDist(meaningful_words),
        }