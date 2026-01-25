/**
 * Notification Parser Utility
 * 
 * Parses UPI payment notifications to extract amount and sender information.
 * Supports PhonePe, Google Pay, Paytm, and BHIM notifications.
 */

import type {
    NotificationPayload,
    ParsedNotification,
    UPISource
} from '../types';
import { PACKAGE_TO_SOURCE } from '../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Keywords that indicate a failed or non-completed transaction.
 * If any of these are found, amount should not be announced.
 */
const FAILURE_KEYWORDS = [
  'failed',
  'failure',
  'declined',
  'rejected',
  'cancelled',
  'canceled',
  'refund',
  'reversed',
  'pending',
  'processing',
  'initiated',
  'request',
  'requested',
  'expired',
  'timeout',
  'insufficient',
] as const;

/**
 * Keywords that indicate a successful payment receipt.
 */
const SUCCESS_KEYWORDS = [
  'received',
  'credited',
  'successful',
  'success',
  'completed',
  'paid',
  'got',
  'added',
] as const;

/**
 * Keywords that indicate money was sent (not received).
 * We typically don't want to announce outgoing payments.
 */
const SENT_KEYWORDS = [
  'sent to',
  'paid to',
  'transferred to',
  'debited',
  'debit',
] as const;

// ============================================================================
// REGEX PATTERNS
// ============================================================================

/**
 * Patterns for extracting monetary amounts.
 */
const AMOUNT_PATTERNS = {
  /**
   * Primary pattern: ₹ symbol followed by amount
   * Matches: ₹500, ₹1,234, ₹1,234.50, ₹ 500
   */
  rupeeSymbol: /₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)/gi,
  
  /**
   * Rs./RS./Rupees prefix pattern
   * Matches: Rs. 500, RS 1234, Rupees 500.50, Rs.500
   */
  rsPrefix: /(?:Rs\.?|RS\.?|Rupees?)\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)/gi,
  
  /**
   * INR prefix pattern
   * Matches: INR 500, INR1234.50
   */
  inrPrefix: /INR\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)/gi,
  
  /**
   * Amount followed by rupees/rs (Hindi-style)
   * Matches: 500 rupees, 1234 rs
   */
  suffixPattern: /([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)\s*(?:rupees?|rs\.?)/gi,
} as const;

/**
 * Patterns for extracting sender/payer name.
 */
const SENDER_PATTERNS = [
  // "from [Name]" pattern
  /(?:from|by)\s+([A-Za-z][A-Za-z\s.]{1,35}?)(?:\s+(?:on|via|to|for|using|through)|[.,!]|$)/i,
  
  // "received from [Name]" pattern
  /received\s+(?:from\s+)?([A-Za-z][A-Za-z\s.]{1,35}?)(?:\s+(?:on|via|to|for)|[.,!]|$)/i,
  
  // "[Name] paid you" pattern
  /([A-Za-z][A-Za-z\s.]{1,35}?)\s+(?:paid|sent|transferred)\s+(?:you|₹|Rs)/i,
  
  // "Payment from [Name]" pattern
  /payment\s+from\s+([A-Za-z][A-Za-z\s.]{1,35}?)(?:\s|[.,!]|$)/i,
] as const;

// ============================================================================
// MAIN PARSER FUNCTION
// ============================================================================

/**
 * Parses a notification payload to extract payment information.
 * 
 * @param payload - Raw notification from native layer
 * @returns Parsed notification with extracted amount and sender
 * 
 * @example
 * ```typescript
 * const result = parseNotification({
 *   packageName: 'com.phonepe.app',
 *   title: 'Payment Received',
 *   text: '₹500 received from John Doe',
 *   timestamp: Date.now()
 * });
 * // result.amount === 500
 * // result.sender === 'John Doe'
 * ```
 */
