# Mochi Market: Stateless proxy to the Comptroller
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# Comptroller entity ID
COMPTROLLER = "1sfEACmTnQhBVgquGhaCs8Jw4SXKF9XY2apnUwJ63duq2QSxh5"

# Helper: send a notification through the user's notifications app.
# Mirrors apps/wikis/wikis.star and apps/forums/forums.star `notify()`.
# The topic-label key resolves to the per-locale string in
# apps/market/labels/<lang>.conf under `notifications.topic.<topic-with-dots>`
# so the notifications app can render the topic header in the user's language.
#
# Replication-safe per CLAUDE.md's "mochi.notification.send without an
# event_id" rule: callers pass `event_id` (a stable id derived from the
# source row UID, scoped by topic) so every replica delivering the same
# logical event coalesces on the same key and the recipient is notified
# only once.
def notify(topic, object="", title="", body="", url="", event_id=""):
    mochi.service.call("notifications", "send", topic, object, title, body, url, mochi.app.label("notifications.topic." + topic.replace("/", ".")), "", "", None, event_id)

# Read the status message from an open stream; error and return False if not 200.
# Resolve any ICU argument that is itself a label key.
#
# Keys are namespaced ("fields.address_city", "errors.x"), and no legitimate
# free-text argument starts with one of those prefixes, so the test is safe:
# a user-supplied string is passed through untouched.
_ARG_KEY_PREFIXES = ("fields.", "errors.", "labels.")

def _resolve_args(args):
    if type(args) != "dict":
        return {}
    out = {}
    for key, value in args.items():
        if type(value) == "string" and value.startswith(_ARG_KEY_PREFIXES):
            out[key] = mochi.app.label(value)
        else:
            out[key] = value
    return out


def _check_status(a, s, event):
    r = s.read()
    if not r:
        a.error.label(502, "errors.no_response_from_comptroller", event=event)
        return False
    # Skip P2P protocol ACK messages if present
    while r.get("type") == "ack":
        r = s.read()
        if not r:
            a.error.label(502, "errors.comptroller_timed_out", event=event)
            return False
    status = r.get("status", "500")
    if status != "200":
        # A malformed status from the Comptroller must fail as a clean 502,
        # not crash int() into a 500. isdigit() alone did not achieve that:
        # it accepts Unicode digit forms that int() rejects. Anything outside
        # the error range is not a status this can pass on either.
        status_string = str(status)
        code = int(status_string) if mochi.text.valid(status_string, "integer") else 502
        if code < 400 or code > 599:
            code = 502
        if "error" in r:
            # Comptroller returns a label key in "error" (resolved here in the
            # user's language) plus any ICU args in "args". An ARG can be a
            # label key too - a field name interpolated into
            # errors.field_too_long, say - and passing it through verbatim put
            # an English word inside an otherwise translated sentence. Resolve
            # anything that looks like a key; a plain value has no dot prefix
            # and is left alone.
            a.error.label(code, r["error"], **_resolve_args(r.get("args", {})))
        else:
            a.error.label(code, "errors.comptroller_request_failed", event=event)
        return False
    return True

# Open a P2P stream to the Comptroller, read the status message, and return the stream on success
def comptroller_stream(a, event, params):
    s = mochi.remote.stream(COMPTROLLER, "market", event, params)
    if not s:
        a.error.label(502, "errors.comptroller_is_not_available")
        return None
    if not _check_status(a, s, event):
        return None
    return s

# Open a P2P stream to the Comptroller, write raw upload data, then read the status message.
def comptroller_upload(a, event, params, data):
    s = mochi.remote.stream(COMPTROLLER, "market", event, params)
    if not s:
        a.error.label(502, "errors.comptroller_is_not_available")
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
        a.error.label(404, "errors.asset_unavailable", asset=asset)
        return None
    if not mochi.text.valid(entity_id, "entity") and not mochi.text.valid(entity_id, "fingerprint"):
        a.error.label(404, "errors.asset_unavailable", asset=asset)
        return None
    s = mochi.remote.stream(entity_id, service, asset, {})
    if not s:
        a.error.label(404, "errors.asset_unavailable", asset=asset)
        return None
    header = s.read()
    if not header or header.get("status") != "200":
        a.error.label(404, "errors.asset_not_set", asset=asset)
        return None
    a.header("Cache-Control", "public, max-age=300")
    if "data" in header:
        return {"data": header["data"]}
    a.header("Content-Type", header.get("content_type", "application/octet-stream"))
    # Bytes to relay per slot, matching what the people app accepts on upload.
    # Without a cap, a peer answering for a person can stream indefinitely through
    # this route, which is public. Only the three binary slots reach here - style
    # and information returned above as data - so an unrecognised slot falls back
    # to the largest of them rather than breaking a route that would otherwise work.
    caps = {"avatar": 2 * 1024 * 1024, "banner": 10 * 1024 * 1024, "favicon": 64 * 1024}
    a.write.stream(s, maximum=caps.get(asset, 10 * 1024 * 1024))
    return None

