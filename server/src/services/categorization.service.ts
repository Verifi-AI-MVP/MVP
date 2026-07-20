export const CATEGORIES = [
  'Food',
  'Rent',
  'Transport',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Healthcare',
  'Income',
  'Transfer',
  'Personal Care',
  'Education',
  'Subscriptions',
  'Insurance',
  'Fees & Charges',
  'Other',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SUBCATEGORIES: Partial<Record<Category, string[]>> = {
  Food: ['Restaurants', 'Groceries', 'Coffee', 'Alcohol', 'Fast Food'],
  Transport: ['Fuel', 'Transit', 'Parking', 'Rideshare', 'Tolls'],
  Shopping: ['Clothing', 'Electronics', 'Home', 'Online', 'General'],
  Entertainment: ['Streaming', 'Movies', 'Events', 'Games', 'Hobbies'],
  Utilities: ['Electric', 'Gas', 'Water', 'Internet', 'Phone'],
  Healthcare: ['Pharmacy', 'Doctor', 'Dental', 'Vision', 'Insurance'],
  Subscriptions: ['Streaming', 'Software', 'Memberships', 'News'],
};

export interface CategorizeInput {
  merchantName: string;
  amount: number;
  description?: string;
}

export interface CategorizationFeatures {
  merchantName: string;
  merchantNameLower: string;
  merchantTokens: string[];
  description: string;
  descriptionTokens: string[];
  amount: number;
  amountAbs: number;
  amountBucket: string;
  isCredit: boolean;
  combinedText: string;
}

export interface CategorizationResult {
  category: Category;
  subcategory: string | null;
  confidence: number;
  method: 'rule' | 'feedback' | 'ml';
  features: CategorizationFeatures;
  matchedRule?: string;
}

type Rule = {
  category: Category;
  subcategory?: string;
  keywords: string[];
  confidence: number;
  amountRange?: [number, number];
};

const RULES: Rule[] = [
  // Food
  { category: 'Food', subcategory: 'Restaurants', keywords: ['restaurant', 'cafe', 'diner', 'bistro', 'grill', 'pizzeria', 'sushi', 'mcdonald', 'burger', 'wendy', 'taco', 'chipotle', 'panera'], confidence: 0.95 },
  { category: 'Food', subcategory: 'Coffee', keywords: ['starbucks', 'dunkin', 'coffee', 'espresso', 'costa'], confidence: 0.95 },
  { category: 'Food', subcategory: 'Groceries', keywords: ['whole foods', 'trader joe', 'safeway', 'kroger', 'albertsons', 'publix', 'costco', 'walmart', 'target', 'grocery', 'supermarket'], confidence: 0.9 },
  { category: 'Food', subcategory: 'Fast Food', keywords: ['mcdonald', 'burger king', 'wendy', 'kfc', 'subway', 'domino', 'papa john', 'pizza hut'], confidence: 0.92 },
  { category: 'Food', subcategory: 'Alcohol', keywords: ['liquor', 'wine', 'beer', 'bar ', 'pub ', 'tavern'], confidence: 0.9 },

  // Rent
  { category: 'Rent', keywords: ['rent', 'lease', 'landlord', 'apartment', 'housing'], confidence: 0.95 },
  { category: 'Rent', keywords: ['zillow', 'apartments.com', 'redfin'], confidence: 0.85 },

  // Transport
  { category: 'Transport', subcategory: 'Fuel', keywords: ['shell', 'chevron', 'exxon', 'bp ', 'gas station', 'fuel', 'esso', 'mobil'], confidence: 0.95 },
  { category: 'Transport', subcategory: 'Rideshare', keywords: ['uber', 'lyft', 'grab'], confidence: 0.98 },
  { category: 'Transport', subcategory: 'Transit', keywords: ['metro', 'bus ', 'train', 'transit', 'mta', 'barta', 'tfl'], confidence: 0.9 },
  { category: 'Transport', subcategory: 'Parking', keywords: ['parking', 'parkmobile', 'spothero'], confidence: 0.9 },
  { category: 'Transport', subcategory: 'Tolls', keywords: ['toll', 'ezpass', 'fastrak', 'sunpass'], confidence: 0.95 },

  // Shopping
  { category: 'Shopping', subcategory: 'Online', keywords: ['amazon', 'ebay', 'etsy', 'aliexpress'], confidence: 0.9 },
  { category: 'Shopping', subcategory: 'Clothing', keywords: ['nike', 'adidas', 'zara', 'h&m', 'gap', 'old navy', 'nordstrom', 'macys'], confidence: 0.9 },
  { category: 'Shopping', subcategory: 'Electronics', keywords: ['apple ', 'best buy', 'newegg', 'microcenter'], confidence: 0.92 },
  { category: 'Shopping', subcategory: 'General', keywords: ['target', 'walmart', 'costco', 'home depot', 'lowes', 'ikea'], confidence: 0.75 },

  // Entertainment
  { category: 'Entertainment', subcategory: 'Streaming', keywords: ['netflix', 'spotify', 'disney', 'hulu', 'hbo', 'paramount', 'youtube', 'prime video'], confidence: 0.98 },
  { category: 'Entertainment', subcategory: 'Movies', keywords: ['amc', 'regal', 'cinemark', 'movie', 'theater'], confidence: 0.92 },
  { category: 'Entertainment', subcategory: 'Events', keywords: ['ticketmaster', 'eventbrite', 'stubhub', 'concert', 'show'], confidence: 0.88 },
  { category: 'Entertainment', subcategory: 'Games', keywords: ['steam', 'playstation', 'xbox', 'nintendo', 'epic games'], confidence: 0.95 },

  // Utilities
  { category: 'Utilities', subcategory: 'Electric', keywords: ['electric', 'electricity', 'pge', 'coned', 'duke energy'], confidence: 0.95 },
  { category: 'Utilities', subcategory: 'Gas', keywords: ['gas utility', 'natural gas', 'gas bill'], confidence: 0.9 },
  { category: 'Utilities', subcategory: 'Water', keywords: ['water bill', 'water utility'], confidence: 0.95 },
  { category: 'Utilities', subcategory: 'Internet', keywords: ['comcast', 'verizon fios', 'at&t', 'spectrum', 'xfinity', 'internet'], confidence: 0.9 },
  { category: 'Utilities', subcategory: 'Phone', keywords: ['verizon', 'at&t', 't-mobile', 'sprint', 'mobile bill', 'phone bill'], confidence: 0.9 },

  // Healthcare
  { category: 'Healthcare', subcategory: 'Pharmacy', keywords: ['cvs', 'walgreens', 'rite aid', 'pharmacy'], confidence: 0.9 },
  { category: 'Healthcare', subcategory: 'Doctor', keywords: ['doctor', 'medical', 'hospital', 'clinic', 'physician'], confidence: 0.85 },
  { category: 'Healthcare', subcategory: 'Dental', keywords: ['dental', 'dentist'], confidence: 0.95 },
  { category: 'Healthcare', subcategory: 'Insurance', keywords: ['health insurance', 'medical insurance'], confidence: 0.9 },

  // Subscriptions
  { category: 'Subscriptions', keywords: ['subscription', 'monthly', 'annual plan', 'membership'], confidence: 0.7 },

  // Insurance
  { category: 'Insurance', keywords: ['insurance', 'geico', 'state farm', 'allstate', 'progressive', 'liberty mutual'], confidence: 0.92 },

  // Fees & Charges
  { category: 'Fees & Charges', keywords: ['fee', 'charge', 'overdraft', 'atm', 'service charge'], confidence: 0.85 },
  { category: 'Fees & Charges', subcategory: 'ATM', keywords: ['atm fee', 'atm withdrawal'], confidence: 0.95 },

  // Income
  { category: 'Income', keywords: ['payroll', 'salary', 'direct dep', 'direct deposit', 'deposit', 'income'], confidence: 0.85, amountRange: [0, 100000] },

  // Personal Care
  { category: 'Personal Care', keywords: ['gym', 'fitness', 'yoga', 'spa', 'salon', 'barber', 'haircut'], confidence: 0.88 },

  // Education
  { category: 'Education', keywords: ['university', 'college', 'school', 'tuition', 'coursera', 'udemy', 'edx'], confidence: 0.9 },

  // Transfer
  { category: 'Transfer', keywords: ['transfer', 'zelle', 'venmo', 'paypal', 'cash app'], confidence: 0.75 },
];

function getAmountBucket(amount: number): string {
  const abs = Math.abs(amount);
  if (abs < 10) return '0-10';
  if (abs < 50) return '10-50';
  if (abs < 100) return '50-100';
  if (abs < 500) return '100-500';
  return '500+';
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function buildFeatures(input: CategorizeInput): CategorizationFeatures {
  const merchant = (input.merchantName || '').trim();
  const desc = (input.description || '').trim();
  const combined = [merchant, desc].filter(Boolean).join(' ').toLowerCase();
  const amount = Number(input.amount);

  return {
    merchantName: merchant,
    merchantNameLower: merchant.toLowerCase(),
    merchantTokens: tokenize(merchant),
    description: desc,
    descriptionTokens: tokenize(desc),
    amount,
    amountAbs: Math.abs(amount),
    amountBucket: getAmountBucket(amount),
    isCredit: amount > 0,
    combinedText: combined,
  };
}

/**
 * Rule-based categorization. Returns ML-ready result.
 */
export function categorize(input: CategorizeInput): CategorizationResult {
  const features = buildFeatures(input);
  const text = features.combinedText;

  if (!text || text.length < 2) {
    return {
      category: 'Other',
      subcategory: null,
      confidence: 0.2,
      method: 'rule',
      features,
    };
  }

  for (const rule of RULES) {
    if (rule.amountRange) {
      const [min, max] = rule.amountRange;
      const abs = features.amountAbs;
      if (features.isCredit && (abs < min || abs > max)) continue;
    }

    const matched = rule.keywords.some((kw) => text.includes(kw.toLowerCase()));
    if (matched) {
      return {
        category: rule.category,
        subcategory: rule.subcategory ?? null,
        confidence: rule.confidence,
        method: 'rule',
        features,
        matchedRule: rule.keywords.find((kw) => text.includes(kw.toLowerCase())),
      };
    }
  }

  if (features.isCredit && features.amountAbs > 100) {
    return { category: 'Income', subcategory: null, confidence: 0.5, method: 'rule', features };
  }

  return {
    category: 'Other',
    subcategory: null,
    confidence: 0.3,
    method: 'rule',
    features,
  };
}
