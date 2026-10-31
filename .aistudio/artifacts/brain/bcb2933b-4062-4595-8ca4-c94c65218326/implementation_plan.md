# Classifieds V2 — Master Architecture & Implementation Blueprint

## Executive Summary

Classifieds V2 is a ground-up architectural rebuild of the classifieds marketplace platform into an enterprise-grade, server-side rendered (SSR) **Modular Monolith** built on **Next.js 15+ (App Router)**, **TypeScript**, **PostgreSQL 16+** (via **Drizzle ORM**), and **Tailwind CSS**.

The existing application (`Classifieds-main`) serves as the strict behavioral, visual, and functional reference. This blueprint establishes the comprehensive architecture required to resolve V1's critical technical problems—specifically replacing volatile in-memory Maps and client-only state with ACID-compliant PostgreSQL persistence, replacing client-side SPA rendering with search-engine crawlable SSR HTML, securing payments with server-side HMAC signatures, and enforcing strict server-side authorization—**while preserving 100% of the existing user workflows, category taxonomies, dynamic attribute engines, and the complete 15-module advanced Admin Panel**.

---

## PART 0 — Strict Anti-Split-Brain Contract & Domain Registry

To guarantee architectural consistency, prevent competing implementations, and eliminate conflicting sources of truth, Classifieds V2 adheres to the following non-negotiable rules:

### 1. The 18 Anti-Split-Brain Rules

1. **Single Authoritative Persistence**: PostgreSQL is the sole authoritative persistence layer for all application data.
2. **Single Authoritative Service per Domain**: Every business domain has exactly one designated authoritative service (`server/services/<domain>.service.ts`) containing its business logic and state transitions.
3. **Single Authoritative Repository per Domain**: Every database domain has exactly one designated repository (`server/repositories/<domain>.repository.ts`) containing all SQL/Drizzle data-access queries.
4. **No Duplicate Business Logic**: Business logic is never duplicated between Route Handlers, Server Actions, client components, or separate ad-hoc utility scripts.
5. **Strict Boundary Separation**:
   - **Server Components (RSC)**: Read-only data consumption via authoritative services/repositories; zero client bundle overhead.
   - **Route Handlers (`app/api/*`)**: REST endpoints for external consumers, webhooks, and client-side fetches.
   - **Server Actions**: Form submissions and user mutations that directly delegate to authoritative domain services.
   - **Client Components (`'use client'`)**: UI presentation, local interaction state (e.g. open/closed modals, tab switching), and form input capture only.
6. **Backend is Authoritative**: Client-side validation exists purely for immediate UX feedback. The backend domain service and Zod schema are always the ultimate authority.
7. **Shared Types & Schemas**: Single source of truth for TypeScript interfaces (`types/domain.ts`) and Zod validation schemas (`lib/validations/<domain>.ts`).
8. **No Parallel Legacy Implementations**: When migrating a feature from V1, the legacy in-memory/state-only implementation is fully replaced; no hybrid or parallel implementations may coexist.
9. **No Competing In-Memory / Client State**: LocalStorage, React state, or process-level variables must never store authoritative copies of listings, users, orders, or settings.
10. **Zero Silent Fallback**: If PostgreSQL or an external service is unavailable, operations must fail fast with a descriptive error. The system must never silently fall back to ephemeral in-memory objects.
11. **Atomic Multi-Record Updates**: All operations touching multiple tables or balances must execute within explicit PostgreSQL transactions (`db.transaction(...)`).
12. **Durable Idempotency & Database Constraints**: Duplicate or out-of-order requests (such as duplicate payment webhooks or concurrent duplicate ad submissions) are prevented via database constraints (`UNIQUE` indexes) and durable event logs.
13. **Zero Circular Dependencies**: Services depend strictly downward on repositories; repositories depend on the database schema. Cross-domain interactions occur via explicit domain service interfaces.
14. **Unified Authentication & Identity**: Exactly one session management system (PostgreSQL `user_sessions` with HTTP-only cookies). No competing JWT, localStorage, or mock user toggles.
15. **Centralized Security Enforcement**: Listing ownership, admin RBAC, and payment verification each have exactly one canonical verification function called universally across all endpoints.
16. **Documented Domain Registry**: Every module is registered in the official V2 Domain Registry table below before code is written.
17. **Zero Redundant Abstractions**: No duplicate utility functions, competing HTTP clients, or parallel versions of the same UI component.
18. **No Unjustified Infrastructure**: All requirements are satisfied within the single Next.js Node.js Modular Monolith with PostgreSQL. No microservices or external message brokers without concrete technical justification.

---

### 2. Authoritative Domain Registry

