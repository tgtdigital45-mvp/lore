import { PostHog } from "posthog-node";

let _client: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  if (_client) return _client;

  const apiKey = process.env.POSTHOG_API_KEY;
  const host = process.env.POSTHOG_HOST;

  if (!apiKey || !host) return null;

  _client = new PostHog(apiKey, {
    host,
    flushAt: 20,
    flushInterval: 10_000,
  });

  return _client;
}

export async function shutdownPostHog(): Promise<void> {
  if (_client) {
    await _client.shutdown();
    _client = null;
  }
}
