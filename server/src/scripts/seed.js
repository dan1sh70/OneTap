require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const VendorProfile = require('../models/VendorProfile');
const Category = require('../models/Category');
const Listing = require('../models/Listing');
const ServicePackage = require('../models/ServicePackage');
const PropertyListing = require('../models/PropertyListing');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const Campaign = require('../models/Campaign');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/onetap365';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to database.');

    // 1. Subscription Plans (Baseline v1.1)
    await SubscriptionPlan.deleteMany({});
    const plans = await SubscriptionPlan.create([
      {
        planKey: 'BASIC',
        version: 1,
        title: 'Basic Vendor Plan',
        pricePaise: 49900, // Rs. 499
        durationDays: 30,
        productListingCap: 10,
        leadAccessUnlocked: true,
        boostDaysAllowance: 0,
        description: 'Up to 10 active listings and full consented lead access for 30 days',
      },
      {
        planKey: 'PREMIUM',
        version: 1,
        title: 'Premium Growth Plan',
        pricePaise: 99900, // Rs. 999
        durationDays: 30,
        productListingCap: 50,
        leadAccessUnlocked: true,
        boostDaysAllowance: 5,
        description: 'Up to 50 active listings, consented lead access, and 5 featured boost days',
      },
      {
        planKey: 'PROPERTY_ASSIST',
        version: 1,
        title: 'Property Vendor Assist Package',
        pricePaise: 299900, // Rs. 2999
        durationDays: 30,
        productListingCap: 5,
        leadAccessUnlocked: true,
        boostDaysAllowance: 10,
        description: 'Dedicated property manager assistance, shortlisting, visits coordination for 30 days',
      },
    ]);
    console.log(`[Seed] Seeded ${plans.length} subscription plans.`);

    // 2. Categories
    await Category.deleteMany({});
    const categories = await Category.create([
      { name: 'Electronics & Mobiles', slug: 'electronics-mobiles', vertical: 'product' },
      { name: 'Vehicles & Bikes', slug: 'vehicles-bikes', vertical: 'product' },
      { name: 'Home Appliances', slug: 'home-appliances', vertical: 'product' },
      { name: 'Home Cleaning & Maid', slug: 'home-cleaning', vertical: 'service' },
      { name: 'Electrician & Plumbing', slug: 'electrician-plumbing', vertical: 'service' },
      { name: 'Appliance Repair', slug: 'appliance-repair', vertical: 'service' },
      { name: 'Apartments & Flats', slug: 'apartments-flats', vertical: 'property' },
      { name: 'Plots & Land', slug: 'plots-land', vertical: 'property' },
      { name: 'Commercial Spaces', slug: 'commercial-spaces', vertical: 'property' },
    ]);
    console.log(`[Seed] Seeded ${categories.length} categories across all 3 verticals.`);

    // 3. Admin User
    await User.deleteMany({ phone: '9999999999' });
    const adminUser = await User.create({
      phone: '9999999999',
      password: 'AdminOneTap@365',
      fullName: 'System Administrator',
      roles: ['admin', 'moderator', 'manager', 'finance'],
      isPhoneVerified: true,
      defaultLocation: { city: 'Guwahati', pincode: '781001', coordinates: [91.7362, 26.1445] },
    });
    console.log(`[Seed] Created admin account: ${adminUser.phone}`);

    // 4. Sample Vendor Account
    await User.deleteMany({ phone: '8888888888' });
    const vendorUser = await User.create({
      phone: '8888888888',
      password: 'VendorOneTap@365',
      fullName: 'John Tech Store',
      roles: ['customer', 'vendor'],
      isPhoneVerified: true,
      defaultLocation: { city: 'Guwahati', pincode: '781005', coordinates: [91.7362, 26.1445] },
    });

    await VendorProfile.deleteMany({ userId: vendorUser._id });
    const vendorProfile = await VendorProfile.create({
      userId: vendorUser._id,
      businessName: 'Guwahati Tech Hub & Gadgets',
      businessPhone: '+91 98765 43210', // Public visible business contact
      isBusinessPhoneVerified: true,
      businessEmail: 'contact@guwahatitechhub.com',
      description: 'Authorized retailer and verified refurbisher of premium gadgets and electronics.',
      address: {
        street: 'GS Road, Christian Basti',
        locality: 'Christian Basti',
        city: 'Guwahati',
        state: 'Assam',
        pincode: '781005',
        location: { type: 'Point', coordinates: [91.7777, 26.155] },
      },
      verificationStatus: 'approved',
      badges: {
        isIdentityVerified: true,
        isBankVerified: true,
        is365Recommended: true,
      },
      promotionalCreditsPaise: 50000, // 500 Rs bonus
    });
    console.log(`[Seed] Created vendor profile: ${vendorProfile.businessName}`);

    // 5. Seed Product Listing
    await Listing.deleteMany({ vendorId: vendorProfile._id });
    await Listing.create({
      vendorId: vendorProfile._id,
      title: 'iPhone 14 Pro 128GB Space Black - Like New',
      categoryId: categories[0]._id,
      pricePaise: 6800000, // Rs. 68,000
      isNegotiable: true,
      condition: 'like_new',
      description: 'Used for 4 months, battery health 98%, with original box and cable. Bill available.',
      images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600'],
      locality: 'Christian Basti',
      city: 'Guwahati',
      location: { type: 'Point', coordinates: [91.7777, 26.155] },
      contactPreference: 'call_and_enquiry',
      status: 'active',
      isBoosted: true,
    });

    // 6. Seed Service Package
    await ServicePackage.deleteMany({ vendorId: vendorProfile._id });
    await ServicePackage.create({
      vendorId: vendorProfile._id,
      title: 'Doorstep AC Deep Cleaning & Servicing',
      categoryId: categories[3]._id,
      priceType: 'fixed',
      pricePaise: 49900, // Rs. 499
      description: 'Jet pump foam wash, indoor unit filtration cleaning, outdoor gas check, and cooling test.',
      inclusions: ['Complete coil wash', 'Filter antibacterial sanitization', 'Gas pressure check'],
      exclusions: ['Gas refill / spare parts'],
      serviceableAreas: ['Guwahati', 'Dispur', 'Ulubari'],
      workingHours: { from: '08:00', to: '19:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
      status: 'active',
    });

    // 7. Seed Property Listing
    await PropertyListing.deleteMany({ vendorId: vendorProfile._id });
    await PropertyListing.create({
      vendorId: vendorProfile._id,
      title: 'Luxury 3 BHK Flat in Beltola with Modern Amenities',
      transactionType: 'buy',
      propertyType: 'apartment',
      userType: 'broker',
      pricePaise: 750000000, // Rs. 75,00,000
      carpetAreaSqFt: 1450,
      bedrooms: 3,
      bathrooms: 2,
      locality: 'Beltola',
      city: 'Guwahati',
      location: { type: 'Point', coordinates: [91.79, 26.13] },
      description: 'East-facing 3 BHK semi-furnished apartment on 4th floor with covered car parking and lift.',
      images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600'],
      reraRegistered: true,
      reraNumber: 'RERA-ASSAM-2024-0042',
      status: 'active',
    });

    // 8. Seed Fixed-Duration Hero Campaign Banner
    await Campaign.deleteMany({});
    await Campaign.create({
      title: 'Guwahati Grand Launch Fest - Zero Commission Marketplace',
      placementKey: 'HOME_HERO',
      advertiserName: 'One Tap 365 Team',
      creativeUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200',
      ctaText: 'Explore Free Listings',
      destinationUrl: '/listings',
      targetCity: 'Guwahati',
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      priority: 10,
      status: 'active',
    });

    console.log('[Seed] Database successfully seeded with baseline data.');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error]: ${error.message}`);
    process.exit(1);
  }
};

seedData();