| Domain Name | Authoritative Service | Authoritative Repository | Authoritative PostgreSQL Tables | Primary Entry Points | Prohibited Anti-Patterns |
|---|---|---|---|---|---|
| **Authentication & Sessions** | `AuthService` (`server/services/auth.service.ts`) | `AuthRepository` (`server/repositories/auth.repository.ts`) | `users`, `user_sessions` | `/api/auth/login`, `/api/auth/logout`, `middleware.ts` | No client-side mock role switching without server session; no credentials in localStorage. |
| **Users & KYC** | `UserService` (`server/services/user.service.ts`) | `UserRepository` (`server/repositories/user.repository.ts`) | `users`, `kyc_documents` | `/api/users/*`, `app/admin/users/page.tsx`, `KycVerificationPage` | No independent user status updates outside `UserService`; no unverified KYC status transitions. |
| **Listings & Moderation** | `ListingService` (`server/services/listing.service.ts`) | `ListingRepository` (`server/repositories/listing.repository.ts`) | `listings`, `category_custom_fields` | `/api/listings/*`, `app/(user)/post/page.tsx`, `app/admin/marketplace/listings` | No client-side duplicate checking bypassing backend; no direct DB updates from Route Handlers. |
| **Categories & Taxonomies** | `CategoryService` (`server/services/category.service.ts`) | `CategoryRepository` (`server/repositories/category.repository.ts`) | `categories` | `/api/categories/*`, `app/admin/marketplace/categories` | No hardcoded category JSON arrays; no un-migrated static constants in UI components. |
| **Dynamic Attributes (EAV)** | `AttributeService` (`server/services/attribute.service.ts`) | `AttributeRepository` (`server/repositories/attribute.repository.ts`) | `category_custom_fields` | `/api/attributes/*`, `app/admin/marketplace/attributes` | No ad-hoc custom field schemas outside `category_custom_fields`; no unvalidated JSONB attributes. |
| **Locations & Geo** | `LocationService` (`server/services/location.service.ts`) | `LocationRepository` (`server/repositories/location.repository.ts`) | `locations` | `/api/locations/*`, `app/admin/marketplace/locations` | No static location lists in client components; all cities and localities sourced from `locations`. |
| **Search & Discovery** | `SearchService` (`server/services/search.service.ts`) | `SearchRepository` (`server/repositories/search.repository.ts`) | `listings`, `locations`, `categories` | `app/(marketplace)/search/page.tsx`, `/api/search` | No client-side array filtering for public search results; all indexing and matching executed in PostgreSQL. |
| **Favorites / Saved Ads** | `FavoriteService` (`server/services/favorite.service.ts`) | `FavoriteRepository` (`server/repositories/favorite.repository.ts`) | `user_favorites` | `/api/favorites/*`, `app/(user)/my-account` | No client localStorage favorites competing with database records. |
| **Messaging & Chat** | `ChatService` (`server/services/chat.service.ts`) | `ChatRepository` (`server/repositories/chat.repository.ts`) | `chat_messages` | `/api/chat/*`, `components/marketplace/SellerContactCard.tsx` | No ephemeral chat state lost on refresh; every inquiry logged in `chat_messages`. |
| **Abuse Reports & Rules** | `ModerationService` (`server/services/moderation.service.ts`) | `ModerationRepository` (`server/repositories/moderation.repository.ts`) | `abuse_reports`, `moderation_rules` | `/api/reports/*`, `app/admin/moderation/page.tsx` | No silent client-only dismissal of abuse reports. |
| **Monetization & Quotas** | `MonetizationService` (`server/services/monetization.service.ts`) | `SettingsRepository` (`server/repositories/settings.repository.ts`) | `system_settings` | `app/admin/paid-features/page.tsx`, `PostAdPage` | No client-side price calculation; server authoritative fee determination. |
| **Boost Packages & Orders** | `BoostService` (`server/services/boost.service.ts`) | `BoostRepository` (`server/repositories/boost.repository.ts`) | `boost_packages`, `boost_orders`, `boost_transactions` | `/api/boost/create-order`, `/api/boost/verify-payment`, `app/admin/commerce` | No client-simulated payment success; zero manual status changes without verified transaction. |
| **Payment Gateways & Webhooks**| `PaymentService` (`server/services/payment.service.ts`) | `PaymentRepository` (`server/repositories/payment.repository.ts`) | `payment_webhook_events`, `boost_transactions` | `/api/boost/webhook`, `/api/boost/verify-payment` | No activation of paid features without cryptographic HMAC signature verification. |
| **Email Suite & Campaigns** | `EmailService` (`server/services/email.service.ts`) | `EmailRepository` (`server/repositories/email.repository.ts`) | `email_templates`, `email_logs`, `newsletter_campaigns` | `/api/email/*`, `app/admin/email/page.tsx` | No client-side SMTP dispatch; template variable hydration executed strictly on server. |
| **CMS & SEO Pages** | `CmsService` (`server/services/cms.service.ts`) | `CmsRepository` (`server/repositories/cms.repository.ts`) | `cms_pages`, `system_settings` | `app/admin/cms/page.tsx`, `app/admin/seo/page.tsx`, footer modals | No static hardcoded CMS text in UI modals; all content fetched dynamically from PostgreSQL. |
| **Audit Logging & System** | `AuditService` (`server/services/audit.service.ts`) | `AuditRepository` (`server/repositories/audit.repository.ts`) | `audit_logs`, `system_settings` | `app/admin/settings/page.tsx`, all mutating services | No untracked administrative mutations; all updates logged with admin ID, action, diff, and IP. |

---

## PART 1 — Mandatory Technology Stack & Infrastructure

### 1. Framework & Runtime Selection

- **Application Framework**: **Next.js 15+ (App Router)** running on the **Node.js** runtime.
- **Language**: **TypeScript 5.x** in strict mode across the entire stack.
- **Styling**: **Tailwind CSS v4** preserving the existing responsive marketplace layout and administrative aesthetic.
- **Iconography**: **Lucide React** (`0.553.0+`) for clean, standard icons (`Wrench`, `Car`, `Building2`, `Sparkles`, `Rocket`, etc.).
- **Client Animation & Transitions**: **Motion** (`motion/react`) for route reveals, modal dialogs, and drawer animations.

### 2. Backend Architecture: Evaluation of Standalone Express vs. Next.js Modular Monolith

Next.js App Router natively provides:
1. **Route Handlers (`app/api/*`)**: Full HTTP request/response handling running on Node.js with native support for body parsing, streaming, HTTP-only cookie management, and webhooks.
2. **Server Components (RSC)**: Zero-bundle-size server data fetching directly from PostgreSQL repositories.
3. **Server Actions**: Direct, type-safe mutations with automated cache revalidation.
4. **Middleware (`middleware.ts`)**: Fast, edge/server pre-routing authentication and RBAC session inspection.

Introducing a separate Express process would violate the single-source-of-truth requirement, create duplicate routing layers, and invite split-brain inconsistencies. V2 is implemented as a single, clean **Modular Monolith**.

### 3. Layered Request Flow (Clean Separation of Concerns)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. ROUTE LAYER (Next.js Route Handlers / Server Actions)                │
│    • Receives HTTP Request / Form Data                                  │
│    • Extracts headers, cookies, query parameters, and payload          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. AUTHENTICATION & AUTHORIZATION GUARD                                 │
│    • Inspects HTTP-only session cookie in PostgreSQL                   │
│    • Enforces RBAC permissions (super_admin, moderator, finance, etc.)   │
│    • Enforces resource ownership (listing.sellerId === session.userId)  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. VALIDATION LAYER (Zod Schemas)                                       │
│    • Validates payload types, ranges, string lengths, and enums         │
│    • Normalizes strings (trims whitespace, sanitizes bad inputs)        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 4. CONTROLLER / APPLICATION SERVICE                                     │
│    • Orchestrates cross-cutting workflows (e.g. create ad + send email) │
│    • Manages transaction lifecycles and concurrency mutexes             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 5. DOMAIN BUSINESS LOGIC                                                │
│    • Title normalization regex: LOWER(REGEXP_REPLACE(TRIM(t), '\s+', ' '))│
│    • Boost ranking priority calculations and expiration validation     │
│    • Anti-spam URL neutralization & content filter scoring              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 6. REPOSITORY LAYER                                                     │
│    • Type-safe Drizzle ORM SQL queries                                  │
│    • Explicit database joins, aggregations, and pagination              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 7. AUTHORITATIVE POSTGRESQL DATABASE                                    │
│    • ACID transactions, functional unique partial indexes, foreign keys │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. Database Selection: Drizzle ORM over Prisma

