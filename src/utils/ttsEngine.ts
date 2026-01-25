/**
 * Text-to-Speech Engine for UPI Soundbox
 * 
 * Handles audio announcements of payment amounts in multiple Indian languages.
 * Supports English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, 
 * Kannada, Malayalam, Punjabi, and Odia.
 */

import * as Speech from 'expo-speech';
import type { Language, TTSOptions } from '../types';
import { DEFAULT_TTS_OPTIONS } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface QueuedAnnouncement {
  amount: number;
  language: Language;
  options?: TTSOptions;
  timestamp: number;
}

// ============================================================================
// NUMBER WORD MAPPINGS
// ============================================================================

/**
 * English number words
 */
const ENGLISH = {
  ones: ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
  teens: ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'],
  tens: ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'],
  hundred: 'hundred',
  thousand: 'thousand',
  lakh: 'lakh',
  crore: 'crore',
  and: 'and',
  rupees: 'rupees',
  paise: 'paise',
  received: 'Received',
  point: 'point',
};

/**
 * Hindi number words (Roman script for TTS compatibility)
 */
const HINDI = {
  ones: ['', 'ek', 'do', 'teen', 'chaar', 'paanch', 'chhah', 'saat', 'aath', 'nau'],
  teens: ['das', 'gyaarah', 'baarah', 'terah', 'chaudah', 'pandrah', 'solah', 'satrah', 'athaarah', 'unnees'],
  tens: ['', '', 'bees', 'tees', 'chaalis', 'pachaas', 'saath', 'sattar', 'assi', 'nabbe'],
  // Special Hindi numbers 21-99 (irregular)
  twenties: ['bees', 'ikkees', 'baaees', 'teis', 'chaubees', 'pachchees', 'chhabbees', 'sattaees', 'atthaees', 'untees'],
  thirties: ['tees', 'ikatees', 'battees', 'taintees', 'chauntees', 'paintees', 'chhattees', 'saintees', 'adtees', 'untaalees'],
  forties: ['chaalis', 'iktaalis', 'bayaalis', 'taintaalis', 'chawaalis', 'paintaalis', 'chhiyaalis', 'saintaalis', 'adtaalis', 'unchaas'],
  fifties: ['pachaas', 'ikyaawan', 'baawan', 'tirpan', 'chauwan', 'pachpan', 'chhappan', 'sattaawan', 'atthaawan', 'unsath'],
  sixties: ['saath', 'iksath', 'baasath', 'tirsath', 'chaunsath', 'painsath', 'chhiyaasath', 'sarsath', 'adsath', 'unhattar'],
  seventies: ['sattar', 'ikattar', 'bahattar', 'tihattar', 'chauhattar', 'pachhattar', 'chhihattar', 'sathattar', 'athhattar', 'unyaasi'],
  eighties: ['assi', 'ikyaasi', 'bayaasi', 'tiraasi', 'chauraasi', 'pachaasi', 'chhiyaasi', 'sataasi', 'atthaasi', 'nawaasi'],
  nineties: ['nabbe', 'ikyaanbe', 'baanbe', 'tiraanbe', 'chauraanbe', 'pachaanbe', 'chhiyaanbe', 'sattaanbe', 'atthaanbe', 'ninyaanbe'],
  hundred: 'sau',
  thousand: 'hazaar',
  lakh: 'lakh',
  crore: 'crore',
  and: 'aur',
  rupees: 'rupaye',
  paise: 'paise',
  received: 'prapt hue',
  point: 'dashmlav',
};

/**
 * Bengali number words (Roman script for TTS)
 */
const BENGALI = {
  ones: ['', 'ek', 'dui', 'tin', 'char', 'paanch', 'chhoy', 'saat', 'aat', 'noy'],
  teens: ['dosh', 'egaro', 'baro', 'tero', 'choddo', 'ponero', 'sholo', 'shotero', 'atharo', 'unish'],
  tens: ['', '', 'kuri', 'trish', 'chollish', 'ponchash', 'shaath', 'shottor', 'ashi', 'nobboi'],
  hundred: 'sho',
  thousand: 'hajar',
  lakh: 'lakh',
  crore: 'koti',
  and: 'ebong',
  rupees: 'taka',
  paise: 'poisha',
  received: 'pawa gechhe',
  point: 'doshomik',
};

/**
 * Tamil number words (Roman script for TTS)
 */
