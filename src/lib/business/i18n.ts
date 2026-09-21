import { useEffect, useState } from 'react'

export type BusinessLanguage = 'en' | 'gu' | 'hi'

const KEY = 'prangan-business-language'

const dictionaries = {
  en: {
    home: 'Home', ledger: 'Ledger', approvals: 'Approvals', partners: 'Partners', more: 'More',
    totalFunds: 'Total business money', todayIn: 'Today in', todayOut: 'Today out', net: 'Net cash',
    add: 'Add', moneyIn: 'Money in', expense: 'Expense', partnerPaid: 'Partner paid', transfer: 'Transfer',
    needsYou: 'Things to do', recent: 'Activity', unpaid: 'Unpaid expenses', businessOwes: 'Business owes partners',
    amount: 'Amount', save: 'Save', paid: 'Paid', payLater: 'Pay later', paidBy: 'Paid by',
    businessFunds: 'Business funds', partner: 'Partner', category: 'Category', vendor: 'Vendor / party',
    note: 'Note', moreDetails: 'More details', quickAdd: 'Quick add', favourite: 'Favourite',
  },
  gu: {
    home: 'હોમ', ledger: 'હિસાબ', approvals: 'મંજૂરી', partners: 'ભાગીદારો', more: 'વધુ',
    totalFunds: 'કુલ બિઝનેસ પૈસા', todayIn: 'આજે આવ્યા', todayOut: 'આજે ગયા', net: 'નેટ કેશ',
    add: 'ઉમેરો', moneyIn: 'પૈસા આવ્યા', expense: 'ખર્ચ', partnerPaid: 'ભાગીદારે ચૂકવ્યું', transfer: 'ટ્રાન્સફર',
    needsYou: 'કામ બાકી', recent: 'હાલની પ્રવૃત્તિ', unpaid: 'બાકી ખર્ચ', businessOwes: 'બિઝનેસે ભાગીદારોને આપવાના',
    amount: 'રકમ', save: 'સેવ', paid: 'ચૂકવેલ', payLater: 'પછી ચૂકવવું', paidBy: 'કોણે ચૂકવ્યું',
    businessFunds: 'બિઝનેસના પૈસા', partner: 'ભાગીદાર', category: 'કેટેગરી', vendor: 'વેન્ડર / પાર્ટી',
    note: 'નોંધ', moreDetails: 'વધુ વિગતો', quickAdd: 'ઝડપી એન્ટ્રી', favourite: 'ફેવરિટ',
  },
  hi: {
    home: 'होम', ledger: 'हिसाब', approvals: 'मंज़ूरी', partners: 'पार्टनर', more: 'और',
    totalFunds: 'कुल बिज़नेस पैसा', todayIn: 'आज आया', todayOut: 'आज गया', net: 'नेट कैश',
    add: 'जोड़ें', moneyIn: 'पैसा आया', expense: 'खर्च', partnerPaid: 'पार्टनर ने दिया', transfer: 'ट्रांसफर',
    needsYou: 'करने वाले काम', recent: 'हाल की गतिविधि', unpaid: 'बाकी खर्च', businessOwes: 'बिज़नेस को पार्टनर को देना है',
    amount: 'राशि', save: 'सेव', paid: 'भुगतान हुआ', payLater: 'बाद में भुगतान', paidBy: 'किसने भुगतान किया',
    businessFunds: 'बिज़नेस फंड', partner: 'पार्टनर', category: 'कैटेगरी', vendor: 'वेंडर / पार्टी',
    note: 'नोट', moreDetails: 'और जानकारी', quickAdd: 'क्विक एंट्री', favourite: 'फेवरेट',
  },
} as const

export type BusinessTextKey = keyof typeof dictionaries.en

export function getBusinessLanguage(): BusinessLanguage {
  const value = localStorage.getItem(KEY)
  return value === 'gu' || value === 'hi' ? value : 'en'
}

export function setBusinessLanguage(language: BusinessLanguage) {
  localStorage.setItem(KEY, language)
  window.dispatchEvent(new Event('prangan-business-language'))
}

export function useBusinessLanguage() {
  const [language, setLanguageState] = useState<BusinessLanguage>(() => getBusinessLanguage())

  useEffect(() => {
    const sync = () => setLanguageState(getBusinessLanguage())
    window.addEventListener('prangan-business-language', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('prangan-business-language', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return {
    language,
    setLanguage: setBusinessLanguage,
    t: (key: BusinessTextKey) => dictionaries[language][key],
  }
}