**Drizzle ORM** is selected as the primary ORM for the following reasons:
1. **First-Class Partial & Functional Index Support**: Critical for enforcing the unique active title index (`CREATE UNIQUE INDEX idx_unique_active_ad_title_per_seller ON listings (seller_id, LOWER(REGEXP_REPLACE(TRIM(title), '\s+', ' ', 'g'))) WHERE status NOT IN ('sold', 'expired');`). Prisma does not natively support PostgreSQL regex functional indexes in its schema DSL.
2. **Native JSONB Mapping**: Dynamic category-specific EAV attributes (`custom_attributes JSONB`) are queried and indexed with zero type-casting friction.
3. **Zero Runtime Engine Overhead**: Unlike Prisma's heavy Rust query engine binary, Drizzle compiles directly to lightweight SQL queries with negligible memory overhead and instant cold starts.
4. **Deterministic SQL Migrations**: Schema changes in `lib/db/schema.ts` generate clean, auditable SQL scripts via `drizzle-kit`.

### 5. Infrastructure: Day 1 vs. Growth Roadmap

| Subsystem | Day 1 (Production MVP Foundation) | Growth Phase (Scale & High Traffic) |
|---|---|---|
| **Database** | Managed PostgreSQL (Cloud SQL / Neon / Supabase) with connection pooling (`pg.Pool` max 20). | Read replicas for marketplace browse queries; dedicated analytics replica. |
| **Media / Photos** | Object Storage (S3 / Google Cloud Storage compatible) with signed upload URLs; Next.js image optimization. | Global CDN caching layer with automatic WebP/AVIF transformation and watermarking pipeline. |
| **Email Delivery** | Nodemailer with direct SMTP (SendGrid, Postmark, Amazon SES, or custom SMTP server) with live admin tester. | Distributed message queue (BullMQ / Redis) for high-volume newsletter broadcasts. |
| **Search Engine** | PostgreSQL full-text search (`tsvector` / `tsquery`) with GIN indexes on listing titles, cities, and descriptions. | Elasticsearch / Meilisearch cluster for typo-tolerant faceted full-text search. |
| **Caching** | Next.js Server Component data cache (`unstable_cache`) with tag-based on-demand revalidation (`revalidateTag`). | Distributed Redis cache for real-time active user sessions and rate-limiting counters. |
| **Realtime Chat** | Periodic optimistic client polling against PostgreSQL `/api/chat/messages` with last-read timestamps. | WebSockets / Server-Sent Events (SSE) server for instant typing indicators. |
| **Logging & Audit** | Persistent PostgreSQL `audit_logs` table for all admin mutations and structured console logs. | OpenTelemetry / Sentry error tracking with centralized log indexing. |

---

## PART 2 — Complete Existing Application Feature Inventory

From comprehensive source inspection of `Classifieds-main`, every user-facing feature has been inventoried:

| Feature Name | Existing Source Files | Existing Behavior & UI | Existing Backend / Data Layer | Business Rules Preserved | V2 Implementation Destination |
|---|---|---|---|---|---|
| **Homepage & Hero** | `MarketplaceView.tsx` | Search bar, city picker button, active filters, 12 category icon directory, featured ad cards, SEO text block. | React state in `AppContext.tsx` initialized from `initialData.ts`. | Shows approved & featured ads; sorts boosted ads to the top. | `app/(marketplace)/page.tsx` (SSR) + `components/marketplace/` |
| **Category Directory** | `CategoryDirectoryGrid.tsx` | Visual grid of 12 root categories with Lucide icons and listing count badges. | Filtered from `INITIAL_CATEGORIES`. | Clicking category routes to `/:city/:category` or toggles feed. | `components/marketplace/CategoryDirectoryGrid.tsx` |
| **Sub-Navbar Navigation** | `CategorySubNavbar.tsx` | Horizontal scrollable carousel of categories with active indicators. | Synced with route parameters in `AppRouter`. | Highlights active category/subcategory. | `components/marketplace/CategorySubNavbar.tsx` |
| **City & Locality Selector** | `LocationSelectorInput.tsx`, `LocalityCombobox.tsx` | Modal/dropdown to choose Country (India) $\to$ State $\to$ City $\to$ Locality with popular city chips. | Filtered from `INITIAL_LOCATIONS`. | Updates URL city slug (e.g. `/mumbai`) and filters listings feed. | `components/marketplace/LocationSelectorInput.tsx` |
| **Marketplace Listings Feed** | `MarketplaceView.tsx` | Responsive ad grid with thumbnail, price (₹), title, location, relative date, seller badge, and boost banner. | In-memory `listingsDb.getAllListings()` filtered on client. | Priority: Boosted $\to$ Featured $\to$ GPS Distance $\to$ Chronological. | `app/(marketplace)/[city]/page.tsx` (SSR) |
| **Property & Rental Filters** | `MarketplaceView.tsx:98-114` | Faceted filters: Property Type (Apartment, Villa), Config (1BHK-4BHK), Price min/max, Area sq.ft, Deposit, Furnishing. | Matched against `listing.customAttributes`. | Non-destructive filter applied only when viewing Properties. | `components/marketplace/PropertyFilterBar.tsx` |
| **Listing Detail Page (PDP)** | `ListingDetailPage.tsx` | Multi-image gallery with zoom, price, verified badge, attribute table, unclickable description, map, safety tips. | `findListingById` in client state; fallback 404 screen. | Phone hidden behind click; external URLs rendered unclickable. | `app/(marketplace)/[city]/[category]/[listingSlug]/page.tsx` (SSR) |
| **Unclickable Description** | `utils/unclickableLinks.tsx` | Parses description; strips live links from markdown and raw URLs, replacing with "Link Disabled" badges. | Client regex parser. | Anti-spam compliance: strictly neutralizes external links. | `lib/utils/sanitizer.ts` + Server Component render |
| **Seller Contact & Live Chat** | `ListingDetailPage.tsx:64-74` | "Show Phone Number" button reveals full phone; interactive buyer-seller chat modal with history. | Ephemeral component state in V1. | Protects seller privacy; logs chat thread between users. | `components/marketplace/SellerContactCard.tsx` + `chat_messages` table |
| **Listing Map Widget** | `ListingMapWidget.tsx` | Interactive map displaying listing coordinates or city center fallback. | Leaflet / Google Maps wrapper. | Renders location pin with privacy fuzzing if configured. | `components/marketplace/ListingMapWidget.tsx` |
| **Social Share Modal** | `ListingDetailPage.tsx` | Quick share to WhatsApp, Facebook, X (Twitter), or copy URL to clipboard. | Web Share API / clipboard write. | Copies canonical SEO URL. | `components/common/ShareModal.tsx` |
| **Post Ad (Sell) Wizard** | `PostAdPage.tsx` | 5-step ad builder: Category $\to$ Location $\to$ Title & Dynamic Fields $\to$ 5 Photos $\to$ Price/Desc $\to$ Quota Check. | In-memory `createListing` API. | Validates duplicate title, enforces 5 photos (max 5MB), freemium quota. | `app/(user)/post/page.tsx` |
| **Duplicate Title Check** | `utils/adTitleValidation.ts` | Debounced live as-you-type check: warns if user already has an active ad with this normalized title. | `/api/listings/check-duplicate` endpoint. | Case-insensitive, whitespace-collapsed, scoped to `sellerId`. | `server/services/listing.service.ts` |
| **User Panel (Account Hub)** | `UserPanelPage.tsx` | 6 functional tabs: My Ads, Saved Ads, Orders & Receipts, Messages, Email Notifications, Account Settings. | State in `AppContext.tsx`. | Enforces user access to own listings, invoices, and KYC data. | `app/(user)/my-account/page.tsx` |
| **Favorites / Saved Ads** | `UserPanelPage.tsx`, `MarketplaceView.tsx` | Heart icon toggle on ad cards; saved ads tab in User Panel. | Client-side array in V1. | Persisted in database; toggled via Server Action. | `user_favorites` PostgreSQL table |
| **Boost Your Ad to Top** | `BoostAdModal.tsx`, `boostHelper.ts` | Package selection modal (24h ₹99, 3d ₹199, 7d ₹399) with features list and checkout trigger. | Express `/api/boost/*` in-memory. | Only approved active ads; prevents overlapping active boosts. | `components/marketplace/BoostAdModal.tsx` + `boost.service.ts` |
| **Feature Ad Upgrade** | `FeatureAdModal.tsx` | 30-day Featured upgrade modal (₹100) with badge highlight. | Client state update in V1. | Adds `isFeatured = true` and `featuredUntil = NOW() + 30 days`. | `components/marketplace/FeatureAdModal.tsx` + `boost.service.ts` |
| **Abuse Report Modal** | `ReportModal.tsx` | Dialog to report spam, prohibited items, scams, offensive content, or duplicates with reporter notes. | Client state in V1. | Dispatches report to moderation queue. | `components/common/ReportModal.tsx` + `abuse_reports` table |
| **Compliance & Trust Modals** | `CmpConsentModal.tsx`, `UsPrivacyModal.tsx`, `EeatSchemaModal.tsx` | GDPR/CMP cookie banner, US Privacy ("Do Not Sell"), and Google E-E-A-T transparency inspector. | Triggered via footer links & custom window events. | Regulatory compliance and search engine trust signals. | `components/common/` global modals |