const TAMIL = {
  ones: ['', 'ondru', 'irandu', 'moondru', 'naangu', 'ainthu', 'aaru', 'ezhu', 'ettu', 'onbadhu'],
  teens: ['pathu', 'pathinondru', 'pannirandu', 'pathimoondru', 'pathinaangu', 'pathinainthu', 'pathinaaru', 'pathinezhu', 'pathinettu', 'pathonbadhu'],
  tens: ['', '', 'irupadhu', 'muppadhu', 'naarpadhu', 'aimpadhu', 'arupadhu', 'ezhupadhu', 'enbadhu', 'thonnuru'],
  hundred: 'nooru',
  thousand: 'aayiram',
  lakh: 'latcham',
  crore: 'kodi',
  and: 'matrum',
  rupees: 'rubai',
  paise: 'paisa',
  received: 'vaangappattathu',
  point: 'pulli',
};

/**
 * Telugu number words (Roman script for TTS)
 */
const TELUGU = {
  ones: ['', 'okati', 'rendu', 'mudu', 'nalugu', 'aidu', 'aaru', 'edu', 'enimidi', 'tommidi'],
  teens: ['padi', 'padakondu', 'pannendu', 'padamudu', 'padanalugu', 'padihenu', 'padhaaru', 'padiheedu', 'paddenimidi', 'pandommidi'],
  tens: ['', '', 'iravai', 'muppai', 'nalabhai', 'yabhai', 'aravai', 'debbai', 'enabhai', 'tombhai'],
  hundred: 'vanda',
  thousand: 'veyyi',
  lakh: 'laksha',
  crore: 'koti',
  and: 'mariyu',
  rupees: 'rupayalu',
  paise: 'paise',
  received: 'vacchayi',
  point: 'bindu',
};

/**
 * Marathi number words (Roman script for TTS)
 */
const MARATHI = {
  ones: ['', 'ek', 'don', 'teen', 'chaar', 'paach', 'saha', 'saat', 'aath', 'nau'],
  teens: ['daha', 'akra', 'bara', 'tera', 'chauda', 'pandhra', 'sola', 'satra', 'athara', 'ekonavis'],
  tens: ['', '', 'vees', 'tees', 'chalis', 'pannas', 'saath', 'sattar', 'ainshi', 'navvad'],
  hundred: 'shambhar',
  thousand: 'hazaar',
  lakh: 'lakh',
  crore: 'koti',
  and: 'aani',
  rupees: 'rupaye',
  paise: 'paise',
  received: 'milale',
  point: 'dashank',
};

/**
 * Gujarati number words (Roman script for TTS)
 */
const GUJARATI = {
  ones: ['', 'ek', 'be', 'tran', 'char', 'panch', 'chha', 'saat', 'aath', 'nav'],
  teens: ['das', 'agyar', 'bar', 'ter', 'chaud', 'pandar', 'sol', 'sattar', 'athar', 'ognis'],
  tens: ['', '', 'vis', 'tris', 'chalis', 'pachas', 'sath', 'sitter', 'aensi', 'nevun'],
  hundred: 'so',
  thousand: 'hazar',
  lakh: 'lakh',
  crore: 'karod',
  and: 'ane',
  rupees: 'rupiya',
  paise: 'paisa',
  received: 'malya',
  point: 'dashank',
};

/**
 * Kannada number words (Roman script for TTS)
 */
const KANNADA = {
  ones: ['', 'ondu', 'yeradu', 'mooru', 'naalku', 'aidu', 'aaru', 'yelu', 'entu', 'ombattu'],
  teens: ['hattu', 'hannondu', 'hanneradu', 'hadimooru', 'hadinaalku', 'hadinaidu', 'hadinaaru', 'hadinelu', 'hadinentu', 'hattombattu'],
  tens: ['', '', 'ippattu', 'moovattu', 'nalavattu', 'aivattu', 'aravattu', 'eppattu', 'embattu', 'tombattu'],
  hundred: 'nooru',
  thousand: 'saavira',
  lakh: 'laksha',
  crore: 'koti',
  and: 'mattu',
  rupees: 'rupaayi',
  paise: 'paise',
  received: 'bandide',
  point: 'bindu',
};

/**
 * Malayalam number words (Roman script for TTS)
 */
