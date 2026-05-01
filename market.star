# Mochi Market: Stateless proxy to the Comptroller
# Copyright Alistair Cunningham 2026

# Comptroller entity ID
COMPTROLLER = "1sfEACmTnQhBVgquGhaCs8Jw4SXKF9XY2apnUwJ63duq2QSxh5"

# Read the status message from an open stream; error and return False if not 200.
def _check_status(a, s, event):
    r = s.read()
    if not r:
        a.error(502, "No response from Comptroller (" + event + ")")
        return False
    # Skip P2P protocol ACK messages if present
    while r.get("type") == "ack":
        r = s.read()
        if not r:
            a.error(502, "Comptroller timed out (" + event + ")")
            return False
    status = r.get("status", "500")
    if status != "200":
        a.error(int(status), r.get("error", "Comptroller request failed (" + event + ")"))
        return False
    return True

# Open a P2P stream to the Comptroller, read the status message, and return the stream on success
def comptroller_stream(a, event, params):
    s = mochi.remote.stream(COMPTROLLER, "market", event, params)
    if not s:
        a.error_label(502, "errors.comptroller_is_not_available")
        return None
    if not _check_status(a, s, event):
        return None
    return s

# Open a P2P stream to the Comptroller, write raw upload data, then read the status message.
def comptroller_upload(a, event, params, data):
    s = mochi.remote.stream(COMPTROLLER, "market", event, params)
    if not s:
        a.error_label(502, "errors.comptroller_is_not_available")
        return None
    s.write.raw(data)
    s.close()
    if not _check_status(a, s, event):
        return None
    return s

# Build params dict from HTTP form/query inputs, skipping None values
def forward(a, fields):
    params = {}
    for field in fields:
        value = a.input(field)
        if value != None:
            params[field] = value
    return params

# Wrap a Comptroller event as a JSON-style HTTP action: returns {"data": ...} or None on error
def proxy(a, event, params):
    s = comptroller_stream(a, event, params)
    if not s:
        return
    return {"data": s.read()}

# ---- Person asset proxy (avatar, banner, favicon, style, information) ----

# Stream an entity's asset from its owning service via a Mochi stream.
# Location-transparent: mochi.remote.stream() loops back in-process when the
# entity lives on this server, or goes over P2P otherwise.
def stream_asset(a, entity_id, service, asset):
    if not entity_id:
        a.error(404, asset + " unavailable")
        return None
    if not mochi.text.valid(entity_id, "entity") and not mochi.text.valid(entity_id, "fingerprint"):
        a.error(404, asset + " unavailable")
        return None
    s = mochi.remote.stream(entity_id, service, asset, {})
    if not s:
        a.error(404, asset + " unavailable")
        return None
    header = s.read()
    if not header or header.get("status") != "200":
        a.error(404, asset + " not set")
        return None
    a.header("Cache-Control", "public, max-age=300")
    if "data" in header:
        return {"data": header["data"]}
    a.header("Content-Type", header.get("content_type", "application/octet-stream"))
    a.write_from_stream(s)
    return None

_PERSON_ASSETS = ("avatar", "banner", "favicon", "style", "information")

def action_user_asset(a):
    asset = a.input("asset")
    if asset not in _PERSON_ASSETS:
        a.error_label(404, "errors.unknown_asset")
        return
    return stream_asset(a, a.input("user") or "", "people", asset)

# ---- Accounts ----

# Get account details
def action_accounts_get(a):
    return proxy(a, "accounts/get", forward(a, ["id"]))

# Update account profile
def action_accounts_update(a):
    return proxy(a, "accounts/update", forward(a, [
        "biography", "location", "business", "company", "vat",
        "address_name", "address_line1", "address_line2", "address_city",
        "address_region", "address_postcode", "address_country"]))

# Activate seller account
def action_accounts_activate(a):
    return proxy(a, "accounts/activate", forward(a, ["return_url"]))

# Start Stripe onboarding — returns an OAuth authorize URL the browser should
# navigate to.
def action_accounts_stripe_onboarding(a):
    return proxy(a, "accounts/stripe/onboarding", forward(a, ["return_url"]))

