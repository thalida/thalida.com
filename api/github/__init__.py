import github.helpers
from github.api import GithubApi
from github.models import Repos

class Github:
    def __init__(
        self, 
        owner, 
        token, 
        api_cache_ttl=github.helpers.DEFAULT_API_CACHE_TTL, 
        insights_cache_ttl=github.helpers.DEFAULT_INSIGHTS_CACHE_TTL
    ):
        self.api = GithubApi(owner, token, cache_ttl=api_cache_ttl)
        self.repos = Repos(self.api, cache_ttl=insights_cache_ttl)

