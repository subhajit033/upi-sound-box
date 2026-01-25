# UPI Soundbox - Phase 2: TypeScript Core Logic

This document describes the TypeScript layer for the UPI Soundbox application.

## Architecture Overview

```
src/
├── types/
│   ├── index.ts              # Core type definitions
│   └── UPILinkModule.d.ts    # Native module types
├── utils/
│   ├── index.ts              # Utility exports
│   ├── notificationParser.ts # Amount extraction logic
│   ├── ttsEngine.ts          # Text-to-Speech engine
│   └── languageManager.ts    # Language preferences
├── services/
│   ├── index.ts              # Service exports
│   └── soundboxService.ts    # Main integration service
└── modules/
    └── UPILink.ts            # Native bridge wrapper
```

## Components

### 1. Type Definitions (`src/types/index.ts`)

Core interfaces and types used throughout the app:

| Type | Description |
| ---- | ----------- |
| `NotificationPayload` | Raw notification from native layer |
| `ParsedNotification` | Processed notification with extracted data |
| `UPISource` | Enum for UPI app sources |
| `Language` | Supported TTS languages |
| `TTSOptions` | TTS configuration |
| `AppSettings` | User preferences |

### 2. Notification Parser (`src/utils/notificationParser.ts`)

Extracts payment amounts and sender information from UPI notifications.

#### Features

- **Multi-app support**: PhonePe, Google Pay, Paytm, BHIM
- **Flexible amount parsing**: Handles ₹, Rs., Rupees, INR formats
- **Indian number format**: Supports 1,00,000 style commas
- **Decimal support**: Handles ₹500.50 correctly
- **Failure detection**: Skips failed/pending transactions
- **Sender extraction**: Extracts payer name when available

#### Usage

```typescript
import { parseNotification } from '@/utils/notificationParser';

const result = parseNotification({
  packageName: 'com.phonepe.app',
  title: 'Payment Received',
  text: '₹1,234.50 received from Rajesh Kumar',
  timestamp: Date.now()
});

console.log(result.amount);    // 1234.50
console.log(result.sender);    // "Rajesh Kumar"
console.log(result.source);    // "phonepe"
console.log(result.isSuccessful); // true
```

#### Supported Amount Formats

| Format | Example | Parsed |
| ------ | ------- | ------ |
| Rupee symbol | `₹500` | 500 |
| With commas | `₹1,234.50` | 1234.50 |
| Indian lakhs | `₹1,50,000` | 150000 |
| Rs. prefix | `Rs. 500` | 500 |
| Rupees word | `Rupees 1000` | 1000 |
| INR prefix | `INR 500` | 500 |

### 3. TTS Engine (`src/utils/ttsEngine.ts`)

Multi-language Text-to-Speech for payment announcements.

#### Supported Languages

| Code | Language | Native Name |
| ---- | -------- | ----------- |
| `en-IN` | English | English |
| `hi-IN` | Hindi | हिन्दी |
| `bn-IN` | Bengali | বাংলা |
| `ta-IN` | Tamil | தமிழ் |
| `te-IN` | Telugu | తెలుగు |
| `mr-IN` | Marathi | मराठी |
| `gu-IN` | Gujarati | ગુજરાતી |
| `kn-IN` | Kannada | ಕನ್ನಡ |
| `ml-IN` | Malayalam | മലയാളം |
| `pa-IN` | Punjabi | ਪੰਜਾਬੀ |
| `or-IN` | Odia | ଓଡ଼ିଆ |

#### Usage

```typescript
import { speakAmount, testTTS, stopSpeech } from '@/utils/ttsEngine';

// Speak an amount
await speakAmount(1500, 'en-IN');
// Announces: "Received one thousand five hundred rupees"

await speakAmount(500, 'hi-IN');
// Announces: "paanch sau rupaye prapt hue"

// Test TTS
await testTTS('bn-IN', 1000);

// Stop ongoing speech
stopSpeech();
```

#### Number to Words

The engine converts numbers to words in each language:

| Amount | English | Hindi |
| ------ | ------- | ----- |
| 500 | five hundred | paanch sau |
| 1,234 | one thousand two hundred thirty-four | ek hazaar do sau chauntiis |
| 1,50,000 | one lakh fifty thousand | ek lakh pachaas hazaar |

#### Queue Management

The TTS engine includes a queue to handle rapid notifications:

```typescript
import { ttsQueue } from '@/utils/ttsEngine';

// Adds to queue, processes sequentially
ttsQueue.add(500, 'en-IN');
ttsQueue.add(1000, 'en-IN');

// Clear all pending
ttsQueue.clear();
```

### 4. Language Manager (`src/utils/languageManager.ts`)

Persists user language preferences using AsyncStorage.

#### Usage