# Check Stripe onboarding status
def action_accounts_stripe_status(a):
    return proxy(a, "accounts/stripe/status", {})

# Public fee disclosure (platform percentage + per-currency Stripe minimums and
# chargeback fees). No auth required so the SPA can show fees pre-onboarding.
def action_accounts_fees(a):
    return proxy(a, "accounts/fees", {})

# ---- Categories ----

# List all categories
def action_categories_list(a):
    return proxy(a, "categories/list", {})

# ---- Listings ----

# Create a new listing (tags arrives as JSON string from browser)
def action_listings_create(a):
    params = forward(a, [
        "title", "description", "category", "condition", "type", "pricing",
        "price", "currency", "interval", "pickup", "shipping", "location",
        "information", "quantity"])
    tags = a.input("tags")
    if tags != None:
        params["tags"] = json.decode(tags)
    return proxy(a, "listings/create", params)

# Update a listing (tags arrives as JSON string from browser)
def action_listings_update(a):
    params = forward(a, [
        "id", "title", "description", "category", "condition", "type", "pricing",
        "price", "currency", "interval", "pickup", "shipping", "location",
        "information", "quantity"])
    tags = a.input("tags")
    if tags != None:
        params["tags"] = json.decode(tags)
    return proxy(a, "listings/update", params)

# Delete a listing
def action_listings_delete(a):
    return proxy(a, "listings/delete", forward(a, ["id"]))

# Publish a listing
def action_listings_publish(a):
    return proxy(a, "listings/publish", forward(a, [
        "id", "reserve", "instant", "opens", "closes", "extend", "extension"]))

# Relist: duplicate a listing as a new draft
def action_listings_relist(a):
    return proxy(a, "listings/relist", forward(a, ["id"]))

# Search listings
def action_listings_search(a):
    return proxy(a, "listings/search", forward(a, [
        "query", "category", "type", "condition", "pricing", "min", "max",
        "delivery", "location", "sort", "page", "limit"]))

# Get a single listing
def action_listings_get(a):
    return proxy(a, "listings/get", forward(a, ["id"]))

# Get own listings
def action_listings_mine(a):
    return proxy(a, "listings/mine", forward(a, ["status", "query", "page", "limit"]))

# ---- Shipping ----

# Set shipping options (options arrives as JSON string from browser)
def action_shipping_set(a):
    params = forward(a, ["listing", "options"])
    return proxy(a, "shipping/set", params)

# ---- Photos ----

# Upload a listing photo via stream to Comptroller
def action_photos_upload(a):
    file = a.file("file")
    if not file:
        a.error_label(400, "errors.no_file_uploaded")
        return
    listing = a.input("listing")
    if not listing:
        a.error_label(400, "errors.listing_required")
        return

    s = comptroller_upload(a, "photos/upload", {
        "listing": listing,
        "filename": file["name"],
        "mime": file["content_type"],
        "size": file["size"],
    }, file["data"])
    if not s:
        return
    return {"data": s.read()}

# List photos for a listing
def action_photos_list(a):
    return proxy(a, "photos/list", forward(a, ["listing"]))

# Delete a photo
def action_photos_delete(a):
    return proxy(a, "photos/delete", forward(a, ["id"]))

# Reorder photos (ids arrives as JSON string from browser)
def action_photos_reorder(a):
    params = forward(a, ["listing"])
    ids = a.input("ids")
    if ids != None:
        params["ids"] = json.decode(ids)
    return proxy(a, "photos/reorder", params)

# Stream a photo from the Comptroller via P2P. The browser hits the local
# Mochi server, which proxies to the Comptroller — never crosses origin.
def action_photo_get(a):
    return _proxy_photo(a, False)

def action_photo_thumbnail(a):
    return _proxy_photo(a, True)

