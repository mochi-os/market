# Mochi Market: Stateless proxy to the Comptroller
# Copyright © 2026 Mochisoft OÜ
# SPDX-License-Identifier: AGPL-3.0-only
# This file is part of Mochi, licensed under the GNU AGPL v3 with the
# Mochi Application Interface Exception - see license.txt and license-exception.md.

# Comptroller entity ID. A self-hosted instance that runs its own marketplace
# edits this.
COMPTROLLER = "1sfEACmTnQhBVgquGhaCs8Jw4SXKF9XY2apnUwJ63duq2QSxh5"

# Send a notification through the user's notifications app (mirrors forums/wikis
# notify()). Callers pass a stable `event_id` so retried deliveries of the same
# event coalesce.
def notify(topic, object="", title="", body="", url="", event_id=""):
    mochi.service.call("notifications", "send", topic, object, title, body, url, mochi.app.label("notifications.topic." + topic.replace("/", ".")), "", "", None, event_id)

# Resolve ICU arguments that are themselves label keys. Free-text arguments
# never start with these prefixes, so user-supplied values pass through
# untouched.
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
        code = _status_code(status)
        if r.get("transport"):
            # core's own error segment: its "error" is prose, not a label key.
            mochi.log.info("Comptroller %s failed before answering: %s", event, r.get("error", ""))
            a.error.label(_status_code(r.get("code", code)), "errors.comptroller_request_failed", event=event)
        elif "error" in r:
            # Comptroller errors carry a label key plus ICU args; an arg may
            # itself be a label key (a field name), so resolve those too.
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

# The Comptroller's answer to `event`, or None when it is unreachable or
# refuses: for a caller with a fallback of its own, so a failure is logged
# rather than answered to the browser as comptroller_stream does.
def comptroller_ask(event, params):
    s = mochi.remote.stream(COMPTROLLER, "market", event, params)
    if not s:
        return None
    r = s.read()
    # Skip P2P protocol ACK messages if present
    while r and r.get("type") == "ack":
        r = s.read()
    if not r or r.get("status", "500") != "200":
        mochi.log.debug("Comptroller %s did not answer: %s", event, r.get("error", "") if r else "no response")
        return None
    answer = s.read()
    # A 200 status frame followed by core's error segment is a failed request.
    if type(answer) == "dict" and answer.get("transport"):
        mochi.log.debug("Comptroller %s failed after its status frame: %s", event, answer.get("error", ""))
        return None
    return answer

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
    payload = s.read()
    # core answers a handler that failed mid-stream with an error segment
    # AFTER whatever the handler already wrote, so a 200 status frame can be
    # followed by the error rather than the payload. That is a failed request,
    # not data for the browser.
    if type(payload) == "dict" and payload.get("transport"):
        mochi.log.info("Comptroller %s failed after its status frame: %s", event, payload.get("error", ""))
        a.error.label(_status_code(payload.get("code", "500")), "errors.comptroller_request_failed", event=event)
        return
    return {"data": disputes_resolve(payload)}

# An error status the Comptroller or core sent, as an HTTP code this app can
# answer with. A malformed one must fail as a clean 502, not crash int() into
# a 500: isdigit() alone accepts Unicode digit forms that int() rejects, and
# anything outside the error range is not a status this can pass on either.
def _status_code(status):
    status_string = str(status)
    code = int(status_string) if mochi.text.valid(status_string, "integer") else 502
    if code < 400 or code > 599:
        code = 502
    return code

# The Comptroller stores a dispute's resolution as a label key when it wrote
# the outcome itself (a seller refund, a Stripe ruling), so every viewer reads
# it in their own language rather than in whichever English the handler had.
# Staff-written free text carries no prefix and passes through untouched.
def disputes_resolve(data):
    if type(data) != "dict":
        return data
    for key in ("dispute", "disputes"):
        value = data.get(key)
        rows = value if type(value) == "list" else ([value] if type(value) == "dict" else [])
        for row in rows:
            resolution = row.get("resolution", "")
            if type(resolution) == "string" and resolution.startswith("labels."):
                row["resolution"] = mochi.app.label(resolution)
    return data

# ---- Person asset proxy (avatar, banner, favicon, style) ----