```typescript
import { 
  getLanguage, 
  setLanguage, 
  useLanguage,
  useSettings 
} from '@/utils/languageManager';

// Direct API
const language = await getLanguage();  // 'en-IN'
await setLanguage('hi-IN');

// React Hook
function LanguageSelector() {
  const { language, setLanguage, isLoading } = useLanguage();
  
  return (
    <Picker
      selectedValue={language}
      onValueChange={setLanguage}
    >
      <Picker.Item label="English" value="en-IN" />
      <Picker.Item label="Hindi" value="hi-IN" />
    </Picker>
  );
}

// Full Settings Hook
function SettingsScreen() {
  const { settings, updateSettings, isLoading } = useSettings();
  
  return (
    <View>
      <Switch 
        value={settings.isEnabled}
        onValueChange={(v) => updateSettings({ isEnabled: v })}
      />
      <Slider
        value={settings.volume}
        onValueChange={(v) => updateSettings({ volume: v })}
      />
    </View>
  );
}
```

### 5. Soundbox Service (`src/services/soundboxService.ts`)

Main integration that connects everything together.

#### Usage

```typescript
import { 
  startSoundbox, 
  stopSoundbox,
  useSoundbox,
  isNotificationAccessEnabled,
  openNotificationSettings
} from '@/services/soundboxService';

// Manual Control
const cleanup = startSoundbox((notification) => {
  console.log('Received:', notification.amount);
});

// Later...
cleanup();
// or
stopSoundbox();

// React Hook
function SoundboxScreen() {
  const { 
    isEnabled, 
    hasPermission,
    lastNotification,
    notificationCount,
    start, 
    stop, 
    requestPermission 
  } = useSoundbox();
  
  if (!hasPermission) {
    return (
      <Button 
        title="Enable Notifications" 
        onPress={requestPermission} 
      />
    );
  }
  
  return (
    <View>
      <Switch value={isEnabled} onValueChange={v => v ? start() : stop()} />
      <Text>Notifications: {notificationCount}</Text>
      {lastNotification && (
        <Text>Last Amount: ₹{lastNotification.amount}</Text>
      )}
    </View>
  );
}
```

#### Testing (Development Mode)

```typescript
import { simulateNotification, testAnnouncement } from '@/services/soundboxService';

// Simulate a payment notification
await simulateNotification(500, 'phonepe');

// Test TTS directly
await testAnnouncement(1000, 'hi-IN');
```

## Complete Flow Example

```typescript
import { useSoundbox } from '@/services/soundboxService';
import { useSettings } from '@/utils/languageManager';

function App() {
  const { isEnabled, start, stop, hasPermission, requestPermission } = useSoundbox();
  const { settings, updateSettings } = useSettings();
  
  useEffect(() => {
    if (hasPermission && settings.isEnabled) {
      start();
    }
    return () => stop();
  }, [hasPermission, settings.isEnabled]);
  
  // ...
}
```

## Parser Test Cases

The parser includes built-in test cases:

```typescript
import { runParserTests } from '@/utils/notificationParser';

const results = runParserTests();
results.forEach(r => {
  console.log(`${r.passed ? '✓' : '✗'} ${r.description}`);
});
```

Expected test results:

| Test Case | Amount | Status |
| --------- | ------ | ------ |
| PhonePe - Basic | ₹1,234.50 | ✓ |
| Google Pay - Payment | ₹500 | ✓ |
| Paytm - Rs format | ₹12,500 | ✓ |
| BHIM - Credited | ₹300 | ✓ |
| Failed transaction | null | ✓ |
| Pending transaction | null | ✓ |
| Refund | null | ✓ |
| No amount | null | ✓ |
| Decimal amount | ₹99.99 | ✓ |
| Large amount | ₹1,50,000 | ✓ |
| Sent payment | null | ✓ |

## Configuration

### Settings Storage Keys

- `@upi_soundbox:language` - Language preference
- `@upi_soundbox:settings` - Full settings object

### Default Settings

```typescript
{
  language: 'en-IN',
  isEnabled: true,
  volume: 1.0,
  speechRate: 0.85,
  announceSender: false,
  minimumAmount: 1,
}
```

## Error Handling

All functions handle errors gracefully:

- Parser returns `null` amount if extraction fails
- TTS fails silently (no crash)
- AsyncStorage returns defaults on error
- Native bridge handles missing context

## Known Limitations

1. **Phone numbers**: May incorrectly parse 10-digit numbers as amounts
2. **Multiple amounts**: Only extracts first amount found
3. **Hindi TTS quality**: Depends on device TTS engine
4. **Background speech**: May be interrupted by other audio

## Performance Notes

- Parser uses optimized regex (minimal backtracking)
- TTS queue limits to 5 items maximum
- Stale queue items (>10s) are discarded
- AsyncStorage reads are cached in hooks

## Dependencies

- `expo-speech` - Text-to-Speech
- `@react-native-async-storage/async-storage` - Persistence
- `react-native` - Native bridge and event emitter

## Next Steps (Phase 3)

1. Build React Native UI components
2. Implement settings screen
3. Add permission flow UI
4. Create notification history view
5. Add analytics/logging (optional)