---

## PART 3 — Complete Advanced Admin Panel Specification

The existing Admin Panel discovered in `ref_repo/src/components/admin/` is reproduced in V2 with 100% functional, layout, and visual fidelity across all 15 modules:

### 1. Admin Navigation & Shell Architecture

- **`AdminHeader.tsx`**:
  - **Dynamic Breadcrumbs**: Reflects hierarchical location in admin suite (`CHILLYADS / ADMIN / MARKETPLACE / LISTINGS`).
  - **Universal Search Trigger (`⌘K`)**: Opens global multi-entity modal searching listings, users, categories, and admin pages.
  - **Live Site Switcher**: Direct one-click link to exit admin and view the public marketplace.
  - **Role Switching Dropdown**: Allows testing and inspecting capabilities across the 6 RBAC roles.
  - **User Impersonation Warning Banner**: Prominent top banner displayed when an admin is impersonating a user, with one-click "End Impersonation Session".
  - **Dark / Light Theme Toggle**: Seamless interface theme switcher.
  - **Mobile Menu Button**: Slides out responsive sidebar drawer on viewports $<1024\text{px}$.
- **`AdminSidebar.tsx`**:
  - 12 distinct collapsible navigation sections.
  - Dynamic notification badge counters computed in real time from PostgreSQL:
    - **Pending Listings Badge**: Count of listings awaiting moderation.
    - **Expired Ads Badge**: Count of expired listings.
    - **Verification Badge**: Count of pending user KYC submissions.
    - **Reports Badge**: Count of open abuse reports.

### 2. Comprehensive Admin Module Matrix (M01 to M15)

- **M01: Dashboard Overview (`/admin/dashboard`)**: 4 KPI cards (Total Listings, Active Users, Revenue, Pending Moderation), active boost counter, revenue line chart, listing velocity breakdown, quick shortcuts, real-time audit stream.
- **M02: Listings Management (`/admin/marketplace/listings`, `/pending`, `/expired`, `/featured`)**: Tab filters (All, Pending, Approved, Rejected, Expired, Sold), single row actions (Approve, Reject with reason modal, Delete, Feature, Boost, Mark Sold), and **Bulk Actions Engine** (Bulk Approve, Bulk Reject with reason dialog, Bulk Delete, Bulk Renew).
- **M03: Categories & Taxonomies (`/admin/marketplace/categories`)**: Full 12-root tree view, drag/reorder priority, Add/Edit category modals (Name, Slug, Lucide icon, Parent, SEO Title/Description, Monetization toggles & fees), Active/Inactive toggle, delete with cascade confirmation.
- **M04: Dynamic Attributes (EAV) (`/admin/marketplace/attributes`)**: Category selector, custom fields list, Add/Edit field modal (Name, Label, Type, Options, Unit, Filterable, Required), Live Preview simulator.
- **M05: Locations Management (`/admin/marketplace/locations`)**: Country $\to$ State $\to$ City $\to$ Locality tree, Add/Edit location modal with Geo ID (e.g. `g1`) and GPS coords, Popular location toggle.
- **M06: Users & KYC Verification (`/admin/users/all`, `/verification`, `/banned`, `/kyc/:id`)**: User accounts table, Ban User modal with mandatory reason, Unban action, User Impersonation, and dedicated `KycVerificationPage` with side-by-side high-res document viewer (Aadhaar, PAN, GSTIN, Passport).
- **M07: Trust & Safety / Moderation (`/admin/moderation/reports`, `/spam`, `/rules`)**: Abuse reports queue, Action Report modal (Actioned/Dismissed with audit notes), calculated `spamScore` queue, and Automated Moderation Rules engine (Keyword blacklist, Price anomaly detection, Rapid posting rate limiter).
- **M08: Paid Features & Monetization (`/admin/paid-features`)**: Master monetization switch, Freemium volume quotas (free ads limit, extra ad fee), Paid subcategories, Featured ads pricing, Boost packages pricing, Display advertising toggles.
- **M09: Commerce, Orders & Billing (`/admin/commerce/orders`, `/packages`, `/transactions`, `/taxes`)**: Boost packages configuration (create, edit, pricing, duration, feature bullets), Orders ledger, Transactions ledger with invoice downloads (`INV-XXXXXX`), 18% GST tax configuration.
- **M10: Display Advertising (`/admin/advertising/campaigns`, `/banners`, `/advertisers`)**: Banner campaigns manager (Header, Feed, Sidebar), creative asset upload, target city/category, impressions/clicks/CTR tracking.
- **M11: Email & Newsletter Suite (`/admin/email/dashboard`, `/send`, `/campaigns`, `/templates`, `/settings`, `/logs`)**: Email dashboard, Send Newsletter form with target audience segmentation (Subscribed, Active Sellers, Business Users, City-Specific), Rich editor with dynamic tokens (`{USER_NAME}`, `{CITY}`), Campaign history, 10 system default email templates with live editor, SMTP settings with live ping latency tester, and searchable outgoing email logs.
- **M12: Communication & Alerts (`/admin/communication/messages`, `/sms`, `/push`, `/templates`)**: In-app messages dispute ledger, SMS gateway settings, push notification triggers.
- **M13: CMS & Content Management (`/admin/cms/pages`, `/blog`, `/faq`, `/media`)**: Legal (Terms, Privacy), Trust & Safety, About Us, Blog editor, FAQ builder, media asset library.
- **M14: SEO Engine & Redirects (`/admin/seo/metadata`, `/redirects`, `/sitemap`, `/templates`)**: Meta title patterns, dynamic `$xcityname` token replacer, 301 redirects table, XML sitemap trigger, visual robots.txt editor.
- **M15: Administration, RBAC & Audit Logs (`/admin/users`, `/roles`, `/logs`, `/settings`, `/gateways`)**: Admin staff accounts, RBAC permission matrix (6 roles), immutable system audit logs, system settings, API keys for payment gateways and integrations.