def _proxy_photo(a, thumbnail):
    photo_id = a.input("id")
    if not photo_id:
        a.error_label(400, "errors.photo_id_required")
        return
    s = comptroller_stream(a, "photos/get", {"id": photo_id, "thumbnail": thumbnail})
    if not s:
        return
    metadata = s.read() or {}
    a.header("Cache-Control", "public, max-age=86400")
    a.header("Content-Type", metadata.get("content_type", "application/octet-stream"))
    a.write_from_stream(s)

# ---- Assets ----

# Upload a digital asset file via stream to Comptroller
def action_assets_upload(a):
    file = a.file("file")
    if not file:
        a.error_label(400, "errors.no_file_uploaded")
        return
    listing = a.input("listing")
    if not listing:
        a.error_label(400, "errors.listing_required")
        return

    s = comptroller_upload(a, "assets/upload", {
        "listing": listing,
        "filename": file["name"],
        "mime": file["content_type"],
        "size": file["size"],
    }, file["data"])
    if not s:
        return
    return {"data": s.read()}

# Add an external URL asset
def action_assets_external(a):
    return proxy(a, "assets/external", forward(a, ["listing", "filename", "mime", "reference"]))

# Remove an asset
def action_assets_remove(a):
    return proxy(a, "assets/remove", forward(a, ["id"]))

# Reorder assets (ids arrives as JSON string from browser)
def action_assets_reorder(a):
    params = forward(a, ["listing"])
    ids = a.input("ids")
    if ids != None:
        params["ids"] = json.decode(ids)
    return proxy(a, "assets/reorder", params)

# Download a digital asset (streams file from Comptroller to browser)
def action_assets_download(a):
    s = comptroller_stream(a, "assets/download", forward(a, ["id"]))
    if not s:
        return
    metadata = s.read()
    if metadata.get("hosting") == "external":
        return {"data": metadata}
    # Mochi-hosted: set headers and pipe file bytes to browser
    asset = metadata.get("asset", {})
    if asset.get("mime"):
        a.header("Content-Type", asset["mime"])
    if asset.get("filename"):
        a.header("Content-Disposition", 'attachment; filename="' + asset["filename"] + '"')
    a.write_from_stream(s)

# ---- Bids ----

# Place a bid
def action_bids_place(a):
    return proxy(a, "bids/place", forward(a, ["auction", "amount", "ceiling"]))

# Get own bids
def action_bids_mine(a):
    return proxy(a, "bids/mine", forward(a, ["status", "page", "limit"]))

# ---- Orders ----

# Create an order
def action_orders_create(a):
    return proxy(a, "orders/create", forward(a, [
        "listing", "delivery", "option", "amount",
        "address_name", "address_line1", "address_line2", "address_city",
        "address_region", "address_postcode", "address_country",
        "success_url", "cancel_url"]))

# Create an order from auction win
def action_orders_auction(a):
    return proxy(a, "orders/auction", forward(a, [
        "listing", "delivery", "option",
        "address_name", "address_line1", "address_line2", "address_city",
        "address_region", "address_postcode", "address_country",
        "success_url", "cancel_url"]))

# Get purchases
def action_orders_purchases(a):
    return proxy(a, "orders/purchases", forward(a, ["status", "page", "limit"]))

# Get sales
def action_orders_sales(a):
    return proxy(a, "orders/sales", forward(a, ["status", "page", "limit"]))

# Get a single order
def action_orders_get(a):
    return proxy(a, "orders/get", forward(a, ["id"]))

# Resume payment for a pending order — returns a fresh Stripe Checkout URL
def action_orders_resume(a):
    return proxy(a, "orders/resume", forward(a, ["id", "success_url", "cancel_url"]))

# Mark order as shipped
def action_orders_ship(a):
    return proxy(a, "orders/ship", forward(a, ["id", "carrier", "tracking", "url"]))

# Confirm order delivery
def action_orders_confirm(a):
    return proxy(a, "orders/confirm", forward(a, ["id"]))

# Buyer opens a dispute requesting a refund
def action_orders_dispute(a):
    return proxy(a, "orders/dispute", forward(a, ["id", "reason", "description"]))

# Seller issues a refund (full or partial)
def action_orders_refund(a):
    return proxy(a, "orders/refund", forward(a, ["id", "amount", "reason"]))

