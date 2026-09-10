// One request at a time; stopped watchers cannot publish into another document.
export function watchSource({
  url,
  revision,
  onResult,
  fetcher = fetch,
  events = window,
  interval = 10000,
}) {
  let stopped = false,
    pending = false,
    controller;
  const check = async () => {
    if (stopped || pending) return;
    pending = true;
    controller = new AbortController();
    try {
      const response = await fetcher(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Source is unavailable.");
      if (!stopped)
        onResult(
          data.revision === revision ? null : { revision: data.revision },
        );
    } catch (error) {
      if (!stopped && error.name !== "AbortError")
        onResult({ error: error.message });
    } finally {
      pending = false;
    }
  };
  const timer = setInterval(check, interval);
  events.addEventListener("focus", check);
  check();
  return () => {
    stopped = true;
    controller?.abort();
    clearInterval(timer);
    events.removeEventListener("focus", check);
  };
}