const MALAYALAM = {
  ones: ['', 'onnu', 'randu', 'moonnu', 'naalu', 'anchu', 'aaru', 'ezhu', 'ettu', 'onpathu'],
  teens: ['pathu', 'pathiononnu', 'panthrandu', 'pathimoonu', 'pathinalu', 'pathinanchu', 'pathinaaru', 'pathinezu', 'pathinettu', 'pathonpathu'],
  tens: ['', '', 'irupathu', 'muppathu', 'nalppathu', 'ambathu', 'arupathu', 'ezhupathu', 'enbathu', 'thonnuru'],
  hundred: 'nooru',
  thousand: 'aayiram',
  lakh: 'laksham',
  crore: 'kodi',
  and: 'um',
  rupees: 'rupa',
  paise: 'paisa',
  received: 'kitti',
  point: 'point',
};

/**
 * Punjabi number words (Roman script for TTS)
 */
const PUNJABI = {
  ones: ['', 'ikk', 'do', 'tinn', 'char', 'panj', 'chhe', 'satt', 'atth', 'nau'],
  teens: ['das', 'gyaarah', 'baarah', 'terah', 'chaudah', 'pandrah', 'solah', 'sataarah', 'athaarah', 'unni'],
  tens: ['', '', 'vee', 'tee', 'chaali', 'panjah', 'sath', 'sattar', 'assi', 'nabbe'],
  hundred: 'sau',
  thousand: 'hazaar',
  lakh: 'lakh',
  crore: 'karor',
  and: 'te',
  rupees: 'rupaye',
  paise: 'paise',
  received: 'mileya',
  point: 'dashmlav',
};

/**
 * Odia number words (Roman script for TTS)
 */
const ODIA = {
  ones: ['', 'eka', 'dui', 'tini', 'chari', 'pancha', 'chha', 'sata', 'aatha', 'naa'],
  teens: ['dasa', 'egara', 'bara', 'tera', 'chauda', 'pandara', 'sola', 'satra', 'athara', 'unisa'],
  tens: ['', '', 'kudi', 'trisa', 'chalisa', 'panchas', 'sathi', 'satari', 'assi', 'nabe'],
  hundred: 'saha',
  thousand: 'hajara',
  lakh: 'lakha',
  crore: 'koti',
  and: 'o',
  rupees: 'tanka',
  paise: 'paisa',
  received: 'milila',
  point: 'bindu',
};

/**
 * Language configuration map
 */
const LANGUAGE_CONFIG: Record<Language, typeof ENGLISH | typeof HINDI | typeof BENGALI | typeof TAMIL | typeof TELUGU | typeof MARATHI | typeof GUJARATI | typeof KANNADA | typeof MALAYALAM | typeof PUNJABI | typeof ODIA> = {
  'en-IN': ENGLISH,
  'hi-IN': HINDI,
  'bn-IN': BENGALI,
  'ta-IN': TAMIL,
  'te-IN': TELUGU,
  'mr-IN': MARATHI,
  'gu-IN': GUJARATI,
  'kn-IN': KANNADA,
  'ml-IN': MALAYALAM,
  'pa-IN': PUNJABI,
  'or-IN': ODIA,
};

// ============================================================================
// TTS QUEUE
// ============================================================================

/**
 * Queue for managing sequential TTS announcements.
 * Prevents overlapping speech when multiple notifications arrive rapidly.
 */
class TTSQueue {
  private queue: QueuedAnnouncement[] = [];
  private isProcessing = false;
  private readonly MAX_QUEUE_SIZE = 5;
  private readonly MAX_AGE_MS = 10000; // 10 seconds

  /**
   * Adds an announcement to the queue.
   */
  async add(amount: number, language: Language, options?: TTSOptions): Promise<void> {
    // Remove stale items
    this.cleanup();

    // Don't exceed queue size
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      console.warn('TTS queue full, dropping oldest announcement');
      this.queue.shift();
    }

    this.queue.push({
      amount,
      language,
      options,
      timestamp: Date.now(),
    });

    // Start processing if not already
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Processes the queue sequentially.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      // Skip if too old
      if (Date.now() - item.timestamp > this.MAX_AGE_MS) {
        continue;
      }

      try {
        await speakAmountInternal(item.amount, item.language, item.options);
      } catch (error) {
        // Log but continue processing
        if (__DEV__) {
          console.error('TTS error:', error);
        }
      }
    }

    this.isProcessing = false;
  }

  /**
   * Removes stale items from queue.
   */
  private cleanup(): void {
    const now = Date.now();
    this.queue = this.queue.filter(item => now - item.timestamp < this.MAX_AGE_MS);
  }

  /**
   * Clears all pending announcements.
   */
  clear(): void {
    this.queue = [];
  }

  /**
   * Returns current queue length.
   */
  get length(): number {
    return this.queue.length;
  }
}