# Image types a person slot may hold, mirroring the people app's own list
# (people.star). An explicit list rather than an "image/" prefix test, because
# the prefix admits any subtype a client cares to invent. SVG is allowed: core
# sanitises it and serves it under a script-blocking CSP.
_PERSON_IMAGE_TYPES = (
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/svg+xml",
    "image/x-icon",
    "image/vnd.microsoft.icon",
)

# Stream an entity's asset from its owning service; mochi.remote.stream() loops back in-process
# for local entities. Not throttled per caller: core's per-IP rate limit already
# bounds this public route.
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
    # The content type is the remote host's claim, and the person entity may be
    # hosted on a server this operator does not control - on a public route.
    # Anything not a known image type is served as an opaque download, as
    # people.star does. Core's a.write.stream already forces an attachment
    # disposition for non-media, so this is the layer above that, not the only one.
    content_type = header.get("content_type", "")
    if content_type not in _PERSON_IMAGE_TYPES:
        content_type = "application/octet-stream"
    a.header("Content-Type", content_type)
    # Per-slot byte caps matching what the people app accepts on upload; the
    # route is public, so an uncapped stream could run indefinitely. Unknown
    # slots fall back to the largest cap.
    caps = {"avatar": 2 * 1024 * 1024, "banner": 10 * 1024 * 1024, "favicon": 64 * 1024}
    a.write.stream(s, maximum=caps.get(asset, 10 * 1024 * 1024))
    return None

# `information` is deliberately absent. It carries the person's own privacy
# setting - people.star rebuilds the dict without it on its own public route for
# exactly that reason - and no client here asks for it: this app's SPA uses only
# avatar and style. A public route should not relay a payload built for a
# different audience.
_PERSON_ASSETS = ("avatar", "banner", "favicon", "style")

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

# Public profile read. Whitelist fields: an anonymous request runs as the host
# owner, and a lookup of the owner's own id would return the full private
# record.
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
    result = proxy(a, "accounts/stripe/onboarding", forward(a, ["return_url", "client_platform"]))
    _attach_redirect(a, result, "url", "redirect")
    return result

# The app half of an app-platform ceremony: the Comptroller's redirect, where
# Stripe returns the browser, handed its code and state to the app scheme, and
# the app presents them here with its own token, so the Comptroller sees the
# seller as the signed sender.
def action_accounts_stripe_oauth_complete(a):
    return proxy(a, "accounts/stripe/oauth/exchange", forward(a, ["code", "state", "error", "error_description"]))

# Redirect rows: the shell only lets the top window navigate same-origin, so
# off-origin Stripe hops go through a same-origin path backed by a row only this
# backend creates. _redirect_url_allowed accepts only an HTTPS stripe.com host;
# backslash acts as '/' and tab/newline/return are stripped by browsers, so all
# are rejected.
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
    # Core serves /-/redirect top-level (the shell's resource exemption), so
    # the 302 escapes the sandboxed iframe that Stripe refuses to be framed in.
    return "/market/-/redirect?id=" + id

_UNRESERVED = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
_HEX = "0123456789ABCDEF"

