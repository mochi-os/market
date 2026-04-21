# Mochi Market: Stateless proxy to the Comptroller
# Copyright Alistair Cunningham 2026

# Comptroller entity ID
COMPTROLLER = "1sfEACmTnQhBVgquGhaCs8Jw4SXKF9XY2apnUwJ63duq2QSxh5"

# Open a P2P stream to the Comptroller, read the status message, and return the stream on success
def comptroller_stream(a, event, params):
    s = mochi.remote.stream(COMPTROLLER, "market", event, params)
    if not s:
        a.error(502, "Comptroller is not available")
        return None
    r = s.read()
    if not r:
        a.error(502, "No response from Comptroller (" + event + ")")
        return None
    # Skip P2P protocol ACK messages if present
    while r.get("type") == "ack":
        r = s.read()
        if not r:
            a.error(502, "Comptroller timed out (" + event + ")")
            return None
    status = r.get("status", "500")
    if status != "200":
        a.error(int(status), r.get("error", "Comptroller request failed (" + event + ")"))
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

# ---- Accounts ----

# Get account details
def action_accounts_get(a):
    s = comptroller_stream(a, "accounts/get", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Update account profile
def action_accounts_update(a):
    s = comptroller_stream(a, "accounts/update", forward(a, [
        "biography", "location", "business", "company", "vat",
        "address_name", "address_line1", "address_line2", "address_city",
        "address_region", "address_postcode", "address_country"]))
    if not s:
        return
    return {"data": s.read()}

# Activate seller account
def action_accounts_activate(a):
    s = comptroller_stream(a, "accounts/activate", forward(a, ["return_url"]))
    if not s:
        return
    return {"data": s.read()}

# Start Stripe onboarding — returns an OAuth authorize URL the browser should
# navigate to.
def action_accounts_stripe_onboarding(a):
    s = comptroller_stream(a, "accounts/stripe/onboarding", forward(a, ["return_url"]))
    if not s:
        return
    return {"data": s.read()}

# Check Stripe onboarding status
def action_accounts_stripe_status(a):
    s = comptroller_stream(a, "accounts/stripe/status", {})
    if not s:
        return
    return {"data": s.read()}

# ---- Categories ----

# List all categories
def action_categories_list(a):
    s = comptroller_stream(a, "categories/list", {})
    if not s:
        return
    return {"data": s.read()}

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
    s = comptroller_stream(a, "listings/create", params)
    if not s:
        return
    return {"data": s.read()}

# Update a listing (tags arrives as JSON string from browser)
def action_listings_update(a):
    params = forward(a, [
        "id", "title", "description", "category", "condition", "type", "pricing",
        "price", "currency", "interval", "pickup", "shipping", "location",
        "information", "quantity"])
    tags = a.input("tags")
    if tags != None:
        params["tags"] = json.decode(tags)
    s = comptroller_stream(a, "listings/update", params)
    if not s:
        return
    return {"data": s.read()}

# Delete a listing
def action_listings_delete(a):
    s = comptroller_stream(a, "listings/delete", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Publish a listing
def action_listings_publish(a):
    s = comptroller_stream(a, "listings/publish", forward(a, [
        "id", "reserve", "instant", "opens", "closes", "extend", "extension"]))
    if not s:
        return
    return {"data": s.read()}

# Relist: duplicate a listing as a new draft
def action_listings_relist(a):
    s = comptroller_stream(a, "listings/relist", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Search listings
def action_listings_search(a):
    s = comptroller_stream(a, "listings/search", forward(a, [
        "query", "category", "type", "condition", "pricing", "min", "max",
        "delivery", "location", "sort", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# Get a single listing
def action_listings_get(a):
    s = comptroller_stream(a, "listings/get", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Get own listings
def action_listings_mine(a):
    s = comptroller_stream(a, "listings/mine", forward(a, ["status", "query", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Shipping ----

# Set shipping options (options arrives as JSON string from browser)
def action_shipping_set(a):
    params = forward(a, ["listing", "options"])
    s = comptroller_stream(a, "shipping/set", params)
    if not s:
        return
    return {"data": s.read()}

# ---- Photos ----

# Upload a listing photo via stream to Comptroller
def action_photos_upload(a):
    file = a.file("file")
    if not file:
        a.error(400, "No file uploaded")
        return
    listing = a.input("listing")
    if not listing:
        a.error(400, "Listing required")
        return

    s = mochi.remote.stream(COMPTROLLER, "market", "photos/upload", {
        "listing": listing,
        "filename": file["name"],
        "mime": file["content_type"],
        "size": file["size"],
    })
    if not s:
        a.error(502, "Market unavailable")
        return

    s.write_raw(file["data"])
    s.close()

    r = s.read()
    if not r or r.get("status") != "200":
        a.error(int(r.get("status", "500")) if r else 502, r.get("error", "Photo upload failed") if r else "Photo upload failed")
        return
    return {"data": s.read()}

# List photos for a listing
def action_photos_list(a):
    s = comptroller_stream(a, "photos/list", forward(a, ["listing"]))
    if not s:
        return
    return {"data": s.read()}

# Delete a photo
def action_photos_delete(a):
    s = comptroller_stream(a, "photos/delete", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Reorder photos (ids arrives as JSON string from browser)
def action_photos_reorder(a):
    params = forward(a, ["listing"])
    ids = a.input("ids")
    if ids != None:
        params["ids"] = json.decode(ids)
    s = comptroller_stream(a, "photos/reorder", params)
    if not s:
        return
    return {"data": s.read()}

# ---- Assets ----

# Upload a digital asset file via stream to Comptroller
def action_assets_upload(a):
    file = a.file("file")
    if not file:
        a.error(400, "No file uploaded")
        return
    listing = a.input("listing")
    if not listing:
        a.error(400, "Listing required")
        return

    s = mochi.remote.stream(COMPTROLLER, "market", "assets/upload", {
        "listing": listing,
        "filename": file["name"],
        "mime": file["content_type"],
        "size": file["size"],
    })
    if not s:
        a.error(502, "Market unavailable")
        return

    s.write_raw(file["data"])
    s.close()

    r = s.read()
    if not r or r.get("status") != "200":
        a.error(int(r.get("status", "500")) if r else 502, r.get("error", "File upload failed") if r else "File upload failed")
        return
    return {"data": s.read()}

# Add an external URL asset
def action_assets_external(a):
    s = comptroller_stream(a, "assets/external", forward(a, ["listing", "filename", "mime", "reference"]))
    if not s:
        return
    return {"data": s.read()}

# Remove an asset
def action_assets_remove(a):
    s = comptroller_stream(a, "assets/remove", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Reorder assets (ids arrives as JSON string from browser)
def action_assets_reorder(a):
    params = forward(a, ["listing"])
    ids = a.input("ids")
    if ids != None:
        params["ids"] = json.decode(ids)
    s = comptroller_stream(a, "assets/reorder", params)
    if not s:
        return
    return {"data": s.read()}

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

# ---- Auctions ----

# Get auction details for a listing
def action_auctions_get(a):
    s = comptroller_stream(a, "auctions/get", forward(a, ["listing"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Bids ----

# Place a bid
def action_bids_place(a):
    s = comptroller_stream(a, "bids/place", forward(a, ["auction", "amount", "ceiling"]))
    if not s:
        return
    return {"data": s.read()}

# Get own bids
def action_bids_mine(a):
    s = comptroller_stream(a, "bids/mine", forward(a, ["status", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Orders ----

# Create an order
def action_orders_create(a):
    s = comptroller_stream(a, "orders/create", forward(a, [
        "listing", "delivery", "option", "amount",
        "address_name", "address_line1", "address_line2", "address_city",
        "address_region", "address_postcode", "address_country",
        "success_url", "cancel_url"]))
    if not s:
        return
    return {"data": s.read()}

# Create an order from auction win
def action_orders_auction(a):
    s = comptroller_stream(a, "orders/auction", forward(a, [
        "listing", "delivery", "option",
        "address_name", "address_line1", "address_line2", "address_city",
        "address_region", "address_postcode", "address_country",
        "success_url", "cancel_url"]))
    if not s:
        return
    return {"data": s.read()}

# Get purchases
def action_orders_purchases(a):
    s = comptroller_stream(a, "orders/purchases", forward(a, ["status", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# Get sales
def action_orders_sales(a):
    s = comptroller_stream(a, "orders/sales", forward(a, ["status", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# Get a single order
def action_orders_get(a):
    s = comptroller_stream(a, "orders/get", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Resume payment for a pending order — returns a fresh Stripe Checkout URL
def action_orders_resume(a):
    s = comptroller_stream(a, "orders/resume", forward(a, ["id", "success_url", "cancel_url"]))
    if not s:
        return
    return {"data": s.read()}

# Mark order as shipped
def action_orders_ship(a):
    s = comptroller_stream(a, "orders/ship", forward(a, ["id", "carrier", "tracking", "url"]))
    if not s:
        return
    return {"data": s.read()}

# Confirm order delivery
def action_orders_confirm(a):
    s = comptroller_stream(a, "orders/confirm", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Refund an order
def action_orders_refund(a):
    s = comptroller_stream(a, "orders/refund", forward(a, ["id", "reason", "description"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Subscriptions ----

# Create a subscription
def action_subscriptions_create(a):
    s = comptroller_stream(a, "subscriptions/create", forward(a, ["listing", "success_url", "cancel_url"]))
    if not s:
        return
    return {"data": s.read()}

# Get own subscriptions
def action_subscriptions_mine(a):
    s = comptroller_stream(a, "subscriptions/mine", forward(a, ["status", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# Get subscribers for a listing
def action_subscriptions_subscribers(a):
    s = comptroller_stream(a, "subscriptions/subscribers", forward(a, ["listing", "status", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# Cancel a subscription
def action_subscriptions_cancel(a):
    s = comptroller_stream(a, "subscriptions/cancel", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Pause a subscription
def action_subscriptions_pause(a):
    s = comptroller_stream(a, "subscriptions/pause", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Resume a subscription
def action_subscriptions_resume(a):
    s = comptroller_stream(a, "subscriptions/resume", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Reactivate a subscription that is scheduled for cancellation
def action_subscriptions_reactivate(a):
    s = comptroller_stream(a, "subscriptions/reactivate", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Threads ----

# Create a thread
def action_threads_create(a):
    s = comptroller_stream(a, "threads/create", forward(a, ["listing"]))
    if not s:
        return
    return {"data": s.read()}

# Get own threads
def action_threads_mine(a):
    s = comptroller_stream(a, "threads/mine", forward(a, ["role", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# Get a thread with messages
def action_threads_get(a):
    s = comptroller_stream(a, "threads/get", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Messages ----

# Send a message
def action_messages_send(a):
    s = comptroller_stream(a, "messages/send", forward(a, ["thread", "body"]))
    if not s:
        return
    return {"data": s.read()}

# Mark messages as read
def action_messages_read(a):
    s = comptroller_stream(a, "messages/read", forward(a, ["thread"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Reviews ----

# Create a review
def action_reviews_create(a):
    s = comptroller_stream(a, "reviews/create", forward(a, ["order", "rating", "text"]))
    if not s:
        return
    return {"data": s.read()}

# Respond to a review
def action_reviews_respond(a):
    s = comptroller_stream(a, "reviews/respond", forward(a, ["id", "response"]))
    if not s:
        return
    return {"data": s.read()}

# Get reviews for an account
def action_reviews_account(a):
    s = comptroller_stream(a, "reviews/account", forward(a, ["id", "role", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Appeals ----

# Appeal a held or rejected listing
def action_listings_appeal(a):
    s = comptroller_stream(a, "listings/appeal", forward(a, ["id", "reason"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Reports ----

# Create a report
def action_reports_create(a):
    s = comptroller_stream(a, "reports/create", forward(a, ["target", "type", "reason", "details"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Disputes ----

# Get dispute details
def action_disputes_get(a):
    s = comptroller_stream(a, "disputes/get", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Respond to a dispute
def action_disputes_respond(a):
    s = comptroller_stream(a, "disputes/respond", forward(a, ["id", "body"]))
    if not s:
        return
    return {"data": s.read()}

# Check notification subscription
def action_notifications_check(a):
    result = mochi.service.call("notifications", "subscriptions")
    return {"data": {"exists": result != None and len(result) > 0}}

# Receive notification from Comptroller. The server tags each event with a
# topic (message / order/seller / order/buyer / auction/ended) so users can
# route each category to a different destination.
def event_message_notify(e):
    topic = e.content("topic") or "message"
    title = e.content("title") or "Market message"
    body = e.content("body") or ""
    url = e.content("url") or "/market/messages"
    object = e.content("object") or ""
    thread = e.content("thread") or ""
    mochi.service.call("notifications", "send", topic, title, body, object, url)
    if thread:
        mochi.websocket.write("market-thread-" + str(thread), {"event": "message"})