_PERSON_ASSETS = ("avatar", "banner", "favicon", "style", "information")

def action_user_asset(a):
    asset = a.input("asset")
    if asset not in _PERSON_ASSETS:
        a.error.label(404, "errors.unknown_asset")
        return
    return stream_asset(a, a.input("user") or "", "people", asset)

# ---- Accounts ----

# Get the caller's own account details. NOT public: anonymous requests to a
# public action are run by the core as the host owner, which would return the
# owner's full private account (Stripe id, address, onboarding). Requiring an
# app token means only a genuinely authenticated caller reaches this.
def action_accounts_get(a):
    return proxy(a, "accounts/get", forward(a, ["id"]))

# Public read of any account's public profile by id (seller profile pages,
# viewable anonymously). Whitelists fields so that even when the request runs
# as the owner and the requested id matches that owner — making the Comptroller
# return a full record — no private data (Stripe id, address, onboarding, VAT)
# is ever exposed.
def action_accounts_profile(a):
    id = a.input("id")
    if not id:
        a.error.label(400, "errors.account_id_required")
        return
    s = comptroller_stream(a, "accounts/get", {"id": id})
    if not s:
        return
    account = s.read() or {}
    return {"data": {
        "id": account.get("id"),
        "name": account.get("name"),
        "biography": account.get("biography"),
        "business": account.get("business"),
        "company": account.get("company"),
        "location": account.get("location"),
        "seller": account.get("seller"),
        "status": account.get("status"),
        "verified": account.get("verified"),
        "rating": account.get("rating"),
        "reviews": account.get("reviews"),
        "sales": account.get("sales"),
        "created": account.get("created"),
        "listings": account.get("listings"),
    }}

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
# navigate to. The raw off-origin URL stays as "url" for non-shell clients
# (Android opens it directly); web reaches it via the same-origin "redirect"
# path, since the shell won't send the top window to an off-origin URL.
def action_accounts_stripe_onboarding(a):
    result = proxy(a, "accounts/stripe/onboarding", forward(a, ["return_url"]))
    _attach_redirect(a, result, "url", "redirect")
    return result

# Receive Stripe's OAuth redirect and forward the code+state to the comptroller
# over P2P so the state lookup runs in the comptroller's own DB. The comptroller
# returns the URL the browser should land on next (success or error). This
# action is public so a logged-in session is not required to land here — the
# state row in the comptroller is the only thing that ties code to identity.
# Stripe redirects the top-level browser here, so a plain 302 escapes to the
# next URL without any iframe involved.
def action_stripe_oauth_callback(a):
    s = comptroller_stream(a, "accounts/stripe/oauth/exchange", forward(a, ["code", "state", "error", "error_description"]))
    if not s:
        return
    response = s.read() or {}
    a.redirect(_return_url_allowed(response.get("redirect_url", "")))

# Where the post-OAuth hop may land.
#
# The Comptroller already constrains this - accounts.star refuses a return_url
# that is not under https://mochi-os.org/ and substitutes the default - so the
# value arriving here is server-vetted. It is checked again anyway, for the
# same reason the redirector below states in its own comment: "server-vetted"
# should not mean "trusted verbatim", and this is the one redirect in the file
# that was taken at face value. Stripe sends the TOP window here, so a bad
# destination is a full-page navigation, not an iframe hop.
#
# The trailing slash is load-bearing: bare "https://mochi-os.org" also prefixes
# "https://mochi-os.org.evil.example/".
_RETURN_PREFIX = "https://mochi-os.org/"
_RETURN_DEFAULT = "https://mochi-os.org/market/account"

