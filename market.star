# Mochi Market: Stateless proxy to the market server
# Copyright Alistair Cunningham 2026

# Market server entity ID
MARKET = "1sfEACmTnQhBVgquGhaCs8Jw4SXKF9XY2apnUwJ63duq2QSxh5"

# Open a P2P stream to market-server, read the status message, and return the stream on success
def market_stream(a, event, params):
    s = mochi.remote.stream(MARKET, "market", event, params)
    if not s:
        a.error(502, "Market unavailable")
        return None
    r = s.read()
    if not r:
        a.error(502, "No response from market")
        return None
    # Skip P2P protocol ACK messages if present
    # Skip P2P protocol ACK messages if present
    while r.get("type") == "ack":
        r = s.read()
        if not r:
            a.error(502, "No response from market")
            return None
    status = r.get("status", "500")
    if status != "200":
        a.error(int(status), r.get("error", "Request failed"))
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
    s = market_stream(a, "accounts/get", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Update account profile
def action_accounts_update(a):
    s = market_stream(a, "accounts/update", forward(a, [
        "biography", "location", "business", "company", "vat",
        "address_name", "address_line1", "address_line2", "address_city",
        "address_region", "address_postcode", "address_country"]))
    if not s:
        return
    return {"data": s.read()}

# Activate seller account
def action_accounts_activate(a):
    s = market_stream(a, "accounts/activate", {})
    if not s:
        return
    return {"data": s.read()}

# Start Stripe onboarding
def action_accounts_stripe_onboarding(a):
    s = market_stream(a, "accounts/stripe/onboarding", {})
    if not s:
        return
    return {"data": s.read()}

# Check Stripe onboarding status
def action_accounts_stripe_status(a):
    s = market_stream(a, "accounts/stripe/status", {})
    if not s:
        return
    return {"data": s.read()}

# ---- Categories ----

# List all categories
def action_categories_list(a):
    s = market_stream(a, "categories/list", {})
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
    s = market_stream(a, "listings/create", params)
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
    s = market_stream(a, "listings/update", params)
    if not s:
        return
    return {"data": s.read()}

# Delete a listing
def action_listings_delete(a):
    s = market_stream(a, "listings/delete", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Publish a listing
def action_listings_publish(a):
    s = market_stream(a, "listings/publish", forward(a, [
        "id", "reserve", "instant", "opens", "closes", "extend", "extension"]))
    if not s:
        return
    return {"data": s.read()}

# Search listings
def action_listings_search(a):
    s = market_stream(a, "listings/search", forward(a, [
        "query", "category", "type", "condition", "pricing", "min", "max",
        "delivery", "location", "sort", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# Get a single listing
def action_listings_get(a):
    s = market_stream(a, "listings/get", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Get own listings
def action_listings_mine(a):
    s = market_stream(a, "listings/mine", forward(a, ["status", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Shipping ----

# Set shipping options (options arrives as JSON string from browser)
def action_shipping_set(a):
    params = forward(a, ["listing"])
    options = a.input("options")
    if options != None:
        params["options"] = json.decode(options)
    s = market_stream(a, "shipping/set", params)
    if not s:
        return
    return {"data": s.read()}

# ---- Photos ----

# Upload a listing photo via stream to market-server
def action_photos_upload(a):
    file = a.file("file")
    if not file:
        a.error(400, "No file uploaded")
        return
    listing = a.input("listing")
    if not listing:
        a.error(400, "Listing required")
        return

    s = mochi.remote.stream(MARKET, "market", "photos/upload", {
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
        a.error(int(r.get("status", "500")) if r else 502, r.get("error", "Upload failed") if r else "No response")
        return
    return {"data": s.read()}

# List photos for a listing
def action_photos_list(a):
    s = market_stream(a, "photos/list", forward(a, ["listing"]))
    if not s:
        return
    return {"data": s.read()}

# Delete a photo
def action_photos_delete(a):
    s = market_stream(a, "photos/delete", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Reorder photos (ids arrives as JSON string from browser)
def action_photos_reorder(a):
    params = forward(a, ["listing"])
    ids = a.input("ids")
    if ids != None:
        params["ids"] = json.decode(ids)
    s = market_stream(a, "photos/reorder", params)
    if not s:
        return
    return {"data": s.read()}

# ---- Assets ----

# Upload a digital asset file via stream to market-server
def action_assets_upload(a):
    file = a.file("file")
    if not file:
        a.error(400, "No file uploaded")
        return
    listing = a.input("listing")
    if not listing:
        a.error(400, "Listing required")
        return

    s = mochi.remote.stream(MARKET, "market", "assets/upload", {
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
        a.error(int(r.get("status", "500")) if r else 502, r.get("error", "Upload failed") if r else "No response")
        return
    return {"data": s.read()}

# Add an external URL asset
def action_assets_external(a):
    s = market_stream(a, "assets/external", forward(a, ["listing", "filename", "mime", "reference"]))
    if not s:
        return
    return {"data": s.read()}

# Remove an asset
def action_assets_remove(a):
    s = market_stream(a, "assets/remove", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Reorder assets (ids arrives as JSON string from browser)
def action_assets_reorder(a):
    params = forward(a, ["listing"])
    ids = a.input("ids")
    if ids != None:
        params["ids"] = json.decode(ids)
    s = market_stream(a, "assets/reorder", params)
    if not s:
        return
    return {"data": s.read()}

# Download a digital asset (streams file from market-server to browser)
def action_assets_download(a):
    s = market_stream(a, "assets/download", forward(a, ["id"]))
    if not s:
        return
    metadata = s.read()
    if metadata.get("hosting") == "external":
        return {"data": metadata}
    # Mochi-hosted: pipe remaining stream (raw file bytes) to browser
    a.write_from_stream(s)

# ---- Auctions ----

# Get auction details for a listing
def action_auctions_get(a):
    s = market_stream(a, "auctions/get", forward(a, ["listing"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Bids ----

# Place a bid
def action_bids_place(a):
    s = market_stream(a, "bids/place", forward(a, ["auction", "amount", "ceiling"]))
    if not s:
        return
    return {"data": s.read()}

# Get own bids
def action_bids_mine(a):
    s = market_stream(a, "bids/mine", forward(a, ["status", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Orders ----

# Create an order
def action_orders_create(a):
    s = market_stream(a, "orders/create", forward(a, [
        "listing", "delivery", "option", "amount",
        "address_name", "address_line1", "address_line2", "address_city",
        "address_region", "address_postcode", "address_country"]))
    if not s:
        return
    return {"data": s.read()}

# Create an order from auction win
def action_orders_auction(a):
    s = market_stream(a, "orders/auction", forward(a, [
        "listing", "delivery", "option",
        "address_name", "address_line1", "address_line2", "address_city",
        "address_region", "address_postcode", "address_country"]))
    if not s:
        return
    return {"data": s.read()}

# Get purchases
def action_orders_purchases(a):
    s = market_stream(a, "orders/purchases", forward(a, ["status", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# Get sales
def action_orders_sales(a):
    s = market_stream(a, "orders/sales", forward(a, ["status", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# Get a single order
def action_orders_get(a):
    s = market_stream(a, "orders/get", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Mark order as shipped
def action_orders_ship(a):
    s = market_stream(a, "orders/ship", forward(a, ["id", "carrier", "tracking", "url"]))
    if not s:
        return
    return {"data": s.read()}

# Hand over digital order
def action_orders_handover(a):
    s = market_stream(a, "orders/handover", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Confirm order delivery
def action_orders_confirm(a):
    s = market_stream(a, "orders/confirm", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Refund an order
def action_orders_refund(a):
    s = market_stream(a, "orders/refund", forward(a, ["id", "reason", "description"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Subscriptions ----

# Create a subscription
def action_subscriptions_create(a):
    s = market_stream(a, "subscriptions/create", forward(a, ["listing"]))
    if not s:
        return
    return {"data": s.read()}

# Get own subscriptions
def action_subscriptions_mine(a):
    s = market_stream(a, "subscriptions/mine", forward(a, ["status", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# Get subscribers for a listing
def action_subscriptions_subscribers(a):
    s = market_stream(a, "subscriptions/subscribers", forward(a, ["listing", "status", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# Cancel a subscription
def action_subscriptions_cancel(a):
    s = market_stream(a, "subscriptions/cancel", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Pause a subscription
def action_subscriptions_pause(a):
    s = market_stream(a, "subscriptions/pause", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Resume a subscription
def action_subscriptions_resume(a):
    s = market_stream(a, "subscriptions/resume", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Threads ----

# Create a thread
def action_threads_create(a):
    s = market_stream(a, "threads/create", forward(a, ["listing"]))
    if not s:
        return
    return {"data": s.read()}

# Get own threads
def action_threads_mine(a):
    s = market_stream(a, "threads/mine", forward(a, ["role", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# Get a thread with messages
def action_threads_get(a):
    s = market_stream(a, "threads/get", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Messages ----

# Send a message
def action_messages_send(a):
    s = market_stream(a, "messages/send", forward(a, ["thread", "body"]))
    if not s:
        return
    return {"data": s.read()}

# Mark messages as read
def action_messages_read(a):
    s = market_stream(a, "messages/read", forward(a, ["thread"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Reviews ----

# Create a review
def action_reviews_create(a):
    s = market_stream(a, "reviews/create", forward(a, ["order", "rating", "text"]))
    if not s:
        return
    return {"data": s.read()}

# Respond to a review
def action_reviews_respond(a):
    s = market_stream(a, "reviews/respond", forward(a, ["id", "response"]))
    if not s:
        return
    return {"data": s.read()}

# Get reviews for an account
def action_reviews_account(a):
    s = market_stream(a, "reviews/account", forward(a, ["id", "role", "page", "limit"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Appeals ----

# Appeal a held or rejected listing
def action_listings_appeal(a):
    s = market_stream(a, "listings/appeal", forward(a, ["id", "reason"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Reports ----

# Create a report
def action_reports_create(a):
    s = market_stream(a, "reports/create", forward(a, ["target", "type", "reason", "details"]))
    if not s:
        return
    return {"data": s.read()}

# ---- Disputes ----

# Get dispute details
def action_disputes_get(a):
    s = market_stream(a, "disputes/get", forward(a, ["id"]))
    if not s:
        return
    return {"data": s.read()}

# Respond to a dispute
def action_disputes_respond(a):
    s = market_stream(a, "disputes/respond", forward(a, ["id", "body"]))
    if not s:
        return
    return {"data": s.read()}