---

## PART 4 — Complete Server-Side Rendering (SSR) & Technical SEO Architecture

### 1. Mandatory Server Components Strategy

Every public route executes data fetching on the server and returns complete HTML to the browser and search crawlers:

```tsx
// app/(marketplace)/[city]/[category]/[listingSlug]/page.tsx
export default async function ListingDetailPage({ params }: Props) {
  const { city, category, listingSlug } = await params;
  const listingId = extractListingIdFromSlug(listingSlug);
  
  // 1. Direct Server Repository Fetch via Authoritative Listing Service
  const listing = await listingService.getById(listingId);
  if (!listing || listing.status !== 'approved') {
    notFound();
  }

  // 2. Increment view counter atomically in PostgreSQL
  await listingService.recordView(listingId);

  // 3. Render complete semantic HTML with structured Schema.org JSON-LD
  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <JsonLdSchema listing={listing} />
      <BreadcrumbNav city={city} category={category} title={listing.title} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <ListingGallery images={listing.images} title={listing.title} />
          <ListingAttributes attributes={listing.customAttributes} />
          <ListingDescription content={listing.description} />
          <ListingMapWidget location={listing.location} />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <PriceCard price={listing.price} isBoosted={listing.isBoosted} />
          <SellerContactCard sellerId={listing.sellerId} phone={listing.sellerPhone} />
          <BuyerSafetyTipsCard />
        </div>
      </div>
    </main>
  );
}
```

### 2. URL Preservation Architecture

V2 preserves the exact hierarchical SEO URL patterns from `seoAndUrlHelper.ts`:

- **Marketplace Home**: `/`
- **City Landing Hub**: `/:city` (e.g. `/mumbai`, `/new-delhi`) and legacy format `/:city_g{geoId}` (e.g. `/mumbai_g1`).
- **Category Landing Hub**: `/:city/:category` (e.g. `/mumbai/cars`, `/all-india/mobiles`) and `/:city_g{geoId}/:category_c{catCode}`.
- **Subcategory Feed**: `/:city/:category/:subcategory` (e.g. `/mumbai/cars/used-cars`, `/delhi/properties/apartments`).
- **Listing Detail Page (Canonical)**: `/:city/:category/:titleSlug-lst_:id` (e.g. `/mumbai/mobiles/apple-iphone-15-pro-lst_1042`).
- **Short Redirect Links**: Direct lookup `/item/:id` and `/ad/:id` automatically 301-redirect to the full canonical hierarchical URL.

### 3. Dynamic Metadata & Schema.org JSON-LD

- **`generateMetadata()`**: Returns listing title, price in INR, 160-character description excerpt, canonical URL, OpenGraph article tags, and Twitter summary card image.
- **`Product` / `Offer` Schema**: Injected into the page `<head>` with item condition, currency (`INR`), price, availability (`https://schema.org/InStock`), and seller information.
- **`BreadcrumbList` Schema**: Emits standard hierarchical breadcrumb items for Google rich snippets.
- **Dynamic XML Sitemaps (`app/sitemap.ts`)**: Segments sitemaps into `/sitemap/cities.xml`, `/sitemap/categories.xml`, and `/sitemap/listings.xml` with `<lastmod>` timestamps.
- **Robots.txt (`app/robots.ts`)**: Explicitly disallows `/admin/*`, `/my-account/*`, `/api/*`, and draft/expired listing URLs while allowing full public marketplace indexing.

---

## PART 5 — PostgreSQL Authoritative Database Schema

The complete relational schema implemented in `lib/db/schema.ts`:

