import { defineMiddleware } from "astro:middleware";
import { ROUTABLE_COLLECTIONS, STANDALONE_PAGES } from "./scripts/routing-utils";

export const onRequest = defineMiddleware((context, next) => {
  const pathname = context.url.pathname.replace(/\/+$/, "") || "/";

  const [, collection] = pathname.match(/^\/([^/]+)\//) || [];
  if (collection && ROUTABLE_COLLECTIONS.has(collection)) {
    return context.rewrite("/");
  }

  const [, page] = pathname.match(/^\/([^/]+)$/) || [];
  if (page && STANDALONE_PAGES.has(page)) {
    return context.rewrite("/");
  }

  return next();
});
