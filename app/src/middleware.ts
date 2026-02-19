import { defineMiddleware } from "astro:middleware";
import { ROUTABLE_COLLECTIONS } from "./scripts/routing-utils";

export const onRequest = defineMiddleware((context, next) => {
  const [, collection] = context.url.pathname.match(/^\/([^/]+)\//) || [];
  if (collection && ROUTABLE_COLLECTIONS.has(collection)) {
    return context.rewrite("/");
  }
  return next();
});