export function parseNotification(payload: NotificationPayload): ParsedNotification {
  const source = getSourceFromPackage(payload.packageName);
  
  // Combine title and text for comprehensive parsing
  const combinedText = `${payload.title} ${payload.text}`.trim();
  const lowerText = combinedText.toLowerCase();
  
  // Check if this is a successful received payment
  const isSuccessful = checkIsSuccessfulPayment(lowerText);
  
  // Extract amount using source-specific or generic parser
  let amount: number | null = null;
  
  if (isSuccessful) {
    amount = extractAmount(combinedText, source);
  }
  
  // Extract sender name
  const sender = extractSender(combinedText);
  
  return {
    amount,
    currency: 'INR',
    sender,
    source,
    rawText: combinedText,
    isSuccessful,
    parsedAt: Date.now(),
  };
}

// ============================================================================
// SOURCE DETECTION
// ============================================================================

/**
 * Maps an Android package name to a UPI source identifier.
 * 
 * @param packageName - Android package name
 * @returns UPI source identifier
 */
export function getSourceFromPackage(packageName: string): UPISource {
  return PACKAGE_TO_SOURCE[packageName] ?? 'unknown';
}

// ============================================================================
// SUCCESS/FAILURE DETECTION
// ============================================================================

/**
 * Determines if a notification represents a successful payment receipt.
 * 
 * @param lowerText - Lowercase notification text
 * @returns true if this appears to be a successful received payment
 */
function checkIsSuccessfulPayment(lowerText: string): boolean {
  // Check for failure keywords first
  for (const keyword of FAILURE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return false;
    }
  }
  
  // Check for sent/outgoing keywords (we don't announce these)
  for (const keyword of SENT_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return false;
    }
  }
  
  // Check for success keywords
  for (const keyword of SUCCESS_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return true;
    }
  }
  
  // If no clear indicator, assume it might be valid
  // (some notifications don't have explicit success keywords)
  return true;
}

// ============================================================================
// AMOUNT EXTRACTION
// ============================================================================

/**
 * Extracts payment amount from notification text.
 * Uses source-specific parser when available, with generic fallback.
 * 
 * @param text - Notification text (combined title + body)
 * @param source - UPI source for app-specific parsing
 * @returns Extracted amount or null if not found
 */
function extractAmount(text: string, source: UPISource): number | null {
  // Try source-specific parser first
  let amount: number | null = null;
  
  switch (source) {
    case 'phonepe':
      amount = parsePhonePe(text);
      break;
    case 'gpay':
      amount = parseGooglePay(text);
      break;
    case 'paytm':
      amount = parsePaytm(text);
      break;
    case 'bhim':
      amount = parseBHIM(text);
      break;
    default:
      break;
  }
  
  // If source-specific parser failed, try generic extraction
  if (amount === null) {
    amount = extractGenericAmount(text);
  }
  
  // Validate the extracted amount
  if (amount !== null && !validateAmount(amount)) {
    return null;
  }
  
  return amount;
}

/**
 * Generic amount extraction using all regex patterns.
 * 
 * @param text - Text to search for amounts
 * @returns First valid amount found, or null
 */
function extractGenericAmount(text: string): number | null {
  // Try each pattern in order of specificity
  const patterns = [
    AMOUNT_PATTERNS.rupeeSymbol,
    AMOUNT_PATTERNS.rsPrefix,
    AMOUNT_PATTERNS.inrPrefix,
    AMOUNT_PATTERNS.suffixPattern,
  ];
  
  for (const pattern of patterns) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    
    if (match && match[1]) {
      const amount = cleanAmountString(match[1]);
      if (validateAmount(amount)) {
        return amount;
      }
    }
  }
  
  return null;
}

// ============================================================================
// APP-SPECIFIC PARSERS
// ============================================================================

/**
 * Parses PhonePe notification format.
 * 
 * Common patterns:
 * - "₹500 received from Merchant Name"
 * - "Rupees 1,234 credited"
 * - "You've received ₹50.50"
 * - "₹1,000 added to your wallet"
 */
function parsePhonePe(text: string): number | null {
  // PhonePe typically uses ₹ symbol
  const patterns = [
    /₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)\s*(?:received|credited|added)/i,
    /received\s*₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)/i,
    /₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)/i,
  ];
  
  return tryPatterns(text, patterns);
}