def _return_url_allowed(url):
    if type(url) != "string" or not url.startswith(_RETURN_PREFIX):
        return _RETURN_DEFAULT
    # Same host-confusion characters the Stripe redirector rejects: a
    # backslash acts as '/', and tab/newline/return are stripped before the
    # browser parses, so either can move the effective host.
    for bad in ["\\", " ", "\t", "\n", "\r"]:
        if bad in url:
            return _RETURN_DEFAULT
    return url


# Store a server-vetted off-origin url and return a same-origin path that
# redirects to it. The shell only lets the top window navigate to same-origin
# URLs (an app in the sandboxed iframe must not choose an off-origin
# destination), so external hops (Stripe checkout / onboarding) route through a
# row only this backend can create.
# Defence in depth on the redirect destination. Only this backend creates
# redirect rows, and their URLs come from the Comptroller — but "server-vetted"
# should not mean "trusted verbatim", so the redirector only ever sends the top
# window to an HTTPS Stripe URL. There is no URL API in Starlark, and browsers
# disagree with a naive parser on a few characters, which is how host-confusion
# bypasses arise:
#   - a backslash acts as '/', so https://evil.com\@checkout.stripe.com really
#     points at evil.com even though the text after '@' looks like the host;
#   - tab / newline / carriage return are stripped before parsing.
# Any of those is rejected outright, and the extracted host must be a plain
# hostname (no userinfo '@', percent-encoding, or other bytes), so none of these
# confusions can reach the suffix check.
_HOST_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789.-"
_DIGITS = "0123456789"

def _redirect_url_allowed(url):
    if type(url) != "string":
        return False
    for bad in ["\\", " ", "\t", "\n", "\r"]:
        if bad in url:
            return False
    if url[:8].lower() != "https://":
        return False
    authority = url[8:]
    for delimiter in ["/", "?", "#"]:
        cut = authority.find(delimiter)
        if cut >= 0:
            authority = authority[:cut]
    # No userinfo, ever, and check it BEFORE the port: 'stripe.com:443@evil.com'
    # is userinfo 'stripe.com:443' with host evil.com to a browser, so stripping
    # at the first colon first would validate the wrong side of the '@'.
    if "@" in authority:
        return False
    # Optional port, digits only.
    colon = authority.find(":")
    if colon >= 0:
        port = authority[colon + 1:]
        authority = authority[:colon]
        if port == "":
            return False
        for i in range(len(port)):
            if port[i] not in _DIGITS:
                return False
    host = authority.lower()
    if host == "":
        return False
    for i in range(len(host)):
        if host[i] not in _HOST_CHARS:
            return False
    return host == "stripe.com" or host.endswith(".stripe.com")

def stash_redirect(a, url):
    if not _redirect_url_allowed(url):
        mochi.log.debug("market: refusing to stash non-Stripe redirect url")
        return None
    id = mochi.uid()
    user = a.user.identity.id if a.user else ""
    current = mochi.time.now()
    # Bound the table — drop abandoned entries older than an hour regardless
    # of owner (a user who never returns would otherwise leave rows forever;
    # action_redirect re-checks the user on use).
    mochi.db.execute("delete from redirect where created < ?", current - 3600)
    mochi.db.execute("insert into redirect ( id, user, url, created ) values ( ?, ?, ?, ? )", id, user, url, current)
    # _shell=1 tells core to serve this action directly instead of wrapping it in
    # the menu shell. Without it a top-level navigation here loads the shell,
    # which runs the action inside the sandboxed iframe — the 302 then applies to
    # the iframe and Stripe's X-Frame-Options blanks it. Served directly, the 302
    # applies to the top window and the browser follows it out to Stripe.
    return "/market/-/redirect?id=" + id + "&_shell=1"

# Replace an off-origin url in a proxied response with a same-origin redirect
# path, keeping the original field for non-shell clients. A rejected destination
# leaves the field unset (the client falls back to the raw url for non-shell use).
def _attach_redirect(a, result, source, destination):
    if not result:
        return
    data = result.get("data")
    if type(data) != "dict":
        return
    url = data.get(source)
    if url:
        path = stash_redirect(a, url)
        if path:
            data[destination] = path

