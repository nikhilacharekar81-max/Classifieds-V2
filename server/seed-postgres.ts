import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import {
  INITIAL_CATEGORIES,
  INITIAL_CUSTOM_FIELDS,
  INITIAL_LOCATIONS,
  INITIAL_USERS,
  INITIAL_ADMINS,
  INITIAL_LISTINGS,
  INITIAL_MODERATION_RULES,
  INITIAL_PACKAGES,
  INITIAL_SETTINGS,
  INITIAL_EMAIL_TEMPLATES,
  INITIAL_CMS_PAGES,
} from '@/lib/data/initialData';
import { seedCategoriesWithTenAds } from '@/lib/data/listingsSeeder';

export async function seedPostgres() {
  console.log('--- Starting PostgreSQL Database Seeding ---');

  // 1. Users & Admins
  console.log('Seeding users & admins...');
  for (const u of INITIAL_USERS) {
    await db.insert(schema.users).values({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '+91 98000 11111',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
      avatarUrl: u.avatar,
      type: u.type,
      status: u.status,
      kycStatus: u.kycStatus,
      emailSubscribed: u.emailSubscribed,
      city: u.location?.city || 'Mumbai',
      state: u.location?.state || 'Maharashtra',
      rating: String(u.rating || 5.0),
      reviewCount: u.reviewCount || 0,
      businessName: u.businessDetails?.companyName || (u as any).businessName || null,
      gstNumber: u.businessDetails?.gstNumber || (u as any).gstNumber || null,
      verifiedBusiness: u.businessDetails?.verifiedBusiness || (u as any).verifiedBusiness || false,
      adminRole: null,
    }).onConflictDoNothing();
  }

  for (const a of INITIAL_ADMINS) {
    await db.insert(schema.users).values({
      id: a.id,
      name: a.name,
      email: a.email,
      phone: '+91 98200 11223',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummyhash',
      avatarUrl: a.avatar,
      type: 'business',
      status: 'active',
      kycStatus: 'verified',
      emailSubscribed: true,
      city: 'Mumbai',
      state: 'Maharashtra',
      rating: '4.90',
      reviewCount: 38,
      businessName: 'Chillyads Staff',
      verifiedBusiness: true,
      adminRole: a.role,
    }).onConflictDoNothing();
  }

  // 2. Categories: Insert parents first, then children
  console.log('Seeding categories...');

  for (const c of INITIAL_CATEGORIES) {
    await db.insert(schema.categories).values({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      parentId: c.parentId || null,
      orderIndex: c.order || (c as any).orderIndex || 0,
      isActive: c.isActive ?? true,
      seoTitle: c.seoTitle,
      seoDescription: c.seoDescription,
      isPaid: c.isPaid ?? false,
      postingFee: String(c.postingFee || 0),
      freeListingsQuota: c.freeListingsQuota ?? 3,
    }).onConflictDoNothing();
  }

  // 3. Custom Fields (EAV)
  console.log('Seeding custom fields...');
  for (const f of INITIAL_CUSTOM_FIELDS) {
    let catId = f.categoryId;
    if (catId === 'cat_vehicles') catId = 'cat_cars';
    if (catId === 'cat_buy_and_sell') catId = 'cat_electronics';
    if (catId === 'cat_pets_animals') catId = 'cat_pets';

    await db.insert(schema.categoryCustomFields).values({
      id: f.id,
      categoryId: catId,
      name: f.name,
      label: f.label,
      type: f.type,
      options: f.options || [],
      unit: f.unit,
      required: f.required ?? false,
      filterable: f.filterable ?? true,
      orderIndex: f.orderIndex || 0,
    }).onConflictDoNothing();
  }

  // 4. Locations: Insert country first, then states, then cities, then localities
  console.log('Seeding locations...');
  for (const loc of INITIAL_LOCATIONS) {
    const anyLoc = loc as any;
    const s = anyLoc.slug || loc.name.toLowerCase().replace(/\s+/g, '-');
    const g = anyLoc.geoId || (loc.id === 'loc_in' ? 'g0' : `g_${loc.id}`);
    await db.insert(schema.locations).values({
      id: loc.id,
      type: loc.type,
      name: loc.name,
      slug: s,
      code: loc.code || null,
      geoId: g,
      parentId: loc.parentId || null,
      latitude: anyLoc.latitude || null,
      longitude: anyLoc.longitude || null,
      popular: loc.popular ?? false,
      orderIndex: anyLoc.orderIndex || anyLoc.order || 0,
    }).onConflictDoNothing();
  }

  // 5. Listings
  console.log('Seeding listings...');
  const seeded = seedCategoriesWithTenAds(INITIAL_LISTINGS);
  for (const l of seeded) {
    // Ensure seller exists
    await db.insert(schema.users).values({
      id: l.sellerId,
      name: l.sellerName,
      email: `${l.sellerId}@chillyads.com`,
      phone: l.sellerPhone || '+91 98000 00000',
      city: l.location?.city || 'Mumbai',
      state: l.location?.state || 'Maharashtra',
    }).onConflictDoNothing();

    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + 30);

    // Map categoryId if necessary
    let cId = l.categoryId;
    if (cId === 'cat_vehicles') cId = 'cat_cars';
    if (cId === 'cat_buy_and_sell') cId = 'cat_electronics';

    await db.insert(schema.listings).values({
      id: l.id,
      sellerId: l.sellerId,
      sellerName: l.sellerName,
      sellerPhone: l.sellerPhone,
      categoryId: cId,
      subcategoryId: l.subcategoryId || null,
      title: l.title,
      description: l.description,
      price: String(l.price),
      state: l.location?.state || 'Maharashtra',
      city: l.location?.city || 'Mumbai',
      locality: l.location?.locality || 'Andheri West',
      latitude: l.location?.latitude || 19.076,
      longitude: l.location?.longitude || 72.8777,
      images: l.images || [],
      customAttributes: l.customAttributes || {},
      status: l.status || 'approved',
      isFeatured: l.isFeatured ?? false,
      featuredUntil: l.featuredUntil ? new Date(l.featuredUntil) : null,
      isBoosted: l.isBoosted ?? false,
      boostStatus: l.boostStatus || 'inactive',
      boostViews: l.boostViews || 0,
      boostImpressions: l.boostImpressions || 0,
      boostClicks: l.boostClicks || 0,
      views: l.views || 0,
      likes: l.likes || 0,
      chatsCount: l.chatsCount || 0,
      spamScore: l.spamScore || 0,
      expiresAt: expiresDate,
    }).onConflictDoNothing();
  }

  // 6. Boost Packages
  console.log('Seeding boost packages...');
  for (const p of INITIAL_PACKAGES) {
    await db.insert(schema.boostPackages).values({
      id: p.id,
      name: p.name,
      badge: p.badge,
      type: p.type || 'boost',
      durationDays: p.durationDays || 1,
      durationHours: p.durationHours || 24,
      price: String(p.price),
      discountPrice: p.discountPrice ? String(p.discountPrice) : null,
      currency: p.currency || 'INR',
      features: p.features || [],
      isActive: p.isActive ?? true,
      salesCount: p.salesCount || 0,
    }).onConflictDoNothing();
  }

  // 7. Moderation Rules
  console.log('Seeding moderation rules...');
  for (const r of INITIAL_MODERATION_RULES) {
    await db.insert(schema.moderationRules).values({
      id: r.id,
      title: r.title,
      type: r.type,
      action: r.action,
      keywords: r.keywords || [],
      threshold: r.threshold ? String(r.threshold) : null,
      isActive: r.isActive ?? true,
    }).onConflictDoNothing();
  }

  // 8. Email Templates
  console.log('Seeding email templates...');
  for (const t of INITIAL_EMAIL_TEMPLATES) {
    await db.insert(schema.emailTemplates).values({
      id: t.id,
      name: t.name,
      category: t.category,
      subject: t.subject,
      bodyHtml: t.bodyHtml,
      bodyText: t.bodyText,
      actionLabel: t.actionLabel,
      actionUrl: t.actionUrl,
      variables: t.variables || [],
      isActive: t.isActive ?? true,
      isSystemDefault: t.isSystemDefault ?? false,
    }).onConflictDoNothing();
  }

  // 9. CMS Pages
  console.log('Seeding CMS pages...');
  for (const p of INITIAL_CMS_PAGES) {
    await db.insert(schema.cmsPages).values({
      id: p.id,
      slug: p.slug,
      title: p.title,
      content: p.content,
      seoTitle: (p as any).seoTitle || p.title,
      seoDescription: (p as any).seoDescription || p.title,
      isActive: p.status === 'published' || ((p as any).isActive ?? true),
    }).onConflictDoNothing();
  }

  // 10. System Settings
  console.log('Seeding system settings...');
  await db.insert(schema.systemSettings).values({
    id: 'primary',
    siteName: INITIAL_SETTINGS.siteName || 'Chillyads',
    defaultCurrency: INITIAL_SETTINGS.defaultCurrency || 'INR',
    currencySymbol: INITIAL_SETTINGS.currencySymbol || '₹',
    timezone: INITIAL_SETTINGS.timezone || 'Asia/Kolkata',
    dateFormat: INITIAL_SETTINGS.dateFormat || 'DD/MM/YYYY',
    listingDurationDays: INITIAL_SETTINGS.listingDurationDays || 30,
    freeListingsLimit: INITIAL_SETTINGS.freeListingsLimit || 3,
    extraListingFee: String(INITIAL_SETTINGS.extraListingFee || 99),
    maxPhotosPerListing: INITIAL_SETTINGS.maxPhotosPerListing || 5,
    autoApproveVerifiedUsers: INITIAL_SETTINGS.autoApproveVerifiedUsers ?? false,
    maintenanceMode: INITIAL_SETTINGS.maintenanceMode ?? false,
    watermarkImages: INITIAL_SETTINGS.watermarkImages ?? false,
    aiSpamFilterEnabled: INITIAL_SETTINGS.aiSpamFilterEnabled ?? true,
    otpLoginEnabled: INITIAL_SETTINGS.otpLoginEnabled ?? true,
    paidFeaturesConfig: INITIAL_SETTINGS.paidFeatures || (INITIAL_SETTINGS as any).paidFeaturesConfig || {},
  }).onConflictDoNothing();

  console.log('--- PostgreSQL Database Seeding Complete ---');
}