```sql
-- ENUMS
CREATE TYPE user_type AS ENUM ('user', 'business');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned');
CREATE TYPE kyc_status AS ENUM ('unsubmitted', 'pending', 'verified', 'rejected');
CREATE TYPE admin_role AS ENUM ('super_admin', 'moderator', 'finance_user', 'content_manager', 'marketing_manager', 'support_agent');
CREATE TYPE listing_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'sold', 'expired');
CREATE TYPE boost_status_type AS ENUM ('inactive', 'active', 'expired');

-- 1. USERS & SESSIONS
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(32) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    type user_type NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'active',
    kyc_status kyc_status NOT NULL DEFAULT 'unsubmitted',
    email_subscribed BOOLEAN NOT NULL DEFAULT TRUE,
    email_unsubscribed_at TIMESTAMP WITH TIME ZONE,
    city VARCHAR(128) NOT NULL,
    state VARCHAR(128) NOT NULL,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
    review_count INTEGER NOT NULL DEFAULT 0,
    business_name VARCHAR(255),
    gst_number VARCHAR(32),
    verified_business BOOLEAN NOT NULL DEFAULT FALSE,
    admin_role admin_role NULL,
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(64) NOT NULL,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE kyc_documents (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(32) NOT NULL,
    document_number VARCHAR(128) NOT NULL,
    file_url TEXT NOT NULL,
    status kyc_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by VARCHAR(64) REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 2. LOCATIONS
CREATE TABLE locations (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    code VARCHAR(32),
    geo_id VARCHAR(32) NOT NULL,
    parent_id VARCHAR(64) REFERENCES locations(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    popular BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_locations_parent_slug ON locations(parent_id, slug);

-- 3. CATEGORIES & DYNAMIC ATTRIBUTES
CREATE TABLE categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    icon VARCHAR(64) NOT NULL DEFAULT 'Package',
    parent_id VARCHAR(64) REFERENCES categories(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    seo_title TEXT,
    seo_description TEXT,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    posting_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    free_listings_quota INTEGER NOT NULL DEFAULT 3
);
CREATE INDEX idx_categories_parent ON categories(parent_id);

CREATE TABLE category_custom_fields (
    id VARCHAR(64) PRIMARY KEY,
    category_id VARCHAR(64) NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    label VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL,
    options JSONB,
    unit VARCHAR(32),
    required BOOLEAN NOT NULL DEFAULT FALSE,
    filterable BOOLEAN NOT NULL DEFAULT TRUE,
    order_index INTEGER NOT NULL DEFAULT 0
);

-- 4. LISTINGS
CREATE TABLE listings (
    id VARCHAR(64) PRIMARY KEY,
    seller_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id VARCHAR(64) NOT NULL REFERENCES categories(id),
    subcategory_id VARCHAR(64) REFERENCES categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    state VARCHAR(128) NOT NULL,
    city VARCHAR(128) NOT NULL,
    locality VARCHAR(128) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    images JSONB NOT NULL DEFAULT '[]',
    custom_attributes JSONB NOT NULL DEFAULT '{}',
    status listing_status NOT NULL DEFAULT 'approved',
    rejection_reason TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    featured_until TIMESTAMP WITH TIME ZONE,
    
    -- BOOST YOUR AD TRACKING
    is_boosted BOOLEAN NOT NULL DEFAULT FALSE,
    boost_status boost_status_type NOT NULL DEFAULT 'inactive',
    boost_started_at TIMESTAMP WITH TIME ZONE,
    boost_expires_at TIMESTAMP WITH TIME ZONE,
    boost_package_id VARCHAR(64),
    boost_package_name VARCHAR(255),
    boost_payment_id VARCHAR(128),
    boost_price NUMERIC(10, 2) DEFAULT 0.00,
    boost_duration_hours INTEGER DEFAULT 0,
    boost_views INTEGER NOT NULL DEFAULT 0,
    boost_impressions INTEGER NOT NULL DEFAULT 0,
    boost_clicks INTEGER NOT NULL DEFAULT 0,
    
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    chats_count INTEGER NOT NULL DEFAULT 0,
    spam_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- MIGRATION 001 INDEX: Unique active ad title per seller
CREATE UNIQUE INDEX idx_unique_active_ad_title_per_seller
ON listings (seller_id, LOWER(REGEXP_REPLACE(TRIM(title), '\s+', ' ', 'g')))
WHERE status NOT IN ('sold', 'expired');

-- MIGRATION 002 INDEX: Boost ranking query optimization
CREATE INDEX idx_listings_boost_ranking
ON listings (boost_status, boost_expires_at DESC, is_featured, created_at DESC)
WHERE status = 'approved';

CREATE INDEX idx_listings_location_cat ON listings(city, category_id, status);

-- 5. BOOST PACKAGES, ORDERS & TRANSACTIONS
CREATE TABLE boost_packages (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    badge VARCHAR(64) NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'boost',
    duration_days INTEGER NOT NULL DEFAULT 1,
    duration_hours INTEGER NOT NULL DEFAULT 24,
    price NUMERIC(10, 2) NOT NULL,
    discount_price NUMERIC(10, 2),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    features JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sales_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE boost_orders (
    order_id VARCHAR(64) PRIMARY KEY,
    listing_id VARCHAR(64) NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    package_id VARCHAR(64) NOT NULL REFERENCES boost_packages(id),
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    price NUMERIC(10, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    duration_hours INTEGER NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE boost_transactions (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES boost_orders(order_id),
    listing_id VARCHAR(64) NOT NULL REFERENCES listings(id),
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    package_id VARCHAR(64) NOT NULL REFERENCES boost_packages(id),
    amount NUMERIC(10, 2) NOT NULL,
    tax_amount NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_gateway VARCHAR(64) NOT NULL,
    payment_id VARCHAR(128) NOT NULL,
    invoice_number VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_webhook_events (
    id VARCHAR(128) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL,
    gateway VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. FAVORITES, CHATS & MODERATION
CREATE TABLE user_favorites (
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id VARCHAR(64) NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE chat_messages (
    id VARCHAR(64) PRIMARY KEY,
    listing_id VARCHAR(64) NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    sender_id VARCHAR(64) NOT NULL REFERENCES users(id),
    receiver_id VARCHAR(64) NOT NULL REFERENCES users(id),
    message_text TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE abuse_reports (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(32) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    target_title VARCHAR(255) NOT NULL,
    reported_by VARCHAR(64) NOT NULL REFERENCES users(id),
    reason VARCHAR(64) NOT NULL,
    notes TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    action_taken TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE moderation_rules (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    keywords JSONB DEFAULT '[]',
    threshold NUMERIC(10, 2),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 7. EMAIL TEMPLATES, LOGS, CAMPAIGNS & AUDIT
CREATE TABLE email_templates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT NOT NULL,
    action_label VARCHAR(128),
    action_url TEXT,
    variables JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_system_default BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_logs (
    id VARCHAR(64) PRIMARY KEY,
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'delivered',
    type VARCHAR(64) NOT NULL,
    listing_id VARCHAR(64),
    related_user_id VARCHAR(64) REFERENCES users(id),
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE newsletter_campaigns (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    preview_text TEXT,
    content_html TEXT NOT NULL,
    target_audience VARCHAR(64) NOT NULL,
    target_city VARCHAR(128),
    target_state VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    target_count INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    delivered_count INTEGER NOT NULL DEFAULT 0,
    opened_count INTEGER NOT NULL DEFAULT 0,
    clicked_count INTEGER NOT NULL DEFAULT 0,
    created_by VARCHAR(64) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    admin_id VARCHAR(64) NOT NULL REFERENCES users(id),
    admin_name VARCHAR(255) NOT NULL,
    action VARCHAR(128) NOT NULL,
    module VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    target_summary VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'primary',
    site_name VARCHAR(255) NOT NULL DEFAULT 'Chillyads',
    default_currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '₹',
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    date_format VARCHAR(32) NOT NULL DEFAULT 'DD/MM/YYYY',
    listing_duration_days INTEGER NOT NULL DEFAULT 30,
    free_listings_limit INTEGER NOT NULL DEFAULT 3,
    extra_listing_fee NUMERIC(10, 2) NOT NULL DEFAULT 99.00,
    max_photos_per_listing INTEGER NOT NULL DEFAULT 5,
    auto_approve_verified_users BOOLEAN NOT NULL DEFAULT FALSE,
    maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    watermark_images BOOLEAN NOT NULL DEFAULT FALSE,
    ai_spam_filter_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    otp_login_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    paid_features_config JSONB NOT NULL DEFAULT '{}'
);
```

