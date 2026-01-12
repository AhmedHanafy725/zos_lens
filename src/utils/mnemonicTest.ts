// Test utility to debug bip39 validation
import * as bip39 from 'bip39';
// Import English wordlist directly
import englishWordlist from 'bip39/src/wordlists/english.json';

export function testMnemonicValidation(mnemonic: string) {
  // Try validation with imported English wordlist
  try {
    const isValid = bip39.validateMnemonic(mnemonic.trim(), englishWordlist);
    return isValid;
  } catch (error) {
    console.error('Mnemonic validation error:', error);
    return false;
  }
}

export function checkWordlistAvailability() {
  console.log('English wordlist loaded:', englishWordlist ? `${englishWordlist.length} words` : 'Missing');
}

// Export the wordlist for use in other modules
export { englishWordlist };