# One-shot same-origin redirect to a server-vetted external URL. Runs as a
# top-level navigation (the shell sent the top window here), so the 302 escapes
# to the external destination with no iframe/X-Frame-Options in the way.
def action_redirect(a):
    if not a.user:
        a.error.label(401, "errors.not_logged_in")
        return
    id = a.input("id", "")
    if not id:
        a.error.label(404, "errors.not_found")
        return
    row = mochi.db.row("select url from redirect where id = ? and user = ?", id, a.user.identity.id)
    if not row:
        a.error.label(404, "errors.not_found")
        return
    # Consume the row (one-shot) before deciding, then re-validate the stored URL
    # as a backstop — a stash-time reject means the row should never exist.
    mochi.db.execute("delete from redirect where id = ?", id)
    if not _redirect_url_allowed(row["url"]):
        a.error.label(404, "errors.not_found")
        return
    a.redirect(row["url"])

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
        # Tolerate a malformed tags payload rather than 500: json.decode raises
        # without the default arg, so decode with a None fallback and skip the
        # field if it is not valid JSON (optional metadata).
        decoded = json.decode(tags, None)
        if decoded != None:
            params["tags"] = decoded
    return proxy(a, "listings/create", params)

# Update a listing (tags arrives as JSON string from browser)
def action_listings_update(a):
    params = forward(a, [
        "id", "title", "description", "category", "condition", "type", "pricing",
        "price", "currency", "interval", "pickup", "shipping", "location",
        "information", "quantity"])
    tags = a.input("tags")
    if tags != None:
        # Tolerate a malformed tags payload rather than 500 (see listings/create).
        decoded = json.decode(tags, None)
        if decoded != None:
            params["tags"] = decoded
    return proxy(a, "listings/update", params)

# Delete a listing
def action_listings_delete(a):
    return proxy(a, "listings/delete", forward(a, ["id"]))

# Preview the side-effects of removing a listing (active auction / bidders /
# subscribers) so the UI can tailor the confirmation dialog.
# Reached via -/listings/removal/check; the underscore route stays as a
# deprecated alias for older clients. Deploy the Comptroller (which aliases
# the event name the same way) before or with this app.
def action_listings_removal_check(a):
    return proxy(a, "listings/removal/check", forward(a, ["id"]))

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
        "query", "category", "type", "condition", "pricing", "currency", "min", "max",
        "delivery", "location", "sort", "page", "limit"]))

# Authenticated search/get for logged-in viewers. The public actions above run
# anonymous requests as the host owner, so the comptroller's public events
# return no personalisation; these non-public actions forward the real caller
# and get my_order / my_reservation / my_subscription, plus the seller-only
# fields on the caller's own listings.
def action_listings_viewer_search(a):
    return proxy(a, "listings/viewer/search", forward(a, [
        "query", "category", "type", "condition", "pricing", "currency", "min", "max",
        "delivery", "location", "sort", "page", "limit"]))

def action_listings_viewer_get(a):
    return proxy(a, "listings/viewer/get", forward(a, ["id"]))

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
        a.error.label(400, "errors.no_file_uploaded")
        return
    listing = a.input("listing")
    if not listing:
        a.error.label(400, "errors.listing_required")
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
        # Decode with a None fallback so a malformed payload is a clean 400, not
        # a 500 (json.decode raises without the default arg).
        decoded = json.decode(ids, None)
        if decoded == None:
            a.error.label(400, "errors.photo_ids_required_as_list")
            return
        params["ids"] = decoded
    return proxy(a, "photos/reorder", params)

# Stream a photo from the Comptroller via P2P. The browser hits the local
# Mochi server, which proxies to the Comptroller — never crosses origin. Public
# variants serve publicly-visible listings' photos (used by <img> tags and
# anonymous browsing).
def action_photo_get(a):
    return _proxy_photo(a, "")

def action_photo_thumbnail(a):
    return _proxy_photo(a, "thumbnail")

def action_photo_preview(a):
    return _proxy_photo(a, "preview")

# Authenticated variants for the seller's editor (and staff). These reach the
# Comptroller's owned photo events, which grant the owner/staff visibility of
# draft and moderation-held listings the public route hides. Non-public actions,
# so an anonymous caller is rejected before the proxy and the forwarded identity
# is the real user, never the substituted host owner. An <img> can't send the
# app JWT, so the editor fetches these as blobs.
def action_photo_owned_get(a):
    return _proxy_photo(a, "", "photos/owned/get", "private, max-age=60")

