import { setupNetwork } from "@msw/cloudflare";

/** Shared MSW network used to mock outbound fetches in tests. */
export const network = setupNetwork();
