# Python
import os
os.environ['TZ'] = 'UTC'
import logging
import time
import json
import pathlib

# External
import requests

# App
import github.helpers

class GithubApi:
    def __init__(self, owner=None, token=None, cache_ttl=github.helpers.DEFAULT_API_CACHE_TTL):
        self.owner = owner
        self.headers = {"Authorization": f"bearer {token}"}
        self.cache_ttl = cache_ttl
        self.queries = {}

        self.add_query(
            query_name="repos",
            query="""
                query ($owner:String!, $after_cursor:String, $until:GitTimestamp) {
                    rateLimit {
                        remaining
                        used
                    }
                    repositoryOwner(login: $owner) {
                        repositories(ownerAffiliations: OWNER, isFork: false, isLocked: false, orderBy: {field: UPDATED_AT, direction: DESC}, first: 20, after:$after_cursor) {
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                            totalCount
                            edges {
                                node {
                                    id
                                    name
                                    updatedAt
                                    createdAt
                                    url
                                    description
                                    homepageUrl
                                    languages(first: 10) {
                                        nodes {
                                            name
                                            id
                                            color
                                        }
                                    }
                                    defaultBranchRef {
                                        target {
                                            ... on Commit {
                                                history(until: $until) {
                                                    totalCount
                                                }
                                            }
                                        }
                                    }
                                    refs(refPrefix: "refs/heads/", first: 50) {
                                        totalCount
                                        edges {
                                            node {
                                                name
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            """,
            cache_path_format="./github/.cache/{query_name}-{next_page}.json", 
            page_info_key="data.repositoryOwner.repositories.pageInfo",
        )

        self.add_query(
            query_name="commits",
            query="""
                query ($owner:String!, $repo_name:String!, $after_cursor:String) {
                    rateLimit {
                        remaining
                        used
                    }
                    repository(name: $repo_name, owner: $owner) {
                        defaultBranchRef {
                            target {
                                ... on Commit {
                                    history(first: 100, after:$after_cursor) {
                                        pageInfo {
                                            endCursor
                                            hasNextPage
                                        }
                                        totalCount
                                        nodes {
                                            id
                                            oid
                                            message
                                            committedDate
                                            changedFiles
                                            deletions
                                            additions
                                            url
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            """,
            cache_path_format="./github/.cache/{repo_name}-{query_name}-{next_page}.json", 
            page_info_key="data.repository.defaultBranchRef.target.history.pageInfo",
        )

    def add_query(
        self, 
        query_name, 
        query, 
        cache_path_format="./cache/{query_name}-{next_page}.json", 
        page_info_key="data.pageInfo", 
        cache_ttl=None
    ):
        new_query = {
            "query_name": query_name,
            "query": query,
            "cache_ttl":  cache_ttl if cache_ttl is not None else self.cache_ttl,
            "cache_path_format": cache_path_format,
            "page_info_key": page_info_key,
            "next_page": 1,
            "end_cursor": None,
        }
        self.queries[query_name] = new_query
        return self.queries[query_name]

    def query_api(self, query, variables):
        try:
            json = {"query": query, "variables": variables}
            request = requests.post("https://api.github.com/graphql", json=json, headers=self.headers)
            if request.status_code == 200:
                return request.json()
            
            request.raise_for_status()
        except:
            raise

        return
    
    def fetch_all(self, query_name, variables={}):
        try:
            hasNextPage = True
            all_res = []
            
            while hasNextPage:
                res, page_info = self.fetch_next_page(query_name, variables)
                all_res.append(res)
                hasNextPage = page_info["hasNextPage"]
            
            return all_res
        except Exception as e:
            raise

        return

    def fetch_next_page(self, query_name, variables={}):
        query_data = self.queries[query_name]
        
        try:
            variables = {
                "owner": self.owner,
                "after_cursor": query_data["end_cursor"],
                **variables,
            }
            
            from_cache = False
            cache_filepath = query_data["cache_path_format"].format(query_name=query_name, next_page=query_data["next_page"], **variables)
            cache_file = pathlib.Path(cache_filepath)
            cached_at = cache_file.stat().st_mtime if cache_file.exists() else None
            if cached_at is not None and time.time() < cached_at + query_data["cache_ttl"]:
                with cache_file.open(mode="r") as f:
                    from_cache = True
                    response = json.load(f)
            else:
                response = self.query_api(query_data["query"], variables)
            
            page_info = github.helpers.deep_get(response, query_data["page_info_key"])
            page_info["curr_page"] = query_data["next_page"]
            
            if page_info["hasNextPage"]:
                query_data["next_page"] += 1
                query_data["end_cursor"] = page_info["endCursor"]
            else:
                query_data["next_page"] = 1
                query_data["end_cursor"] = None

            if not from_cache:
                cache_file.parent.mkdir(parents=True, exist_ok=True)
                with cache_file.open(mode="w") as f:
                    json.dump(response, f)
            
            return response, page_info
        except Exception as e:
            raise

        return