// Singleton queue instance
export const ttsQueue = new TTSQueue();

// ============================================================================
// CORE TTS FUNCTIONS
// ============================================================================

/**
 * Speaks a payment amount in the specified language.
 * Uses the TTS queue to prevent overlapping announcements.
 * 
 * @param amount - Payment amount in rupees
 * @param language - Language for announcement
 * @param options - Optional TTS configuration
 * 
 * @example
 * ```typescript
 * await speakAmount(500, 'hi-IN');
 * // Announces: "paanch sau rupaye prapt hue"
 * ```
 */
export async function speakAmount(
  amount: number,
  language: Language,
  options?: TTSOptions
): Promise<void> {
  await ttsQueue.add(amount, language, options);
}

/**
 * Internal function that performs the actual TTS.
 * Called by the queue processor.
 */
async function speakAmountInternal(
  amount: number,
  language: Language,
  options?: TTSOptions
): Promise<void> {
  try {
    // Build the speech text
    const speechText = buildSpeechText(amount, language);
    
    // Merge options with defaults
    const speechOptions: Speech.SpeechOptions = {
      language,
      pitch: options?.pitch ?? DEFAULT_TTS_OPTIONS.pitch,
      rate: options?.rate ?? DEFAULT_TTS_OPTIONS.rate,
      volume: options?.volume ?? DEFAULT_TTS_OPTIONS.volume,
      voice: options?.voice,
    };

    // Wait for any current speech to finish
    const speaking = await Speech.isSpeakingAsync();
    if (speaking) {
      await Speech.stop();
      // Small delay to ensure clean transition
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Speak the amount
    await new Promise<void>((resolve, reject) => {
      Speech.speak(speechText, {
        ...speechOptions,
        onDone: () => resolve(),
        onError: (error) => reject(error),
        onStopped: () => resolve(),
      });
    });
  } catch (error) {
    if (__DEV__) {
      console.error('TTS speak error:', error);
    }
    // Fail silently in production
  }
}

/**
 * Builds the complete speech text for an amount.
 * 
 * @param amount - Amount in rupees
 * @param language - Target language
 * @returns Complete speech text
 */
function buildSpeechText(amount: number, language: Language): string {
  const config = LANGUAGE_CONFIG[language];
  const amountWords = numberToWords(amount, language);
  
  // Different sentence structures for different languages
  switch (language) {
    case 'en-IN':
      return `${config.received} ${amountWords} ${config.rupees}`;
    
    case 'hi-IN':
    case 'mr-IN':
    case 'pa-IN':
      // Hindi-style: "X rupaye prapt hue"
      return `${amountWords} ${config.rupees} ${config.received}`;
    
    case 'bn-IN':
      // Bengali: "X taka pawa gechhe"
      return `${amountWords} ${config.rupees} ${config.received}`;
    
    case 'ta-IN':
    case 'te-IN':
    case 'kn-IN':
    case 'ml-IN':
      // South Indian languages: "X rupees received"
      return `${amountWords} ${config.rupees} ${config.received}`;
    
    case 'gu-IN':
    case 'or-IN':
      return `${amountWords} ${config.rupees} ${config.received}`;
    
    default:
      return `${config.received} ${amountWords} ${config.rupees}`;
  }
}

// ============================================================================
// NUMBER TO WORDS CONVERSION
// ============================================================================

/**
 * Converts a number to words in the specified language.
 * Supports Indian numbering system (lakh, crore).
 * 
 * @param num - Number to convert (0 to 99,99,99,999)
 * @param language - Target language
 * @returns Number in words
 * 
 * @example
 * ```typescript
 * numberToWords(1500, 'en-IN')  // "one thousand five hundred"
 * numberToWords(1500, 'hi-IN')  // "ek hazaar paanch sau"
 * ```
 */
export function numberToWords(num: number, language: Language): string {
  // Handle decimal amounts
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  
  const config = LANGUAGE_CONFIG[language];
  let result = convertInteger(integerPart, language);
  
  // Add paise if there's a decimal part
  if (decimalPart > 0) {
    const paiseWords = convertInteger(decimalPart, language);
    result += ` ${config.and} ${paiseWords} ${config.paise}`;
  }
  
  return result;
}

/**
 * Converts an integer to words.
 */
function convertInteger(num: number, language: Language): string {
  if (num === 0) {
    return language === 'en-IN' ? 'zero' : 'shunya';
  }
  
  const config = LANGUAGE_CONFIG[language];
  const parts: string[] = [];
  
  // Handle crores (1,00,00,000+)
  if (num >= 10000000) {
    const crores = Math.floor(num / 10000000);
    parts.push(convertUnderHundred(crores, language) + ' ' + config.crore);
    num %= 10000000;
  }
  
  // Handle lakhs (1,00,000+)
  if (num >= 100000) {
    const lakhs = Math.floor(num / 100000);
    parts.push(convertUnderHundred(lakhs, language) + ' ' + config.lakh);
    num %= 100000;
  }
  
  // Handle thousands (1,000+)
  if (num >= 1000) {
    const thousands = Math.floor(num / 1000);
    parts.push(convertUnderHundred(thousands, language) + ' ' + config.thousand);
    num %= 1000;
  }
  
  // Handle hundreds
  if (num >= 100) {
    const hundreds = Math.floor(num / 100);
    parts.push(convertUnderHundred(hundreds, language) + ' ' + config.hundred);
    num %= 100;
  }
  
  // Handle remaining (0-99)
  if (num > 0) {
    parts.push(convertUnderHundred(num, language));
  }
  
  return parts.join(' ').trim();
}

/**
 * Converts a number under 100 to words.
 */
function convertUnderHundred(num: number, language: Language): string {
  if (num < 0 || num >= 100) {
    return '';
  }
  
  const config = LANGUAGE_CONFIG[language];
  
  // Handle 0-9
  if (num < 10) {
    return config.ones[num];
  }
  
  // Handle 10-19
  if (num < 20) {
    return config.teens[num - 10];
  }
  
  // Handle 20-99
  // For Hindi, use special irregular forms
  if (language === 'hi-IN' && 'twenties' in config) {
    const hindiConfig = config as typeof HINDI;
    const tensDigit = Math.floor(num / 10);
    const onesDigit = num % 10;
    
    switch (tensDigit) {
      case 2: return hindiConfig.twenties[onesDigit];
      case 3: return hindiConfig.thirties[onesDigit];
      case 4: return hindiConfig.forties[onesDigit];
      case 5: return hindiConfig.fifties[onesDigit];
      case 6: return hindiConfig.sixties[onesDigit];
      case 7: return hindiConfig.seventies[onesDigit];
      case 8: return hindiConfig.eighties[onesDigit];
      case 9: return hindiConfig.nineties[onesDigit];
    }
  }
  
  // Standard tens + ones pattern
  const tensDigit = Math.floor(num / 10);
  const onesDigit = num % 10;
  
  if (onesDigit === 0) {
    return config.tens[tensDigit];
  }
  
  return `${config.tens[tensDigit]} ${config.ones[onesDigit]}`.trim();
}

// ============================================================================
// TTS CONTROL FUNCTIONS
// ============================================================================

/**
 * Stops any ongoing speech immediately.
 */
export function stopSpeech(): void {
  try {
    Speech.stop();
    ttsQueue.clear();
  } catch (error) {
    if (__DEV__) {
      console.error('Error stopping speech:', error);
    }
  }
}

/**
 * Checks if TTS is currently speaking.
 * 
 * @returns true if speaking
 */
export async function isSpeaking(): Promise<boolean> {
  try {
    return await Speech.isSpeakingAsync();
  } catch {
    return false;
  }
}

/**
 * Gets available voices for a language.
 * 
 * @param language - Language to check
 * @returns Array of available voices
 */
export async function getAvailableVoices(language?: Language): Promise<Speech.Voice[]> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    if (language) {
      return voices.filter(v => v.language.startsWith(language.split('-')[0]));
    }
    return voices;
  } catch {
    return [];
  }
}

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Tests TTS with a sample amount.
 * Useful for users to verify audio output.
 * 
 * @param language - Language to test
 * @param amount - Optional custom amount (default 500)
 */
export async function testTTS(language: Language, amount: number = 500): Promise<void> {
  await speakAmountInternal(amount, language);
}

/**
 * Gets a preview of the speech text without speaking.
 * 
 * @param amount - Amount to preview
 * @param language - Target language
 * @returns The text that would be spoken
 */
export function getSpeechPreview(amount: number, language: Language): string {
  return buildSpeechText(amount, language);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  speakAmount,
  stopSpeech,
  isSpeaking,
  getAvailableVoices,
  testTTS,
  getSpeechPreview,
  numberToWords,
  ttsQueue,
};