# Percent-encode every byte outside the RFC 3986 unreserved set, so a value
# survives a query string or an RFC 5987 header parameter unchanged.
def _percent_encode(value):
    out = ""
    for byte in str(value).elem_ords():
        character = chr(byte)
        if byte < 128 and character in _UNRESERVED:
            out += character
        else:
            out += "%" + _HEX[byte // 16] + _HEX[byte % 16]
    return out

# Content-Disposition for a seller-chosen filename. HTTP/1 headers carry only
# ASCII, so the quoted form holds an ASCII fallback and filename* carries the
# real name percent-encoded as UTF-8 (RFC 5987), which browsers prefer. Quotes,
# backslashes and CR/LF are stripped from the fallback: any of them would let
# the name smuggle a second parameter or end the quoted string early.
def _content_disposition(filename):
    ascii = ""
    for byte in filename.elem_ords():
        if byte >= 32 and byte < 127 and chr(byte) not in '"\\':
            ascii += chr(byte)
    if not ascii and not filename:
        return ""
    return 'attachment; filename="' + (ascii or "download") + "\"; filename*=UTF-8''" + _percent_encode(filename)

# Replace an off-origin url in a proxied response with a same-origin redirect
# path. Web navigates to the vetted path; the raw url stays for non-shell
# clients, which open it directly. A url the allowlist rejects is cleared from
# both fields: a client opening it directly has no allowlist of its own, and an
# Android CustomTabsIntent degrades to ACTION_VIEW, which would hand a non-http
# scheme to whatever app claims it.
def _attach_redirect(a, result, source, destination):
    if not result:
        return
    data = result.get("data")
    if type(data) != "dict":
        return
    url = data.get(source)
    if not url:
        return
    path = stash_redirect(a, url)
    if not path:
        data[source] = ""
        return
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

# Delete a listing, and its copies on other networks with it
def action_listings_delete(a):
    result = proxy(a, "listings/delete", forward(a, ["id"]))
    if result:
        publish_listing_delete(str(a.input("id", "")))
    return result

# Preview the side-effects of removing a listing so the confirmation dialog can
# adapt.
def action_listings_removal_check(a):
    return proxy(a, "listings/removal/check", forward(a, ["id"]))

# Publish a listing: live on the market, and on the seller's accounts on other
# networks, those it names for itself or else the seller's list
def action_listings_publish(a):
    accounts, ok = publish_ids(a.input("accounts"))
    if not ok:
        a.error.label(400, "errors.invalid_accounts")
        return
    result = proxy(a, "listings/publish", forward(a, [
        "id", "reserve", "instant", "opens", "closes", "extend", "extension"]))
    if result:
        publish_listing(result["data"], accounts)
    return result

# Relist: duplicate a listing as a new draft
def action_listings_relist(a):
    return proxy(a, "listings/relist", forward(a, ["id"]))

# Search listings
def action_listings_search(a):
    return proxy(a, "listings/search", forward(a, [
        "query", "category", "type", "condition", "pricing", "currency", "min", "max",
        "delivery", "location", "sort", "page", "limit"]))

# Authenticated variants: anonymous requests to public actions run as the host
# owner, so only these return personalisation (my_order / my_reservation /
# my_subscription, seller-only fields).
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
    result = {"data": s.read()}
    publish_listing_refresh(str(listing))
    return result

# List photos for a listing
def action_photos_list(a):
    return proxy(a, "photos/list", forward(a, ["listing"]))

# Delete a photo; the listing it belonged to, where the client names it, has
# its copies on other networks brought up to date
def action_photos_delete(a):
    result = proxy(a, "photos/delete", forward(a, ["id"]))
    if result and a.input("listing"):
        publish_listing_refresh(str(a.input("listing")))
    return result

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
    result = proxy(a, "photos/reorder", params)
    if result:
        publish_listing_refresh(str(a.input("listing", "")))
    return result

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

# Authenticated variants for the seller's editor and staff: the owned photo
# events show draft and moderation-held listings. An <img> cannot send the app
# JWT, so the editor fetches these as blobs.
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
    # Public route: bound the stream so a peer cannot send indefinitely. 10MB
    # matches stream_asset's largest slot and is far above any listing photo.
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
        disposition = _content_disposition(asset["filename"])
        if disposition:
            a.header("Content-Disposition", disposition)
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
    return proxy(a, "reports/create", forward(a, ["target", "type", "reason", "details", "thread"]))

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

# ---- Saved listings ---- The only per-user state in this app: rows in its own
# database keyed by a.user.identity.id, each holding a JSON snapshot of the
# Listing so the saved page renders in one query.

# List the current user's saved listings, most recently saved first.
def action_saved_list(a):
    if not a.user:
        a.error.label(401, "errors.not_logged_in")
        return
    user_id = a.user.identity.id
    rows = mochi.db.rows("select listing, data from saved where user=? order by created desc", user_id)
    current = saved_current([r["listing"] for r in rows])
    listings = []
    for r in rows:
        if current == None:
            item = json.decode(r["data"], None)
        else:
            # A listing the Comptroller no longer shows (removed, held by
            # moderation, its seller suspended) is left out but its row kept,
            # so it comes back if a hold is lifted.
            item = current.get(r["listing"])
        if item:
            listings.append(item)
    return {"data": {"saved": listings, "total": len(listings)}}

# The current card of each saved listing the caller can still open, by id, or
# None when the Comptroller cannot say - unreachable, or older than the batch
# event - so the snapshots stored at save time stand in.
def saved_current(ids):
    current = {}
    for start in range(0, len(ids), 100):
        answer = comptroller_ask("listings/viewer/batch", {"ids": ids[start:start + 100]})
        if type(answer) != "dict":
            return None
        for listing in answer.get("listings") or []:
            current[str(listing["id"])] = listing
    return current

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
        a.error.label(400, "errors.field_too_long", field=mochi.app.label("fields.listing"), maximum=100)
        return None
    return listing_id

# Notifications from the Comptroller arrive as `message_notify` events. Topics
# are class-level: per-object synthetic ids are dropped so the preferences page
# shows one row per topic. Newer Comptrollers send title_key/body_key/args
# (resolved against this app's labels); older ones send literal title/body.
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
    # Stable event id so the same notification delivered twice coalesces;
    # `object` (e.g. "auction-123") keeps two auctions sharing a topic and url
    # apart.
    event_id = topic + ":" + object + ":" + (str(thread) if thread else "") + ":" + url
    notify(topic, "", title, body, url, event_id=event_id)
    # A listing approved after a hold has become visible: one waiting to be
    # published on other networks is published now.
    if topic == "listing/moderation":
        publish_listing_pending(url)
    if thread:
        mochi.websocket.write("market-thread-" + str(thread), {"event": "message"})

# ---- Database ---- The saved table is the only local state; everything else
# proxies to the Comptroller.

def database_upgrade(version):
    if version == 2:
        # Drop the broadcast tables left in the app data DB when broadcast state
        # moved to the per-app system DB - stale copies mislead diagnosis.
        for table in ["sequence", "log", "acknowledged", "received"]:
            mochi.db.execute("drop table if exists " + table)
    if version == 3:
        _create_redirect_table()
    if version == 4:
        # saved_user is a left prefix of saved_user_created — redundant.
        mochi.db.execute("drop index if exists saved_user")
    if version == 5:
        # Where the seller's listings are published on other networks, and the
        # copy of each listing there (the federation plan, phase 30).
        publish_schema_create()

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
    publish_schema_create()


# ---- Publishing (the federation plan, phase 30) ----
#
# A seller's listings are published, as they go live, to a list of the
# seller's accounts on other networks, empty by default, as a feed does its
# posts: linked Mastodon and Bluesky accounts, and hosted fediverse and Bluesky
# ones. A listing is a post with its title, price, description and first photo
# and a link to its page here. The listing itself lives in the Comptroller, so
# nothing of it is kept here but the copies' ids, kept per listing and account
# so a change to its photos and its deletion follow them (decision 25); a copy asked
# for by another server is built from the listing as the Comptroller holds it
# now, and is gone once the listing is no longer for sale there, sold, ended or
# removed. A listing may name its own accounts as it is published, overriding
# the list. Only a listing anyone may see is published: live, and not held by
# moderation; one held is published when the Comptroller tells the seller it
# has been approved.

PUBLISH_TYPES = ["mastodon", "bluesky"]
HOSTED_TYPES = ["fediverse", "bluesky"]

# What a Mastodon server takes when its limits were not read at the link, what
# Bluesky's post record takes, and the largest photo either is given: Bluesky's
# limit for an image.
MASTODON_CHARACTERS = 500
BLUESKY_CHARACTERS = 300
PHOTO_BYTES = 1000000

# The moderation states of a live listing anyone may see, as the Comptroller's
# search reads them.
VISIBLE_MODERATION = ["approved", "review", "manual"]

# How each currency the Comptroller takes is written, as its own amounts are.
CURRENCY_SYMBOLS = {"gbp": "\u00a3", "usd": "$", "eur": "\u20ac", "jpy": "\u00a5"}
CURRENCY_DECIMALS = {"gbp": 2, "usd": 2, "eur": 2, "jpy": 0}

def publish_schema_create():
    mochi.db.execute("create table if not exists publish ( account text not null primary key, created integer not null )")
    # A listing published while moderation holds it from view, with the
    # accounts it named ('' for the list).
    mochi.db.execute("create table if not exists pending ( listing text not null primary key, accounts text not null default '', created integer not null )")
    mochi.db.execute("create table if not exists copies ( listing text not null, account text not null, address text not null, network text not null, remote text not null, url text not null default '', created integer not null, primary key ( listing, account ) )")
    mochi.db.execute("create index if not exists copies_remote on copies( account, remote )")

def publishable(acc):
    """Whether listings may be published to an account: a linked account on a
    network that takes posts, or a hosted fediverse or Bluesky account."""
    if acc.get("hosted"):
        return acc.get("type") in HOSTED_TYPES
    return acc.get("type") in PUBLISH_TYPES

def publish_accounts():
    return [acc for acc in (mochi.account.list() or []) if publishable(acc)]

def publish_account(id):
    if not id or type(id) != "string":
        return None
    acc = mochi.account.get(id)
    if not acc or not publishable(acc):
        return None
    return acc

def account_present(acc):
    return {"id": acc["id"], "type": acc["type"], "identifier": acc.get("identifier", ""), "name": acc.get("name") or acc.get("label") or "", "hosted": bool(acc.get("hosted"))}

def publish_list():
    return [row["account"] for row in mochi.db.rows("select account from publish order by created")]

def publish_counts():
    counts = {}
    for row in mochi.db.rows("select account, count(*) as n from copies group by account"):
        counts[row["account"]] = row["n"]
    return counts

# publish_ids(value) -> (list or None, ok): the accounts a listing names for
# itself as it is published, as JSON text; None where it leaves them to the
# seller's list.
def publish_ids(value):
    if value == None or value == "":
        return (None, True)
    decoded = json.decode(value, None) if type(value) == "string" else value
    if type(decoded) not in ("list", "tuple") or len(decoded) > 20:
        return (None, False)
    ids = []
    for id in decoded:
        if not publish_account(id):
            return (None, False)
        if id not in ids:
            ids.append(id)
    return (ids, True)

def listing_visible(listing):
    """Whether anyone may see a listing on the market: live, and not held."""
    return type(listing) == "dict" and listing.get("status") == "active" and listing.get("moderation", "approved") in VISIBLE_MODERATION

# ---- What a listing becomes ----

def listing_link(listing):
    """The listing's page here, or "" where the server has no address."""
    base = mochi.server.url()
    if not base:
        return ""
    return base + "/market/listings/" + str(listing.get("id", ""))

def listing_price(listing):
    """The listing's price as the market writes it, or "" for one with none."""
    currency = str(listing.get("currency", "") or "").lower()
    price = listing.get("price")
    if type(price) != "int" or price <= 0 or not currency:
        return ""
    symbol = CURRENCY_SYMBOLS.get(currency, "")
    decimals = CURRENCY_DECIMALS.get(currency, 2)
    if decimals == 0:
        amount = str(price)
    else:
        factor = {1: 10, 2: 100, 3: 1000}.get(decimals, 100)
        fraction = str(price % factor)
        amount = str(price // factor) + "." + "0" * (decimals - len(fraction)) + fraction
    return (symbol + amount) if symbol else (amount + " " + currency.upper())

def text_cut(s, n):
    """s within n codepoints, an ellipsis marking a cut."""
    points = list(s.codepoints())
    if len(points) <= n:
        return s
    return "".join(points[:max(n - 1, 0)]).rstrip() + "\u2026"

def listing_text(listing, limit):
    """A listing as a post within limit: its title and price, the start of its
    description, and its link, which is kept whole."""
    link = listing_link(listing)
    tail = ("\n\n" + link) if link else ""
    head = str(listing.get("title", "") or "")
    price = listing_price(listing)
    if price:
        head += "\n" + price
    description = str(listing.get("description", "") or "").strip()
    text = head + ("\n\n" + description if description else "")
    return text_cut(text, max(limit - len(list(tail.codepoints())), 1)) + tail

def fediverse_plain(text):
    """Plain text as markdown that renders to the same text."""
    lines = []
    for line in text.split("\n"):
        for mark in ["\\", "*", "_", "[", "]", "`", "#", ">", "~"]:
            line = line.replace(mark, "\\" + mark)
        lines.append(line.replace("<", "&lt;"))
    return "\n\n".join(lines)

def listing_photo(listing):
    """The listing's first photo as the Comptroller lists it, or None."""
    photos = comptroller_ask("photos/list", {"listing": listing.get("id", "")})
    if type(photos) not in ("list", "tuple") or not photos or type(photos[0]) != "dict":
        return None
    return photos[0]

def photo_bytes(photo):
    """A photo's preview bytes from the Comptroller, within what every network
    takes, or None."""
    s = mochi.remote.stream(COMPTROLLER, "market", "photos/get", {"id": photo.get("id", ""), "variant": "preview"})
    if not s:
        return None
    r = s.read()
    while r and r.get("type") == "ack":
        r = s.read()
    if not r or r.get("status", "") != "200":
        return None
    s.read()
    file = "publish-" + mochi.uid()
    size = s.read.file(file, PHOTO_BYTES)
    data = mochi.file.read(file, PHOTO_BYTES) if size and size <= PHOTO_BYTES else None
    mochi.file.delete(file)
    return data

def fediverse_listing(listing, photo):
    """The Note a listing is on a hosted fediverse account: its title in bold,
    its price, its description and its link, with its first photo at the
    market's public photo route. Core gives it its id, author and addressing."""
    link = listing_link(listing)
    title = str(listing.get("title", "") or "")
    parts = ["**" + fediverse_plain(title) + "**"]
    price = listing_price(listing)
    if price:
        parts.append(fediverse_plain(price))
    description = str(listing.get("description", "") or "").strip()
    if description:
        parts.append(fediverse_plain(description))
    if link:
        parts.append(link)
    note = {"type": "Note", "content": mochi.text.fediverse("\n\n".join(parts))["html"]}
    if link:
        note["url"] = link
    base = mochi.server.url()
    if photo and base:
        note["attachment"] = [{"type": "Document", "mediaType": photo.get("content_type", "") or "image/jpeg", "url": base + "/market/-/photo/" + str(photo.get("id", "")) + "/preview", "name": title}]
    return note

def listing_object(acc, listing):
    """The listing in the form of the account's network, its first photo
    uploaded where the network takes one."""
    photo = listing_photo(listing)
    if acc.get("hosted") and acc["type"] == "fediverse":
        return fediverse_listing(listing, photo)
    data = photo_bytes(photo) if photo else None
    upload = None
    if data:
        upload = mochi.account.upload(acc["id"], data, photo.get("content_type", "") or "image/jpeg", name=photo.get("name", "photo"), description=str(listing.get("title", "") or ""))
    if acc["type"] == "bluesky":
        text = listing_text(listing, BLUESKY_CHARACTERS)
        post = {"$type": "app.bsky.feed.post", "text": text}
        link = listing_link(listing)
        if link and text.endswith(link):
            # Byte offsets, as the network counts them.
            post["facets"] = [{"index": {"byteStart": len(text) - len(link), "byteEnd": len(text)}, "features": [{"$type": "app.bsky.richtext.facet#link", "uri": link}]}]
        if upload and upload.get("data"):
            post["embed"] = {"$type": "app.bsky.embed.images", "images": [{"image": upload["data"], "alt": text_cut(str(listing.get("title", "") or ""), 1000)}]}
        return post
    limits = acc.get("limits") or {}
    limit = limits.get("characters") if type(limits.get("characters")) == "int" and limits.get("characters") > 0 else MASTODON_CHARACTERS
    status = {"status": listing_text(listing, limit), "visibility": "public"}
    if upload and upload.get("id"):
        status["media_ids"] = [upload["id"]]
    return status

# ---- The copies ----

def publish_listing(listing, accounts=None):
    """Publish a listing that has gone live to the accounts it names, else to
    the seller's list; one anyone may see only. One held for review waits for
    the Comptroller to say it has been approved."""
    if type(listing) != "dict":
        return
    listing_id = str(listing.get("id", ""))
    if not listing_id:
        return
    if not listing_visible(listing):
        if listing.get("status") == "active":
            mochi.db.execute("insert or replace into pending ( listing, accounts, created ) values ( ?, ?, ? )", listing_id, json.encode(accounts) if accounts != None else "", mochi.time.now())
        return
    mochi.db.execute("delete from pending where listing=?", listing_id)
    for id in (accounts if accounts != None else publish_list()):
        acc = publish_account(id)
        if not acc or mochi.db.exists("select 1 from copies where listing=? and account=?", listing_id, acc["id"]):
            continue
        result = mochi.account.object.create(acc["id"], listing_object(acc, listing), key=listing_id + "|" + acc["id"])
        if not result or not result.get("id"):
            mochi.log.warn("Market could not publish listing %s to %s", listing_id, acc.get("identifier", acc["id"]))
            continue
        mochi.db.execute("insert or replace into copies ( listing, account, address, network, remote, url, created ) values ( ?, ?, ?, ?, ?, ?, ? )",
            listing_id, acc["id"], acc.get("identifier", ""), acc["type"], str(result["id"]), str(result.get("url", "") or ""), mochi.time.now())

def publish_listing_refresh(listing_id):
    """A change to a live listing reaches each of its copies (decision 25). The
    Comptroller lets a seller change only a draft's details, so what changes
    once a listing is live is its photos; the listing is read afresh."""
    if not listing_id or not mochi.db.exists("select 1 from copies where listing=?", listing_id):
        return
    answer = comptroller_ask("listings/get", {"id": listing_id})
    listing = answer.get("listing") if type(answer) == "dict" else None
    if listing_visible(listing):
        publish_listing_update(listing)

def publish_listing_update(listing):
    """A new version of a listing reaches each of its copies."""
    listing_id = str(listing.get("id", ""))
    for copy in mochi.db.rows("select account, remote from copies where listing=?", listing_id):
        acc = publish_account(copy["account"])
        if not acc:
            continue
        result = mochi.account.object.update(acc["id"], copy["remote"], listing_object(acc, listing))
        if not result:
            mochi.log.warn("Market could not update the copy of listing %s on %s", listing_id, acc.get("identifier", acc["id"]))
            continue
        if result.get("id") and str(result["id"]) != copy["remote"]:
            mochi.db.execute("update copies set remote=?, url=? where listing=? and account=?", str(result["id"]), str(result.get("url", "") or ""), listing_id, acc["id"])

def publish_listing_pending(url):
    """Publish a held listing, named by its page, once the Comptroller shows
    it."""
    prefix = "/market/listings/"
    if type(url) != "string" or not url.startswith(prefix):
        return
    listing_id = url[len(prefix):]
    row = mochi.db.row("select accounts from pending where listing=?", listing_id)
    if not row:
        return
    answer = comptroller_ask("listings/get", {"id": listing_id})
    listing = answer.get("listing") if type(answer) == "dict" else None
    if not listing_visible(listing):
        return
    publish_listing(listing, json.decode(row["accounts"], None) if row["accounts"] else None)

def publish_listing_delete(listing_id):
    """Withdraw every copy of a deleted listing."""
    for copy in mochi.db.rows("select account, remote from copies where listing=?", listing_id):
        if publish_account(copy["account"]):
            mochi.account.object.delete(copy["account"], copy["remote"])
    mochi.db.execute("delete from copies where listing=?", listing_id)
    mochi.db.execute("delete from pending where listing=?", listing_id)

def function_activitypub_object(context, account, id):
    """A listing a hosted fediverse account published, as the Comptroller holds
    it now: core's engine asks when another server fetches it or reads the
    account's outbox. None once the listing is no longer for sale, or the
    Comptroller cannot say."""
    copy = mochi.db.row("select listing from copies where account=? and remote=?", account, id)
    if not copy:
        return None
    answer = comptroller_ask("listings/get", {"id": copy["listing"]})
    listing = answer.get("listing") if type(answer) == "dict" else None
    if not listing_visible(listing):
        return None
    return fediverse_listing(listing, listing_photo(listing))

# ---- Actions ----

def action_publish(a):
    """The accounts the seller's listings may be published to, those they are,
    and how many copies each holds."""
    return {"data": {"accounts": [account_present(acc) for acc in publish_accounts()], "publish": publish_list(), "copies": publish_counts()}}

def action_publish_set(a):
    """Set where the seller's listings are published. The copies on an account
    that leaves the list stay, counted in the answer so the client can offer to
    delete them."""
    accounts, ok = publish_ids(a.input("accounts", ""))
    if not ok:
        a.error.label(400, "errors.invalid_accounts")
        return
    accounts = accounts or []
    before = publish_list()
    now = mochi.time.now()
    for id in accounts:
        mochi.db.execute("insert or ignore into publish ( account, created ) values ( ?, ? )", id, now)
    for id in before:
        if id not in accounts:
            mochi.db.execute("delete from publish where account=?", id)
    counts = publish_counts()
    return {"data": {"publish": accounts, "kept": {id: counts[id] for id in before if id not in accounts and counts.get(id, 0)}}}

def action_publish_forget(a):
    """Delete the seller's copies on one account, as offered when it leaves the
    list."""
    account = a.input("account", "")
    if not account or len(account) > 64:
        a.error.label(400, "errors.invalid_accounts")
        return
    rows = mochi.db.rows("select listing, remote from copies where account=?", account)
    acc = publish_account(account)
    for row in rows:
        if acc:
            mochi.account.object.delete(acc["id"], row["remote"])
    mochi.db.execute("delete from copies where account=?", account)
    return {"data": {"deleted": len(rows)}}
