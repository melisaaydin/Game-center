import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslation from './locales/en/translation.json';
import trTranslation from './locales/tr/translation.json';

const namespaces = [
    'signup', 'login', 'common', 'home', 'gameDetail', 'friends',
    'lobbyList', 'slides', 'userMenu', 'sideBar', 'navLinks', 'auth',
    'notifications', 'lobbySection', 'playersSection', 'inviteDialog',
    'chatSection', 'gameList', 'createLobby', 'profile', 'lobby',
];

const resources = {
    en: {},
    tr: {}
};

namespaces.forEach(ns => {
    resources.en[ns] = enTranslation[ns] || {};
    resources.tr[ns] = trTranslation[ns] || {};
});

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        ns: namespaces,
        defaultNS: 'common',
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },
        interpolation: {
            escapeValue: false,
        },
        debug: process.env.NODE_ENV === 'development',
    });

export const setUserLanguage = (language) => {
    if (language && ['en', 'tr'].includes(language) && language !== i18n.language) {
        console.log('i18n: Setting language to:', language);
        i18n.changeLanguage(language);
        localStorage.setItem('i18nextLng', language);
    }
};

export const resetLanguage = () => {
    if (i18n.language !== 'en') {
        console.log('i18n: Resetting language to en');
        i18n.changeLanguage('en');
        localStorage.setItem('i18nextLng', 'en');
    }
};

export default i18n;