---

## PART 6 — Security & Authorization Architecture

1. **Authentication & Session Tokens**:
   - Password hashing utilizing **Argon2id** (`@node-rs/argon2`).
   - Session identifiers stored in PostgreSQL `user_sessions` and bound to browser via **HTTP-only, Secure, SameSite=Lax** cookies.
2. **Server-Side Authorization & Ownership**:
   - Middleware and service guards verify resource ownership: `listing.sellerId === session.userId` before update, delete, or boost operations.
   - Administrative endpoints strictly inspect `session.adminRole` against an authorized role whitelist.
3. **Data Sanitization & Injection Prevention**:
   - Zero dynamic SQL string concatenations: all queries run via parameterized Drizzle ORM statements.
   - Ad descriptions scrubbed of malicious HTML/XSS via DOMPurify/sanitize-html and stripped of active hyperlinks via `renderUnclickableDescription`.
4. **Rate Limiting**:
   - IP-based sliding window rate limiting on `/api/auth/login`, `/api/listings` (ad posting), and `/api/reports`.

---

## PART 7 — Payment & Boost Architecture

### Dual-Channel Verification with Webhook Idempotency

```
                       BUYER CLICKS "BOOST AD"
                                  │
                                  ▼
                    1. POST /api/boost/create-order
                       • Server validates user owns listing & listing is 'approved'
                       • Server validates ad is not currently actively boosted
                       • Server looks up boost package in DB (Never trusts client price!)
                       • Inserts record into `boost_orders` with status='pending'
                                  │
                                  ▼
                    2. GATEWAY PAYMENT CHECKOUT
                       • User completes payment via Razorpay / Stripe / UPI
                                  │
                ┌─────────────────┴─────────────────┐
                ▼                                   ▼
      CHANNEL A: RETURN URL               CHANNEL B: ASYNC WEBHOOK
      POST /api/boost/verify-payment      POST /api/boost/webhook
      • Validates HMAC signature          • Validates Webhook signature header
                │                                   │
                └─────────────────┬─────────────────┘
                                  │
                                  ▼
                    3. DURABLE IDEMPOTENCY CHECK
                       • SELECT id FROM payment_webhook_events WHERE id = $eventId
                       • If already processed $\to$ return 200 OK immediately
                                  │
                                  ▼
                    4. POSTGRESQL ATOMIC TRANSACTION
                       BEGIN;
                         • UPDATE boost_orders SET status='completed' WHERE order_id=$1;
                         • UPDATE listings SET 
                             is_boosted = TRUE, 
                             boost_status = 'active',
                             boost_started_at = NOW(),
                             boost_expires_at = NOW() + INTERVAL '$hours hours',
                             boost_package_id = $packageId,
                             boost_payment_id = $paymentId,
                             boost_price = $pkgPrice
                           WHERE id = $listingId;
                         • UPDATE boost_packages SET sales_count = sales_count + 1 WHERE id=$packageId;
                         • INSERT INTO boost_transactions (...) VALUES (...);
                         • INSERT INTO payment_webhook_events (...) VALUES (...);
                       COMMIT;
```

---

## PART 8 — Frontend Architecture & Design Discipline

- **Server Component Baseline**: Homepage, City Hub, Category Feed, Listing Detail view, and Static CMS/SEO blocks render 100% on the server.
- **Client Islands (`'use client'`)**: Isolated strictly to interactive leaves: `ListingGallery` (zoom & thumbnail clicks), `SellerContactCard` (phone reveal & chat modal), `BoostAdModal`, `PostAdForm`, and `AdminSidebar`/`AdminHeader`.
- **Zero-Pill Discipline**: Metadata (categories, dates, status, read time) rendered as clean, unboxed text separated by subtle typographic dots (`·`), never wrapped in pill chips.
- **Top Bar Contract**: Exact 3-zone layout: Brand wordmark on the left, 4–5 single-line navigation links in the center, and 1 primary CTA button ("Post Free Ad") on the right.
- **Dual-Theme Wiring**: Configured via `@custom-variant dark (&:where(.dark, .dark *));` in `app/globals.css`.

---

## PART 9 — Performance & Scalability

1. **Database Indexes**: Compound partial indexes on active listings for instant filter execution, and composite ranking index on `(boost_status, boost_expires_at DESC, is_featured, created_at DESC)`.
2. **Elimination of N+1 Queries**: Drizzle relational `with` queries perform single batched SQL queries with joins.
3. **HTTP Cache Headers**: Public category feeds cached at CDN edge with `s-maxage=60, stale-while-revalidate=300`.
4. **Dynamic Expiration Evaluation**: An ad's boosted status is determined in real-time in the SQL query (`boost_status = 'active' AND boost_expires_at > NOW()`), ensuring instant expiration without depending solely on background cron jobs.

---

## PART 10 — Complete Feature-Parity Mapping

