import * as Speech from 'expo-speech';

const LANG = 'es-ES';
const RATE = 0.9;

export function speak(text: string): void {
  if (!text) return;
  Speech.stop();
  Speech.speak(text, { language: LANG, rate: RATE });
}