def action_photo_owned_thumbnail(a):
    return _proxy_photo(a, "thumbnail", "photos/owned/get", "private, max-age=60")

def action_photo_owned_preview(a):
    return _proxy_photo(a, "preview", "photos/owned/get", "private, max-age=60")

def action_photos_owned_list(a):
    return proxy(a, "photos/owned/list", forward(a, ["listing"]))

def _proxy_photo(a, variant, event="photos/get", cache="public, max-age=86400"):
    photo_id = a.input("id")
    if not photo_id:
        a.error.label(400, "errors.photo_id_required")
        return
    # The thumbnail flag mirrors the variant for Comptroller versions that
    # predate the variant field.
    s = comptroller_stream(a, event, {"id": photo_id, "variant": variant, "thumbnail": variant == "thumbnail"})
    if not s:
        return
    metadata = s.read() or {}
    a.header("Cache-Control", cache)
    a.header("Content-Type", metadata.get("content_type", "application/octet-stream"))
    # Bounded for the same reason stream_asset is: this route is public, and
    # without a cap a peer answering for a listing can stream through it
    # indefinitely. 10MB matches the largest slot stream_asset accepts and is
    # far above any listing photo, which arrives through the ~10MB multipart
    # upload path in the first place.
    a.write.stream(s, maximum=10 * 1024 * 1024)

# ---- Assets ----

# Upload a digital asset file via stream to Comptroller
def action_assets_upload(a):
    file = a.file("file")
    if not file:
        a.error.label(400, "errors.no_file_uploaded")
        return
    listing = a.input("listing")
    if not listing:
        a.error.label(400, "errors.listing_required")
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
        # Decode with a None fallback so a malformed payload is a clean 400, not
        # a 500 (json.decode raises without the default arg).
        decoded = json.decode(ids, None)
        if decoded == None:
            a.error.label(400, "errors.asset_ids_required_as_list")
            return
        params["ids"] = decoded
    return proxy(a, "assets/reorder", params)

# Download a digital asset (streams file from Comptroller to browser)
def action_assets_download(a):
    s = comptroller_stream(a, "assets/download", forward(a, ["id"]))
    if not s:
        return
    metadata = s.read() or {}
    if metadata.get("hosting") == "external":
        return {"data": metadata}
    # Mochi-hosted: set headers and pipe file bytes to browser
    asset = metadata.get("asset", {})
    if asset.get("mime"):
        a.header("Content-Type", asset["mime"])
    if asset.get("filename"):
        # The filename is seller-chosen: strip quotes and CR/LF so it can't
        # smuggle extra Content-Disposition parameters (e.g. a second
        # filename= spoofing the name the buyer's browser shows).
        filename = asset["filename"].replace('"', "").replace("\r", "").replace("\n", "")
        if filename:
            a.header("Content-Disposition", 'attachment; filename="' + filename + '"')
    # A purchased digital asset is larger than a photo but still bounded: it
    # was uploaded through the multipart path, so 100MB is generous headroom
    # rather than a limit anyone reaches. The point is that an uncapped relay
    # lets a hostile or broken peer stream without end into a buyer's request.
    a.write.stream(s, maximum=100 * 1024 * 1024)

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
    result = proxy(a, "orders/create", forward(a, [
        "listing", "delivery", "option", "amount",
        "address_name", "address_line1", "address_line2", "address_city",
        "address_region", "address_postcode", "address_country",
        "success_url", "cancel_url", "client_platform"]))
    _attach_redirect(a, result, "checkout_url", "checkout")
    return result

# Create an order from auction win
def action_orders_auction(a):
    result = proxy(a, "orders/auction", forward(a, [
        "listing", "delivery", "option",
        "address_name", "address_line1", "address_line2", "address_city",
        "address_region", "address_postcode", "address_country",
        "success_url", "cancel_url", "client_platform"]))
    _attach_redirect(a, result, "checkout_url", "checkout")
    return result

# Get purchases
def action_orders_purchases(a):
    return proxy(a, "orders/purchases", forward(a, ["status", "page", "limit"]))

# Get sales
def action_orders_sales(a):
    return proxy(a, "orders/sales", forward(a, ["status", "page", "limit"]))

