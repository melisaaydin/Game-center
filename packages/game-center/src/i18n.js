import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
// Import translation files for English and Turkish
import enRaw from './locales/en/translation.json';
import trRaw from './locales/tr/translation.json';

// Define all the namespaces used in the app
const namespaces = [
    'signup', 'login', 'common', 'home', 'gameDetail', 'friends',
    'lobbyList', 'slides', 'userMenu', 'sideBar', 'navLinks', 'auth',
    'notifications', 'lobbySection', 'playersSection', 'inviteDialog',
    'chatSection', 'gameList', 'createLobby', 'profile', 'lobby',
    'tombala'
];

// Helper function to safely extract a namespace from a translation file
const extractNamespace = (source, ns) =>
    typeof source?.[ns] === 'object' ? source[ns] : {};

// Set up the resources object to hold translations for each language
const resources = {
    en: {},
    tr: {}
};
// Loop through each namespace and assign translations from the imported files
namespaces.forEach(ns => {
    resources.en[ns] = extractNamespace(enRaw, ns);
    resources.tr[ns] = extractNamespace(trRaw, ns);
});

// Initialize i18next with configuration for language detection and React integration
i18n
    .use(LanguageDetector) // Automatically detect the user's language
    .use(initReactI18next) // Bind i18next to React for easy use in components
    .init({
        resources, // Load the translation resources we defined
        lng: 'en', // Default language is English
        fallbackLng: 'en', // Fallback to English if a translation is missing
        supportedLngs: ['en', 'tr'], // Only support English and Turkish
        load: 'languageOnly', // Load only the language code (e.g., 'en' instead of 'en-US')
        ns: namespaces, // List of namespaces to use
        defaultNS: 'common', // Default namespace for translations
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'], // Check language in this order
            caches: ['localStorage'], // Save the detected language to localStorage
            lookupLocalStorage: 'i18nextLng', // Key to use in localStorage
        },
        interpolation: {
            escapeValue: false, // React already escapes values, so no need for i18next to do it
        },
        debug: false, // Disable debug logs in production
    });

// Function to change the app's language and notify components
export const setUserLanguage = (language) => {
    // Check if the language is valid and different from the current one
    if (language && ['en', 'tr'].includes(language) && language !== i18n.language) {
        i18n.changeLanguage(language)
            .then(() => {
                localStorage.setItem('i18nextLng', language); // Save the new language to localStorage
                // Trigger a custom event to notify components of the language change
                window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language } }));
            })
            .catch(err => console.error('[i18n] Error changing language:', err));
    }
};

// Log when i18next is fully initialized
i18n.on('initialized', () => {
    console.log('[i18n] Initialized. Current language:', i18n.language);
});

// Export the i18n instance for use throughout the app
export default i18n;