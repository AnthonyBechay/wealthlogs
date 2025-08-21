// apps/web/next-i18next.config.js
const path = require('path');

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'fr', 'ar'],
  },
  // The below line must point to a path that actually has the files at build time.
  localePath: path.resolve(process.cwd(), '../../packages/common/locales'),
};
