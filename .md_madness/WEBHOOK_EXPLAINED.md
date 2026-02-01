# Where the Webhook Comes From and Why We Have It

## Short answers

- **Where does it come from?**  
  **We** host it. It’s our endpoint: `POST https://your-app.com/webhooks/firecrawl`. We give this URL to Firecrawl when we ask them to scrape a page. Firecrawl does **not** give us a webhook; we give **them** our webhook URL.

- **Why do we need it?**  
  We only need it if Firecrawl runs scrapes **asynchronously**. In that case they return immediately and later send the scrape result to our URL. Right now we mainly use the **synchronous** response (we wait for the result in the same request), so the webhook is optional and for future/async use.

---

## 1. Where does the webhook come from?

- The webhook is **our** HTTP endpoint, on **our** server:
  - Path: `POST /webhooks/firecrawl`
  - Full URL: `https://<your-app-domain>/webhooks/firecrawl` (e.g. `https://yourapp.railway.app/webhooks/firecrawl`).

- We **send this URL to Firecrawl** when we call their scrape API, e.g.:

  ```ts
  await firecrawl.scrape(url, {
    webhook: 'https://your-app.com/webhooks/firecrawl'
  });
  ```

- So:
  - **We** define and implement the webhook (in `src/webhooks/firecrawl.ts`).
  - **We** tell Firecrawl: “When the scrape is done, call this URL.”
  - **Firecrawl** (the external service) is the one that **calls** our webhook later, if they run the scrape asynchronously.

In other words: the webhook “comes from” our app; we create it and give its address to Firecrawl.

---

## 2. Why do we need it?

We need a webhook **only when Firecrawl works asynchronously**.

### Two ways Firecrawl can return scrape results

| Mode        | What happens                                                                 | Do we need the webhook? |
|------------|-------------------------------------------------------------------------------|--------------------------|
| **Sync**   | We call scrape → we wait (e.g. 30–60 s) → Firecrawl returns the result in the same HTTP response. | **No.** We get the result in the job and process it there. |
| **Async**  | We call scrape with a `webhook` URL → Firecrawl returns quickly (e.g. “job accepted”) → later, when the scrape is done, Firecrawl **POSTs** the result to our webhook URL. | **Yes.** We need the webhook to receive the result and then update MongoDB, run schema detection, etc. |

In our current code we:

- Call Firecrawl’s scrape **and wait for the response** in the same request.
- Process the result (success or rate limit, etc.) **inside the validation-enrich job**.
- So today we effectively rely on **synchronous** behavior: we get the result without the webhook being called.

The webhook is there so that:

1. **If** Firecrawl uses async mode for some requests (e.g. long-running or queue-based scrapes), they can POST the result to our URL and we can process it.
2. **If** we later switch to an explicit “async scrape” API (start job → get result only via callback), we already have an endpoint to receive that callback.

So: we **need** the webhook for the **async** flow; we **don’t** need it for the **sync** flow we’re using right now. It’s optional today but keeps the design ready for async.

---

## 3. Flow in pictures

### Sync flow (what we use today)

- We don’t rely on the webhook; we get the result in the same request.

```
Our server                          Firecrawl
     |                                   |
     |  POST /scrape (url, webhook URL)  |
     | --------------------------------->
     |                                   |
     |         (they scrape the page)   |
     |                                   |
     |  Response: { data: { markdown, metadata } }
     | <---------------------------------
     |                                   |
  We process result in the job
  (schema detection, MongoDB update, etc.)
```

### Async flow (when the webhook is used)

- Firecrawl returns quickly; later they call **our** webhook with the result.

```
Our server                          Firecrawl
     |                                   |
     |  POST /scrape (url, webhook URL)  |
     | --------------------------------->
     |                                   |
     |  Response: { id: "job-123" }     |
     | <---------------------------------
     |                                   |
  Job could finish or wait; either way
  we are not blocking on the scrape.
     |                                   |
     |         (they scrape the page)   |
     |                                   |
     |  POST /webhooks/firecrawl        |
     |  Body: { id, url, data }          |
     | <---------------------------------
     |                                   |
  Our webhook handler runs:
  - Find project/source by id or url
  - Run schema detection on data
  - Update MongoDB
  - Optionally trigger next steps
```

So the webhook “comes from” our app (we host it), and we need it so that when Firecrawl works asynchronously, they have a URL to send the result to.

---

## 4. Do you have to use it?

- **For local/dev:** If you only use sync behavior, you can run the app **without** a public URL. The webhook will never be called. `BASE_URL` can be `http://localhost:3000`; Firecrawl won’t be able to reach it, but that’s fine if they never use async.
- **For production with async:** If Firecrawl uses async for some scrapes, then:
  - The app must be reachable on the internet (e.g. Railway, Render).
  - `BASE_URL` must be your real public URL so that `BASE_URL + '/webhooks/firecrawl'` is the URL we send to Firecrawl.
  - Firecrawl will call that URL when the scrape is done.

So: the webhook **comes from** our server; we **need** it only when Firecrawl uses async; today it’s optional because we process the sync response in the job.