# ---- Subscriptions ----

# Create a subscription
def action_subscriptions_create(a):
    return proxy(a, "subscriptions/create", forward(a, ["listing", "success_url", "cancel_url"]))

# Get own subscriptions
def action_subscriptions_mine(a):
    return proxy(a, "subscriptions/mine", forward(a, ["status", "page", "limit"]))

# Get subscribers for a listing
def action_subscriptions_subscribers(a):
    return proxy(a, "subscriptions/subscribers", forward(a, ["listing", "status", "page", "limit"]))

# Cancel a subscription
def action_subscriptions_cancel(a):
    return proxy(a, "subscriptions/cancel", forward(a, ["id"]))

# Pause a subscription
def action_subscriptions_pause(a):
    return proxy(a, "subscriptions/pause", forward(a, ["id"]))

# Resume a subscription
def action_subscriptions_resume(a):
    return proxy(a, "subscriptions/resume", forward(a, ["id"]))

# Reactivate a subscription that is scheduled for cancellation
def action_subscriptions_reactivate(a):
    return proxy(a, "subscriptions/reactivate", forward(a, ["id"]))

# ---- Threads ----

# Create a thread
def action_threads_create(a):
    return proxy(a, "threads/create", forward(a, ["listing", "buyer"]))

# Get own threads
def action_threads_mine(a):
    return proxy(a, "threads/mine", forward(a, ["role", "page", "limit"]))

# Get a thread with messages
def action_threads_get(a):
    return proxy(a, "threads/get", forward(a, ["id"]))

# ---- Messages ----

# Send a message
def action_messages_send(a):
    return proxy(a, "messages/send", forward(a, ["thread", "body"]))

# Mark messages as read
def action_messages_read(a):
    return proxy(a, "messages/read", forward(a, ["thread"]))

# ---- Reviews ----

# Create a review
def action_reviews_create(a):
    return proxy(a, "reviews/create", forward(a, ["order", "rating", "text"]))

# Respond to a review
def action_reviews_respond(a):
    return proxy(a, "reviews/respond", forward(a, ["id", "response"]))

# Get reviews for an account
def action_reviews_account(a):
    return proxy(a, "reviews/account", forward(a, ["id", "role", "page", "limit"]))

# List reviews where the current identity is the subject
def action_reviews_inbox(a):
    return proxy(a, "reviews/inbox", forward(a, ["page", "limit"]))

# List reviews where the current identity is the reviewer
def action_reviews_sent(a):
    return proxy(a, "reviews/sent", forward(a, ["page", "limit"]))

# ---- Appeals ----

# Appeal a held or rejected listing
def action_listings_appeal(a):
    return proxy(a, "listings/appeal", forward(a, ["id", "reason"]))

# ---- Reports ----

# Create a report
def action_reports_create(a):
    return proxy(a, "reports/create", forward(a, ["target", "type", "reason", "details"]))

# ---- Disputes ----

# Get dispute details
def action_disputes_get(a):
    return proxy(a, "disputes/get", forward(a, ["id"]))

# Respond to a dispute
def action_disputes_respond(a):
    return proxy(a, "disputes/respond", forward(a, ["id", "body"]))

# Per-object audit timeline (server enforces ownership/staff)
def action_audit_object(a):
    return proxy(a, "audit/object", forward(a, ["kind", "object", "page", "limit"]))

# Receive notification from Comptroller. The server tags each event with a
# topic (message / order/seller / order/buyer / auction/ended) so users can
# route each category to a different destination.
def event_message_notify(e):
    if e.header("from") != COMPTROLLER:
        return
    topic = e.content("topic")
    title = e.content("title")
    url = e.content("url")
    if not topic or not title or not url:
        return
    body = e.content("body") or ""
    object = e.content("object") or ""
    thread = e.content("thread") or ""
    mochi.service.call("notifications", "send", topic, object, title, body, url, mochi.app.label("notifications.topic." + topic.replace("/", ".")))
    if thread:
        mochi.websocket.write("market-thread-" + str(thread), {"event": "message"})