/**
 * Parses Google Pay notification format.
 * 
 * Common patterns:
 * - "Payment of ₹1,200 successful"
 * - "You received ₹500.00"
 * - "₹2,500 sent to you"
 * - "Received ₹100 from Contact"
 */
function parseGooglePay(text: string): number | null {
  const patterns = [
    /received\s*₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)/i,
    /₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)\s*(?:received|credited)/i,
    /payment\s*(?:of\s*)?₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)/i,
    /₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)\s*(?:sent\s+to\s+you)/i,
  ];
  
  return tryPatterns(text, patterns);
}

/**
 * Parses Paytm notification format.
 * 
 * Common patterns:
 * - "₹50 received on Paytm"
 * - "Paytm payment of Rs. 1000 received"
 * - "You got ₹750.50"
 * - "Rs 500 credited to Paytm Wallet"
 */
function parsePaytm(text: string): number | null {
  const patterns = [
    /₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)\s*(?:received|credited|got)/i,
    /(?:Rs\.?|RS\.?)\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)\s*(?:received|credited)/i,
    /got\s*₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)/i,
    /payment\s*of\s*(?:Rs\.?|₹)\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)/i,
  ];
  
  return tryPatterns(text, patterns);
}

/**
 * Parses BHIM notification format.
 * 
 * Common patterns:
 * - "₹300 credited to account"
 * - "Amount received: ₹1,500"
 * - "BHIM UPI: ₹200 received"
 * - "₹1000 received via UPI"
 */
function parseBHIM(text: string): number | null {
  const patterns = [
    /₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)\s*(?:credited|received)/i,
    /(?:received|amount)[:\s]*₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)/i,
    /BHIM\s*(?:UPI)?[:\s]*₹\s*([0-9]{1,3}(?:,?[0-9]{2,3})*(?:\.[0-9]{1,2})?)/i,
  ];
  
  return tryPatterns(text, patterns);
}

/**
 * Tries multiple regex patterns and returns first valid amount.
 */
function tryPatterns(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      const amount = cleanAmountString(match[1]);
      if (validateAmount(amount)) {
        return amount;
      }
    }
  }
  return null;
}

// ============================================================================
// SENDER EXTRACTION
// ============================================================================

/**
 * Extracts sender/payer name from notification text.
 * 
 * @param text - Notification text
 * @returns Extracted sender name or undefined
 */
function extractSender(text: string): string | undefined {
  for (const pattern of SENDER_PATTERNS) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      const sender = cleanSenderName(match[1]);
      if (sender && sender.length >= 2) {
        return sender;
      }
    }
  }
  return undefined;
}

/**
 * Cleans and normalizes extracted sender name.
 */
