import { TranslationSchema } from '@roam/shared';

declare module 'i18next' {
  interface CustomTypeOptions {
    // connects locals to the t() function
    resources: {
      translation: TranslationSchema;
    };
  }
}
