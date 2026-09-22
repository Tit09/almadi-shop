import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            fr: { translation: { welcome: "Nos Articles du Moment", offices: "Nos Bureaux & Contacts", delivery: "Livraison Rapide" } },
            en: { translation: { welcome: "Our Featured Items", offices: "Our Offices & Contacts", delivery: "Fast Delivery" } },
            zh: { translation: { welcome: "热门商品", offices: "我们的 Office & 联系方式", delivery: "快速送达" } },
            es: { translation: { welcome: "Nuestros Artículos du Momento", offices: "Nuestras Oficinas y Contactos", delivery: "Envío Rápido" } },
            ar: { translation: { welcome: "الأصناف المميزة لدينا", offices: "مكاتبنا وجهات الاتصال", delivery: "الشحن السريع" } }
        },
        lng: 'fr', // langue par défaut
        fallbackLng: 'fr',
        interpolation: { escapeValue: false }
    });

export default i18n;
