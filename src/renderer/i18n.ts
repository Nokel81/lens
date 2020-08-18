import moment from "moment"
import { observable, reaction } from "mobx"
import { setupI18n } from "@lingui/core"
import orderBy from "lodash/orderBy"
import { autobind, StorageHelper } from "./utils"
import untypedPlurals from "make-plural/plurals"

const plurals: Record<string, ((n: string | number, ord?: boolean) => string)> = untypedPlurals

export interface Language {
  code: string;
  title: string;
  nativeTitle: string;
}

export const _i18n = setupI18n({
  missing: (message, id) => {
    console.warn('Missing localization:', message, id)
    return id
  },
})

@autobind()
export class LocalizationStore {
  readonly defaultLocale = "en"
  @observable activeLang = this.defaultLocale;

  // todo: verify with package.json ling-ui "locales"
  public languages: Language[] = orderBy<Language>([
    { code: "en", title: "English", nativeTitle: "English" },
    { code: "ru", title: "Russian", nativeTitle: "Русский" },
    { code: "fi", title: "Finnish", nativeTitle: "Suomi" },
  ], "title");

  constructor() {
    const storage = new StorageHelper("lang_ui", this.defaultLocale)
    this.activeLang = storage.get()
    reaction(() => this.activeLang, lang => storage.set(lang))
  }

  async init(): Promise<void> {
    await this.setLocale(this.activeLang)
  }

  async setLocale(locale: string): Promise<void> {
    const catalog = await import(`@lingui/loader!./locale/${locale}/message.po`)
    _i18n.loadLocaleData(locale, { plurals: plurals[locale] })
    _i18n.load(locale, catalog.messages)

    // set moment's locale before activeLang for proper next render() in app
    moment.locale(locale)
    this.activeLang = locale

    _i18n.activate(locale)
  }
}

export const i18nStore = new LocalizationStore()