function cleanSenderName(name: string): string {
  return name
    .trim()
    // Remove trailing punctuation
    .replace(/[.,!?:;]+$/, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Title case
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Cleans an amount string and converts to number.
 * Handles Indian and Western comma formats.
 * 
 * @param amountStr - Raw amount string (e.g., "1,234.50")
 * @returns Cleaned number value
 */
function cleanAmountString(amountStr: string): number {
  // Remove all non-numeric characters except decimal point
  const cleaned = amountStr
    .replace(/[₹Rs.\s]/gi, '')  // Remove currency symbols and spaces
    .replace(/,/g, '');          // Remove commas
  
  const amount = parseFloat(cleaned);
  
  // Handle NaN
  if (isNaN(amount)) {
    return 0;
  }
  
  // Round to 2 decimal places to avoid floating point issues
  return Math.round(amount * 100) / 100;
}

/**
 * Validates that an amount is within acceptable range.
 * 
 * @param amount - Amount to validate
 * @returns true if amount is valid for announcement
 */
function validateAmount(amount: number): boolean {
  // Must be positive
  if (amount <= 0) {
    return false;
  }
  
  // Must be at least ₹1
  if (amount < 1) {
    return false;
  }
  
  // Must be under ₹1 crore (reasonable limit)
  if (amount > 10000000) {
    return false;
  }
  
  // Must not be a suspiciously round number that might be a phone number
  // (10-digit numbers starting with 6-9)
  if (amount >= 6000000000 && amount <= 9999999999) {
    return false;
  }
  
  return true;
}

// ============================================================================
// TEST UTILITIES (Development only)
// ============================================================================

/**
 * Test case interface for parser validation.
 */
interface ParserTestCase {
  input: NotificationPayload;
  expectedAmount: number | null;
  expectedSender?: string;
  description: string;
}

/**
 * Test cases for the parser.
 * Use these to validate parser functionality during development.
 */
export const TEST_CASES: ParserTestCase[] = [
  {
    description: 'PhonePe - Basic amount with sender',
    input: {
      packageName: 'com.phonepe.app',
      title: 'Payment Received',
      text: '₹1,234.50 received from Rajesh Kumar',
      timestamp: Date.now(),
    },
    expectedAmount: 1234.50,
    expectedSender: 'Rajesh Kumar',
  },
  {
    description: 'Google Pay - Payment successful',
    input: {
      packageName: 'com.google.android.apps.nbu.paisa.user',
      title: 'Payment successful',
      text: 'Payment of ₹500 to you was successful',
      timestamp: Date.now(),
    },
    expectedAmount: 500,
    expectedSender: undefined,
  },
  {
    description: 'Paytm - Rs. format with commas',
    input: {
      packageName: 'net.one97.paytm',
      title: 'Money Received',
      text: 'Rs. 12,500 received on Paytm from Amit',
      timestamp: Date.now(),
    },
    expectedAmount: 12500,
    expectedSender: 'Amit',
  },
  {
    description: 'BHIM - Credited format',
    input: {
      packageName: 'in.org.npci.upiapp',
      title: 'BHIM UPI',
      text: '₹300 credited to account from Priya',
      timestamp: Date.now(),
    },
    expectedAmount: 300,
    expectedSender: 'Priya',
  },
  {
    description: 'Failed transaction - should return null',
    input: {
      packageName: 'com.phonepe.app',
      title: 'Payment Failed',
      text: '₹200 payment failed',
      timestamp: Date.now(),
    },
    expectedAmount: null,
  },
  {
    description: 'Pending transaction - should return null',
    input: {
      packageName: 'com.google.android.apps.nbu.paisa.user',
      title: 'Payment Pending',
      text: '₹1000 payment is pending',
      timestamp: Date.now(),
    },
    expectedAmount: null,
  },
  {
    description: 'Refund - should return null',
    input: {
      packageName: 'net.one97.paytm',
      title: 'Refund',
      text: '₹500 refund initiated',
      timestamp: Date.now(),
    },
    expectedAmount: null,
  },
  {
    description: 'No amount in text',
    input: {
      packageName: 'in.org.npci.upiapp',
      title: 'UPI Request',
      text: 'You have a payment request',
      timestamp: Date.now(),
    },
    expectedAmount: null,
  },
  {
    description: 'Decimal amount',
    input: {
      packageName: 'com.phonepe.app',
      title: 'Received',
      text: '₹99.99 received',
      timestamp: Date.now(),
    },
    expectedAmount: 99.99,
  },
  {
    description: 'Large amount with Indian comma format',
    input: {
      packageName: 'com.google.android.apps.nbu.paisa.user',
      title: 'Payment',
      text: '₹1,50,000 received from Business Account',
      timestamp: Date.now(),
    },
    expectedAmount: 150000,
    expectedSender: 'Business Account',
  },
  {
    description: 'Sent payment - should return null (outgoing)',
    input: {
      packageName: 'com.phonepe.app',
      title: 'Payment Sent',
      text: '₹500 sent to Merchant',
      timestamp: Date.now(),
    },
    expectedAmount: null,
  },
];

/**
 * Test result interface.
 */
interface ParserTestResult {
  description: string;
  passed: boolean;
  expected: number | null;
  actual: number | null;
}

/**
 * Runs all test cases and returns results.
 * For development/debugging purposes.
 */
export function runParserTests(): ParserTestResult[] {
  return TEST_CASES.map(testCase => {
    const result = parseNotification(testCase.input);
    const passed = result.amount === testCase.expectedAmount;
    
    return {
      description: testCase.description,
      passed,
      expected: testCase.expectedAmount,
      actual: result.amount,
    };
  });
}