# Get a single order
def action_orders_get(a):
    return proxy(a, "orders/get", forward(a, ["id"]))

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

# Buyer cancels an in-progress checkout ("I changed my mind"), clearing the
# reservation so the listing offers Buy now again
def action_reservations_cancel(a):
    return proxy(a, "reservations/cancel", forward(a, ["listing"]))

# ---- Subscriptions ----

# Create a subscription
def action_subscriptions_create(a):
    result = proxy(a, "subscriptions/create", forward(a, ["listing", "success_url", "cancel_url", "client_platform"]))
    _attach_redirect(a, result, "checkout_url", "checkout")
    return result

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

# ---- Saved listings ----
#
# Unlike listings/orders/accounts (which are shared marketplace state owned by
# the Comptroller), a user's saved listings are private per-user data. They live
# in this app's own per-user database on the user's own Mochi node, so they
# persist across reloads and logout and — via Mochi's per-app replication —
# sync across the user's devices. Identity comes from a.user.identity.id; the
# Comptroller is never consulted for saved state.
#
# Each row stores a JSON snapshot of the Listing (the same object the browser
# already renders) so the saved page renders in one query without fanning out
# to the Comptroller for every item.

# List the current user's saved listings, most recently saved first.
def action_saved_list(a):
    if not a.user:
        a.error.label(401, "errors.not_logged_in")
        return
    user_id = a.user.identity.id
    rows = mochi.db.rows("select data from saved where user=? order by created desc", user_id)
    listings = []
    for r in rows:
        item = json.decode(r["data"], None)
        if item:
            listings.append(item)
    return {"data": {"saved": listings, "total": len(listings)}}

# Save a listing (idempotent). `listing` is the comptroller listing uid; `data`
# is the JSON snapshot of the Listing object to render later. Re-saving refreshes
# the stored snapshot.
def action_saved_add(a):
    if not a.user:
        a.error.label(401, "errors.not_logged_in")
        return
    user_id = a.user.identity.id
    listing_id = _saved_listing_id(a)
    if listing_id == None:
        return
    data = a.input("data")
    if not data:
        a.error.label(400, "errors.invalid_saved_data")
        return
    # A saved snapshot is one listing card's fields; 64 KB is far above any
    # legitimate size and stops junk rows growing to the body cap (the saved
    # table replicates across the user's devices).
    if len(data) > 65536:
        a.error.label(400, "errors.field_too_long", field=mochi.app.label("fields.data"), maximum=65536)
        return
    # Validate the snapshot is decodable JSON before persisting. Decode with a
    # None fallback so a malformed payload is a clean 400, not a 500 (json.decode
    # raises without the default arg).
    if json.decode(data, None) == None:
        a.error.label(400, "errors.invalid_saved_data")
        return
    existing = mochi.db.row("select id from saved where user=? and listing=?", user_id, listing_id)
    if existing:
        mochi.db.execute("update saved set data=? where id=?", data, existing["id"])
    else:
        mochi.db.execute(
            "insert or ignore into saved ( id, user, listing, data, created ) values ( ?, ?, ?, ?, ? )",
            mochi.uid(), user_id, listing_id, data, mochi.time.now())
    return {"data": {"saved": True}}

# Remove a saved listing.
def action_saved_remove(a):
    if not a.user:
        a.error.label(401, "errors.not_logged_in")
        return
    user_id = a.user.identity.id
    listing_id = _saved_listing_id(a)
    if listing_id == None:
        return
    mochi.db.execute("delete from saved where user=? and listing=?", user_id, listing_id)
    return {"data": {"saved": False}}

# Remove all of the current user's saved listings.
def action_saved_clear(a):
    if not a.user:
        a.error.label(401, "errors.not_logged_in")
        return
    mochi.db.execute("delete from saved where user=?", a.user.identity.id)
    return {"data": {"saved": True}}