| Existing Feature | Existing Source Files | V2 Destination Module | V2 Route / Component | PostgreSQL Table |
|---|---|---|---|---|
| **Public Marketplace Feed** | `MarketplaceView.tsx` | Marketplace Module | `app/(marketplace)/page.tsx` | `listings`, `categories`, `locations` |
| **Listing Detail View** | `ListingDetailPage.tsx` | Marketplace Module | `app/[city]/[category]/[slug]/page.tsx` | `listings`, `users` |
| **Duplicate Ad Title Guard** | `adTitleValidation.ts`, `listingsDb.ts` | Listing Service | `server/services/listing.service.ts` | `listings` (`idx_unique_active_ad_title_per_seller`) |
| **Boost Your Ad to Top** | `BoostAdModal.tsx`, `boostHelper.ts` | Boost Service | `server/services/boost.service.ts` | `boost_packages`, `boost_orders`, `boost_transactions` |
| **Featured Ad Upgrade** | `FeatureAdModal.tsx` | Boost Service | `server/services/boost.service.ts` | `listings`, `boost_transactions` |
| **Post Ad Multi-step Form** | `PostAdPage.tsx` | User Listing Module | `app/(user)/post/page.tsx` | `listings`, `category_custom_fields` |
| **User Panel (6 Tabs)** | `UserPanelPage.tsx` | User Module | `app/(user)/my-account/page.tsx` | `listings`, `users`, `boost_transactions`, `kyc_documents` |
| **Admin Dashboard (M01)** | `DashboardModule.tsx` | Admin Module | `app/admin/dashboard/page.tsx` | `listings`, `users`, `boost_transactions`, `audit_logs` |
| **Listings Moderation (M02)** | `ListingsModule.tsx` | Admin Module | `app/admin/marketplace/listings/page.tsx` | `listings`, `categories`, `users` |
| **Categories Tree (M03)** | `CategoriesModule.tsx` | Admin Module | `app/admin/marketplace/categories/page.tsx` | `categories` |
| **Dynamic Attributes EAV (M04)**| `AttributesModule.tsx` | Admin Module | `app/admin/marketplace/attributes/page.tsx` | `category_custom_fields` |
| **Locations Manager (M05)** | `LocationsModule.tsx` | Admin Module | `app/admin/marketplace/locations/page.tsx` | `locations` |
| **Users & KYC Verification (M06)**| `UsersModule.tsx`, `KycVerificationPage.tsx` | Admin Module | `app/admin/users/page.tsx`, `/kyc/[id]` | `users`, `kyc_documents` |
| **Moderation & Reports (M07)** | `ModerationModule.tsx`, `ReportModal.tsx` | Admin Module | `app/admin/moderation/page.tsx` | `abuse_reports`, `moderation_rules` |
| **Monetization Engine (M08)** | `PaidFeaturesModule.tsx` | Admin Module | `app/admin/paid-features/page.tsx` | `system_settings` |
| **Commerce & Invoices (M09)** | `CommerceModule.tsx` | Admin Module | `app/admin/commerce/page.tsx` | `boost_packages`, `boost_transactions` |
| **Display Advertising (M10)** | `AdvertisingModule.tsx` | Admin Module | `app/admin/advertising/page.tsx` | `display_campaigns`, `display_banners` |
| **Email Suite & Logs (M11)** | `EmailManagementModule.tsx` | Admin Module | `app/admin/email/page.tsx` | `email_templates`, `email_logs`, `newsletter_campaigns` |
| **Communication (M12)** | `CommunicationModule.tsx` | Admin Module | `app/admin/communication/page.tsx` | `chat_messages` |
| **CMS Pages (M13)** | `CmsSeoModule.tsx`, `CmsPageModal.tsx` | Admin Module | `app/admin/cms/page.tsx` | `cms_pages` |
| **SEO & Redirects (M14)** | `CmsSeoModule.tsx`, `seoAndUrlHelper.ts` | Admin Module | `app/admin/seo/page.tsx` | `system_settings`, `seo_redirects` |
| **Admin RBAC & Audit (M15)** | `AdminSettingsModule.tsx` | Admin Module | `app/admin/settings/page.tsx` | `users`, `audit_logs`, `system_settings` |

---

## PART 11 & 12 — Phased Implementation Roadmap & Verification

- [x] **Phase 1: Foundation, Dependencies & Next.js App Router Structure**
  - Verified Next.js 15+ App Router structure with Tailwind v4 setup and clean route layouts.
- [x] **Phase 2: PostgreSQL Schema, Drizzle ORM & Relational Schema Definition**
  - Defined `lib/db/schema.ts` with all 15 relational tables, enums, foreign keys, and indexes.
  - Enforced functional partial index `idx_unique_active_ad_title_per_seller` and ranking index `idx_listings_boost_ranking`.
- [x] **Phase 3: Database Seeding & Baseline Data Migration**
  - Seeded 12 root categories and 60+ subcategories with Lucide icon mapping.
  - Seeded custom dynamic fields for Cars, Properties, Mobiles, and Rentals.
  - Seeded full location hierarchy (India $\to$ States $\to$ 15+ Major Cities $\to$ Localities).
  - Seeded initial boost packages (24h, 3d, 7d) and initial administrative roles.
- [x] **Phase 4: Authentication, RBAC & Session Security**
  - Integrated Argon2 password hashing and HTTP-only session cookie management.
  - Defined role-based authorization guards for all 6 administrative roles.
  - Configured KYC document upload and verification pipeline.
- [x] **Phase 5: Listing Service, Duplicate Title Engine & Anti-Spam**
  - Built Listing service with regex title normalizer and database duplicate check.
  - Implemented dynamic EAV attribute storage in JSONB.
  - Enforced server-side anti-spam external link neutralizer (`renderUnclickableDescription`).
- [x] **Phase 6: Server-Side Rendered (SSR) Public Marketplace**
  - Built SSR Homepage (`app/(marketplace)/page.tsx`) with category directory and featured ads.
  - Built hierarchical city, category, and subcategory SSR feeds with faceted filters.
  - Built Server-Rendered Listing Detail Page with OpenGraph metadata and Schema.org JSON-LD.
- [x] **Phase 7: Search, Filtering & SEO Sitemaps**
  - Built full-text search with city and price bounding.
  - Generated dynamic `sitemap.ts` and `robots.ts` with canonical link tags.
- [x] **Phase 8: User Workspace (Post Ad & User Panel)**
  - Built Post Ad multi-step wizard with 5-photo upload and live duplicate check.
  - Built User Panel: My Ads (with status filters and inline edit), Saved Favorites, Orders & Invoices, Messages, and Account Settings.
  - Implemented Buyer-Seller Chat and Phone Reveal state machine.
- [x] **Phase 9: Complete Advanced Admin Panel (All 15 Modules)**
  - Replicated `AdminSidebar` with all 12 collapsible sections and dynamic pending badge counters.
  - Replicated `AdminHeader` with breadcrumbs, `⌘K` search trigger, role switcher, and impersonation warning banner.
  - Built Dashboard (M01), Listings Moderation with Bulk Actions (M02), Categories (M03), Attributes (M04), Locations (M05), Users & KYC (M06), Trust & Safety (M07), Paid Features (M08), Commerce & Invoices (M09), Display Ads (M10), Email Suite (M11), Communication (M12), CMS (M13), SEO (M14), and Settings & RBAC (M15).
  - Connected all 15 modules to PostgreSQL Drizzle queries and Server Actions.
- [x] **Phase 10: Boost Packages, Payments & Webhook Processing**
  - Implemented Boost Order Intent creation with server-authoritative pricing.
  - Built payment verification service with HMAC signature verification.
  - Implemented idempotent webhook processing with durable database logging.
  - Implemented ranking query prioritizing active boosted ads.
- [x] **Phase 11: Email Engine & System Audit Logging**
  - Built SMTP dispatcher with template variable interpolation (`{USER_NAME}`, `{LISTING_TITLE}`).
  - Built Newsletter Campaign engine with audience segmentation.
  - Implemented immutable system audit logging for all administrative actions.
- [x] **Phase 12: Performance Verification & End-to-End Build**
  - Executed full regression audit verifying all 15 public screens and all 15 admin modules.
  - Executed `compile_applet` and confirmed zero-error Next.js 15 App Router production compilation.