# Parse and validate the `listing` input. Listing ids are opaque comptroller
# uids (strings), so accept any non-empty value and normalise it to a string
# (the client may send it as a JSON string or number). Emits the error and
# returns None on failure so callers can `if id == None: return`.
def _saved_listing_id(a):
    raw = a.input("listing")
    if raw == None or raw == "":
        a.error.label(400, "errors.listing_required")
        return None
    listing_id = str(raw)
    if listing_id == "":
        a.error.label(400, "errors.listing_required")
        return None
    # Listing ids are mochi.uid() text (~50 chars); anything longer is junk
    # that would only bloat the replicated saved table.
    if len(listing_id) > 100:
        a.error.label(400, "errors.field_too_long", field="Listing", maximum=100)
        return None
    return listing_id

# Receive notification from Comptroller. The server tags each event with a
# topic (message / order/seller / order/buyer / auction/ended / etc.) so users
# can route each category to a different destination. The Comptroller is the
# authoritative source for buyer/seller/staff identity and order/dispute/review
# state, so all market-app counterparty notifications originate there and arrive
# here as P2P `message_notify` events — this handler turns them into local
# user-facing notifications via the notifications service.
#
# Market topics are class-level — the Comptroller's per-order/-chargeback/
# -subscription synthetic IDs are intentionally dropped here so the user's
# notifications-prefs page shows one row per topic rather than one row per
# transient entity. Localisation: newer Comptroller builds send
# `title_key`/`body_key`/`args` (ICU MessageFormat substitutions) instead of
# pre-rendered English. The receiver's market app resolves those keys against
# apps/market/labels/<lang>.conf in the recipient user's language. Older
# Comptroller versions still in flight may send the literal `title`/`body`
# fields — the fallback below keeps them working unchanged until every
# Comptroller node has caught up.
def event_message_notify(e):
    if e.header("from") != COMPTROLLER:
        return
    topic = e.content("topic")
    url = e.content("url")
    if not topic or not url:
        return
    thread = e.content("thread") or ""
    object = e.content("object") or ""

    title_key = e.content("title_key")
    body_key = e.content("body_key")
    if title_key and body_key:
        args = e.content("args") or {}
        if type(args) != "dict":
            args = {}
        title = mochi.app.label(title_key, **args)
        body = mochi.app.label(body_key, **args)
    else:
        # Backward-compat: pre-i18n Comptroller sent literal English strings.
        title = e.content("title") or ""
        body = e.content("body") or ""

    if not title:
        return
    # Stable event id: topic + source object + thread + url. The Comptroller
    # forwards the same logical notification to every replica of the user;
    # without this, each replica would fire its own push/email/web alert.
    # `object` (e.g. "auction-123") distinguishes notifications that share a
    # topic and url — without it, being outbid on two auctions would collide
    # on the same event_id and the second alert would be dropped.
    event_id = topic + ":" + object + ":" + (str(thread) if thread else "") + ":" + url
    notify(topic, "", title, body, url, event_id=event_id)
    if thread:
        mochi.websocket.write("market-thread-" + str(thread), {"event": "message"})

# ---- Database ----
#
# This app is otherwise a stateless proxy to the Comptroller; the only local
# state is each user's private saved-listings list (see the "Saved listings"
# section above). The table is keyed by user identity and replicates across the
# user's own nodes by Mochi's default per-app replication.

def database_upgrade(version):
    if version == 2:
        # Drop the pre-2026-07 broadcast tables left in the app data DB when
        # broadcast state moved to the per-app system DB - inert, but stale
        # sequence/log copies mislead diagnosis.
        for table in ["sequence", "log", "acknowledged", "received"]:
            mochi.db.execute("drop table if exists " + table)
    if version == 3:
        _create_redirect_table()
    if version == 4:
        # saved_user is a left prefix of saved_user_created — redundant.
        mochi.db.execute("drop index if exists saved_user")

def _create_redirect_table():
    # One-shot store for server-vetted external URLs the browser is sent to via a
    # same-origin redirect (Stripe checkout / onboarding). The shell only lets the
    # top window navigate to same-origin URLs, so an off-origin destination must
    # be reached through a row here that only this app's backend can create.
    mochi.db.execute("create table if not exists redirect ( id text not null primary key, user text not null, url text not null, created integer not null )")
    mochi.db.execute("create index if not exists redirect_created on redirect( created )")

def database_create():
    mochi.db.execute("create table if not exists saved ( id text not null primary key, user text not null, listing text not null, data text not null default '', created integer not null, unique ( user, listing ) )")
    mochi.db.execute("create index if not exists saved_user_created on saved( user, created )")
    _create_redirect_table()

