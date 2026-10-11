/**
 * translations.ts
 *
 * UI string translations for HealthPilot AI.
 * Supported languages: English, Hindi, Telugu, Tamil, Bengali, Marathi.
 *
 * Keys follow a dot-namespace pattern: "section.key"
 * Add new keys to the English block first, then propagate to others.
 */

export type LangCode = 'en' | 'hi' | 'te' | 'ta' | 'bn' | 'mr';

export interface LangMeta {
  code: LangCode;
  name: string;        // English name
  nativeName: string;  // Name in its own script
  flag: string;        // Emoji flag
  dir: 'ltr' | 'rtl';
  tesseractLang: string; // Tesseract language code(s)
}

export const LANGUAGES: LangMeta[] = [
  { code: 'en', name: 'English',  nativeName: 'English',    flag: '🇬🇧', dir: 'ltr', tesseractLang: 'eng' },
  { code: 'hi', name: 'Hindi',    nativeName: 'हिन्दी',      flag: '🇮🇳', dir: 'ltr', tesseractLang: 'eng+hin' },
  { code: 'te', name: 'Telugu',   nativeName: 'తెలుగు',      flag: '🇮🇳', dir: 'ltr', tesseractLang: 'eng+tel' },
  { code: 'ta', name: 'Tamil',    nativeName: 'தமிழ்',       flag: '🇮🇳', dir: 'ltr', tesseractLang: 'eng+tam' },
  { code: 'bn', name: 'Bengali',  nativeName: 'বাংলা',       flag: '🇮🇳', dir: 'ltr', tesseractLang: 'eng+ben' },
  { code: 'mr', name: 'Marathi',  nativeName: 'मराठी',       flag: '🇮🇳', dir: 'ltr', tesseractLang: 'eng+mar' },
];

export type TranslationKey =
  // Nav
  | 'nav.dashboard' | 'nav.copilot' | 'nav.records' | 'nav.abha' | 'nav.reports'
  | 'nav.reportAnalysis' | 'nav.reportComparison'
  | 'nav.medications' | 'nav.reminders' | 'nav.goals' | 'nav.insights'
  | 'nav.timeline' | 'nav.profile' | 'nav.settings' | 'nav.privacy' | 'nav.signOut'
  // Page titles
  | 'page.records' | 'page.records.sub' | 'page.abha' | 'page.reports' | 'page.dashboard'
  | 'page.settings' | 'page.settings.sub' | 'page.medications' | 'page.reminders'
  | 'page.goals' | 'page.insights' | 'page.profile'
  // Records
  | 'records.addRecord' | 'records.search' | 'records.allCategories'
  | 'records.noRecords' | 'records.noRecordsDesc' | 'records.filterBy'
  | 'records.sortBy' | 'records.clearFilters' | 'records.viewAnalysis'
  | 'records.view' | 'records.edit' | 'records.delete' | 'records.demoData'
  | 'records.editRecord' | 'records.addRecordModal'
  // Categories
  | 'cat.medical_report' | 'cat.lab_result' | 'cat.prescription'
  | 'cat.doctor_note' | 'cat.vaccination' | 'cat.other'
  // Status
  | 'status.uploaded' | 'status.analyzed' | 'status.pending'
  | 'status.normal' | 'status.slightly_off' | 'status.needs_attention' | 'status.critical'
  // AI Summary
  | 'ai.summary' | 'ai.summaryTitle' | 'ai.plainLanguage' | 'ai.generating'
  | 'ai.whatIsThis' | 'ai.yourResults' | 'ai.overallPicture' | 'ai.nextSteps'
  | 'ai.gotIt' | 'ai.poweredBy' | 'ai.notMedicalAdvice' | 'ai.failedSummary'
  | 'ai.failedDesc' | 'ai.summaryIn'
  // Settings
  | 'settings.language' | 'settings.languageSub' | 'settings.chooseLanguage'
  | 'settings.aiSummaryLang' | 'settings.aiSummaryLangDesc'
  | 'settings.ocrLanguage' | 'settings.ocrLanguageDesc'
  | 'settings.notifications' | 'settings.privacy' | 'settings.aiPrefs'
  | 'settings.dataManagement' | 'settings.account'
  // Common
  | 'common.cancel' | 'common.save' | 'common.close' | 'common.loading'
  | 'common.error' | 'common.success' | 'common.add' | 'common.addRecord'
  | 'common.title' | 'common.date' | 'common.provider' | 'common.notes'
  | 'common.category' | 'common.optional' | 'common.saveChanges'
  | 'common.newest' | 'common.oldest' | 'common.titleAZ'
  | 'common.language';

type Translations = Record<TranslationKey, string>;

// ─── English ──────────────────────────────────────────────────────────────────

const en: Translations = {
  // Nav
  'nav.dashboard': 'Dashboard', 'nav.copilot': 'AI Copilot', 'nav.records': 'Records', 'nav.abha': 'ABHA & Records',
  'nav.reports': 'Reports', 'nav.reportAnalysis': 'Report Analysis', 'nav.reportComparison': 'Report Comparison',
  'nav.medications': 'Medications', 'nav.reminders': 'Reminders',
  'nav.goals': 'Goals', 'nav.insights': 'Insights', 'nav.timeline': 'Timeline',
  'nav.profile': 'Profile', 'nav.settings': 'Settings', 'nav.privacy': 'Privacy & Safety', 'nav.signOut': 'Sign Out',
  // Pages
  'page.dashboard': 'Dashboard', 'page.records': 'Health Records',
  'page.records.sub': 'Organize and manage all your health documents',
  'page.abha': 'ABHA & Health Records',
  'page.reports': 'Medical Reports', 'page.settings': 'Settings',
  'page.settings.sub': 'Manage your account, preferences, and data',
  'page.medications': 'Medications', 'page.reminders': 'Reminders',
  'page.goals': 'Health Goals', 'page.insights': 'AI Insights', 'page.profile': 'Profile',
  // Records
  'records.addRecord': 'Add Record', 'records.search': 'Search records...',
  'records.allCategories': 'All categories', 'records.noRecords': 'No health records yet',
  'records.noRecordsDesc': 'Upload your first report to begin organizing your healthcare information.',
  'records.filterBy': 'Filter by', 'records.sortBy': 'Sort by', 'records.clearFilters': 'Clear filters',
  'records.viewAnalysis': 'View Analysis', 'records.view': 'View', 'records.edit': 'Edit',
  'records.delete': 'Delete', 'records.demoData': 'Demo Data',
  'records.editRecord': 'Edit Health Record', 'records.addRecordModal': 'Add Health Record',
  // Categories
  'cat.medical_report': 'Medical Reports', 'cat.lab_result': 'Lab Results',
  'cat.prescription': 'Prescriptions', 'cat.doctor_note': 'Doctor Notes',
  'cat.vaccination': 'Vaccination Records', 'cat.other': 'Other',
  // Status
  'status.uploaded': 'Uploaded', 'status.analyzed': 'Analyzed', 'status.pending': 'Pending',
  'status.normal': 'Normal', 'status.slightly_off': 'Slightly Off',
  'status.needs_attention': 'Needs Attention', 'status.critical': 'Critical',
  // AI Summary
  'ai.summary': 'AI Summary', 'ai.summaryTitle': 'AI Health Summary',
  'ai.plainLanguage': 'Plain Language', 'ai.generating': 'Generating your personalised summary in plain language…',
  'ai.whatIsThis': 'What is this?', 'ai.yourResults': 'Your Results — In Plain English',
  'ai.overallPicture': 'Overall Picture', 'ai.nextSteps': 'What To Do Next',
  'ai.gotIt': 'Got it', 'ai.poweredBy': 'Powered by HealthPilot AI',
  'ai.notMedicalAdvice': 'Not medical advice', 'ai.failedSummary': 'Could not generate summary',
  'ai.failedDesc': 'Please try again or check your API key.', 'ai.summaryIn': 'Summary language',
  // Settings
  'settings.language': 'Language & Region', 'settings.languageSub': 'Choose your preferred language for the interface and AI summaries',
  'settings.chooseLanguage': 'Interface Language', 'settings.aiSummaryLang': 'AI Summary Language',
  'settings.aiSummaryLangDesc': 'AI summaries will be generated in this language',
  'settings.ocrLanguage': 'OCR Language for Prescriptions',
  'settings.ocrLanguageDesc': 'Select the language(s) your prescriptions are written in for better OCR accuracy',
  'settings.notifications': 'Notification Settings', 'settings.privacy': 'Privacy Settings',
  'settings.aiPrefs': 'AI Preferences', 'settings.dataManagement': 'Data Management',
  'settings.account': 'Account Settings',
  // Common
  'common.cancel': 'Cancel', 'common.save': 'Save', 'common.close': 'Close',
  'common.loading': 'Loading...', 'common.error': 'Error', 'common.success': 'Success',
  'common.add': 'Add', 'common.addRecord': 'Add Record', 'common.title': 'Title',
  'common.date': 'Date', 'common.provider': 'Provider (optional)',
  'common.notes': 'Notes (optional)', 'common.category': 'Category',
  'common.optional': 'Optional', 'common.saveChanges': 'Save Changes',
  'common.newest': 'Newest first', 'common.oldest': 'Oldest first', 'common.titleAZ': 'Title (A-Z)',
  'common.language': 'Language',
};

// ─── Hindi (हिन्दी) ────────────────────────────────────────────────────────────

const hi: Translations = {
  'nav.dashboard': 'डैशबोर्ड', 'nav.copilot': 'AI सहायक', 'nav.records': 'रिकॉर्ड', 'nav.abha': 'ABHA व रिकॉर्ड',
  'nav.reports': 'रिपोर्ट', 'nav.reportAnalysis': 'रिपोर्ट विश्लेषण', 'nav.reportComparison': 'रिपोर्ट तुलना',
  'nav.medications': 'दवाइयाँ', 'nav.reminders': 'अनुस्मारक',
  'nav.goals': 'लक्ष्य', 'nav.insights': 'अंतर्दृष्टि', 'nav.timeline': 'समयरेखा',
  'nav.profile': 'प्रोफ़ाइल', 'nav.settings': 'सेटिंग्स', 'nav.privacy': 'गोपनीयता और सुरक्षा', 'nav.signOut': 'साइन आउट',
  'page.dashboard': 'डैशबोर्ड', 'page.records': 'स्वास्थ्य रिकॉर्ड',
  'page.records.sub': 'अपने सभी स्वास्थ्य दस्तावेज़ों को व्यवस्थित करें',
  'page.abha': 'ABHA और स्वास्थ्य रिकॉर्ड',
  'page.reports': 'चिकित्सा रिपोर्ट', 'page.settings': 'सेटिंग्स',
  'page.settings.sub': 'अपना खाता, प्राथमिकताएँ और डेटा प्रबंधित करें',
  'page.medications': 'दवाइयाँ', 'page.reminders': 'अनुस्मारक',
  'page.goals': 'स्वास्थ्य लक्ष्य', 'page.insights': 'AI अंतर्दृष्टि', 'page.profile': 'प्रोफ़ाइल',
  'records.addRecord': 'रिकॉर्ड जोड़ें', 'records.search': 'रिकॉर्ड खोजें...',
  'records.allCategories': 'सभी श्रेणियाँ', 'records.noRecords': 'अभी तक कोई स्वास्थ्य रिकॉर्ड नहीं',
  'records.noRecordsDesc': 'अपनी पहली रिपोर्ट अपलोड करें।',
  'records.filterBy': 'फ़िल्टर करें', 'records.sortBy': 'क्रमबद्ध करें', 'records.clearFilters': 'फ़िल्टर हटाएँ',
  'records.viewAnalysis': 'विश्लेषण देखें', 'records.view': 'देखें', 'records.edit': 'संपादित करें',
  'records.delete': 'हटाएँ', 'records.demoData': 'डेमो डेटा',
  'records.editRecord': 'रिकॉर्ड संपादित करें', 'records.addRecordModal': 'रिकॉर्ड जोड़ें',
  'cat.medical_report': 'चिकित्सा रिपोर्ट', 'cat.lab_result': 'लैब परिणाम',
  'cat.prescription': 'नुस्खे', 'cat.doctor_note': 'डॉक्टर नोट्स',
  'cat.vaccination': 'टीकाकरण रिकॉर्ड', 'cat.other': 'अन्य',
  'status.uploaded': 'अपलोड किया', 'status.analyzed': 'विश्लेषित', 'status.pending': 'लंबित',
  'status.normal': 'सामान्य', 'status.slightly_off': 'थोड़ा असामान्य',
  'status.needs_attention': 'ध्यान आवश्यक', 'status.critical': 'गंभीर',
  'ai.summary': 'AI सारांश', 'ai.summaryTitle': 'AI स्वास्थ्य सारांश',
  'ai.plainLanguage': 'सरल भाषा', 'ai.generating': 'आपका व्यक्तिगत सारांश सरल भाषा में तैयार हो रहा है…',
  'ai.whatIsThis': 'यह क्या है?', 'ai.yourResults': 'आपके परिणाम — सरल शब्दों में',
  'ai.overallPicture': 'कुल मिलाकर', 'ai.nextSteps': 'आगे क्या करें',
  'ai.gotIt': 'समझ गया', 'ai.poweredBy': 'HealthPilot AI द्वारा',
  'ai.notMedicalAdvice': 'यह चिकित्सा सलाह नहीं है', 'ai.failedSummary': 'सारांश नहीं बन सका',
  'ai.failedDesc': 'कृपया पुनः प्रयास करें।', 'ai.summaryIn': 'सारांश भाषा',
  'settings.language': 'भाषा और क्षेत्र', 'settings.languageSub': 'इंटरफ़ेस और AI सारांश के लिए भाषा चुनें',
  'settings.chooseLanguage': 'इंटरफ़ेस भाषा', 'settings.aiSummaryLang': 'AI सारांश भाषा',
  'settings.aiSummaryLangDesc': 'AI सारांश इस भाषा में उत्पन्न होगा',
  'settings.ocrLanguage': 'OCR भाषा (नुस्खों के लिए)', 'settings.ocrLanguageDesc': 'बेहतर OCR के लिए नुस्खे की भाषा चुनें',
  'settings.notifications': 'सूचना सेटिंग्स', 'settings.privacy': 'गोपनीयता सेटिंग्स',
  'settings.aiPrefs': 'AI प्राथमिकताएँ', 'settings.dataManagement': 'डेटा प्रबंधन',
  'settings.account': 'खाता सेटिंग्स',
  'common.cancel': 'रद्द करें', 'common.save': 'सहेजें', 'common.close': 'बंद करें',
  'common.loading': 'लोड हो रहा है...', 'common.error': 'त्रुटि', 'common.success': 'सफलता',
  'common.add': 'जोड़ें', 'common.addRecord': 'रिकॉर्ड जोड़ें', 'common.title': 'शीर्षक',
  'common.date': 'तारीख', 'common.provider': 'प्रदाता (वैकल्पिक)',
  'common.notes': 'नोट्स (वैकल्पिक)', 'common.category': 'श्रेणी',
  'common.optional': 'वैकल्पिक', 'common.saveChanges': 'परिवर्तन सहेजें',
  'common.newest': 'नवीनतम पहले', 'common.oldest': 'पुराना पहले', 'common.titleAZ': 'शीर्षक (A-Z)',
  'common.language': 'भाषा',
};

// ─── Telugu (తెలుగు) ──────────────────────────────────────────────────────────

const te: Translations = {
  'nav.dashboard': 'డాష్‌బోర్డ్', 'nav.copilot': 'AI సహాయకుడు', 'nav.records': 'రికార్డులు', 'nav.abha': 'ABHA రికార్డులు',
  'nav.reports': 'నివేదికలు', 'nav.reportAnalysis': 'రిపోర్ట్ విశ్లేషణ', 'nav.reportComparison': 'రిపోర్టుల పోలిక',
  'nav.medications': 'మందులు', 'nav.reminders': 'రిమైండర్లు',
  'nav.goals': 'లక్ష్యాలు', 'nav.insights': 'అంతర్దృష్టి', 'nav.timeline': 'టైమ్‌లైన్',
  'nav.profile': 'ప్రొఫైల్', 'nav.settings': 'సెట్టింగులు', 'nav.privacy': 'గోప్యత & భద్రత', 'nav.signOut': 'సైన్ అవుట్',
  'page.dashboard': 'డాష్‌బోర్డ్', 'page.records': 'ఆరోగ్య రికార్డులు',
  'page.records.sub': 'మీ ఆరోగ్య పత్రాలన్నింటినీ నిర్వహించండి',
  'page.abha': 'ABHA & ఆరోగ్య రికార్డులు',
  'page.reports': 'వైద్య నివేదికలు', 'page.settings': 'సెట్టింగులు',
  'page.settings.sub': 'మీ ఖాతా, ప్రాధాన్యతలు మరియు డేటాను నిర్వహించండి',
  'page.medications': 'మందులు', 'page.reminders': 'రిమైండర్లు',
  'page.goals': 'ఆరోగ్య లక్ష్యాలు', 'page.insights': 'AI అంతర్దృష్టి', 'page.profile': 'ప్రొఫైల్',
  'records.addRecord': 'రికార్డు జోడించు', 'records.search': 'రికార్డులు వెతకండి...',
  'records.allCategories': 'అన్ని వర్గాలు', 'records.noRecords': 'ఇంకా ఆరోగ్య రికార్డులు లేవు',
  'records.noRecordsDesc': 'మీ మొదటి నివేదికను అప్‌లోడ్ చేయండి.',
  'records.filterBy': 'వడపోత', 'records.sortBy': 'క్రమీకరించు', 'records.clearFilters': 'ఫిల్టర్లు తీసివేయి',
  'records.viewAnalysis': 'విశ్లేషణ చూడు', 'records.view': 'చూడు', 'records.edit': 'సవరించు',
  'records.delete': 'తొలగించు', 'records.demoData': 'డెమో డేటా',
  'records.editRecord': 'రికార్డు సవరించు', 'records.addRecordModal': 'రికార్డు జోడించు',
  'cat.medical_report': 'వైద్య నివేదికలు', 'cat.lab_result': 'లేబ్ ఫలితాలు',
  'cat.prescription': 'ప్రిస్క్రిప్షన్లు', 'cat.doctor_note': 'డాక్టర్ నోట్లు',
  'cat.vaccination': 'వ్యాక్సినేషన్ రికార్డులు', 'cat.other': 'ఇతర',
  'status.uploaded': 'అప్‌లోడ్ చేయబడింది', 'status.analyzed': 'విశ్లేషించబడింది', 'status.pending': 'పెండింగ్',
  'status.normal': 'సాధారణం', 'status.slightly_off': 'కొంచెం తేడా',
  'status.needs_attention': 'శ్రద్ధ అవసరం', 'status.critical': 'క్లిష్టమైనది',
  'ai.summary': 'AI సారాంశం', 'ai.summaryTitle': 'AI ఆరోగ్య సారాంశం',
  'ai.plainLanguage': 'సరళ భాష', 'ai.generating': 'మీ వ్యక్తిగత సారాంశం సరళ భాషలో రూపొందుతోంది…',
  'ai.whatIsThis': 'ఇది ఏమిటి?', 'ai.yourResults': 'మీ ఫలితాలు — సరళ పదాలలో',
  'ai.overallPicture': 'మొత్తం చిత్రం', 'ai.nextSteps': 'తర్వాత ఏమి చేయాలి',
  'ai.gotIt': 'అర్థమైంది', 'ai.poweredBy': 'HealthPilot AI చే',
  'ai.notMedicalAdvice': 'వైద్య సలహా కాదు', 'ai.failedSummary': 'సారాంశం రూపొందించలేదు',
  'ai.failedDesc': 'దయచేసి మళ్ళీ ప్రయత్నించండి.', 'ai.summaryIn': 'సారాంశ భాష',
  'settings.language': 'భాష & ప్రాంతం', 'settings.languageSub': 'ఇంటర్‌ఫేస్ మరియు AI సారాంశాల కోసం భాష ఎంచుకోండి',
  'settings.chooseLanguage': 'ఇంటర్‌ఫేస్ భాష', 'settings.aiSummaryLang': 'AI సారాంశ భాష',
  'settings.aiSummaryLangDesc': 'AI సారాంశాలు ఈ భాషలో రూపొందుతాయి',
  'settings.ocrLanguage': 'OCR భాష (ప్రిస్క్రిప్షన్లకు)', 'settings.ocrLanguageDesc': 'మెరుగైన OCR కోసం భాష ఎంచుకోండి',
  'settings.notifications': 'నోటిఫికేషన్ సెట్టింగులు', 'settings.privacy': 'గోప్యత సెట్టింగులు',
  'settings.aiPrefs': 'AI ప్రాధాన్యతలు', 'settings.dataManagement': 'డేటా నిర్వహణ',
  'settings.account': 'ఖాతా సెట్టింగులు',
  'common.cancel': 'రద్దు', 'common.save': 'సేవ్', 'common.close': 'మూసివేయి',
  'common.loading': 'లోడవుతోంది...', 'common.error': 'లోపం', 'common.success': 'విజయం',
  'common.add': 'జోడించు', 'common.addRecord': 'రికార్డు జోడించు', 'common.title': 'శీర్షిక',
  'common.date': 'తేదీ', 'common.provider': 'ప్రదాత (ఐచ్ఛికం)',
  'common.notes': 'నోట్లు (ఐచ్ఛికం)', 'common.category': 'వర్గం',
  'common.optional': 'ఐచ్ఛికం', 'common.saveChanges': 'మార్పులు సేవ్ చేయి',
  'common.newest': 'కొత్తవి ముందు', 'common.oldest': 'పాతవి ముందు', 'common.titleAZ': 'శీర్షిక (A-Z)',
  'common.language': 'భాష',
};

// ─── Tamil (தமிழ்) ────────────────────────────────────────────────────────────

const ta: Translations = {
  'nav.dashboard': 'டாஷ்போர்டு', 'nav.copilot': 'AI உதவியாளர்', 'nav.records': 'பதிவுகள்', 'nav.abha': 'ABHA பதிவுகள்',
  'nav.reports': 'அறிக்கைகள்', 'nav.reportAnalysis': 'அறிக்கை பகுப்பாய்வு', 'nav.reportComparison': 'அறிக்கை ஒப்பீடு',
  'nav.medications': 'மருந்துகள்', 'nav.reminders': 'நினைவூட்டல்கள்',
  'nav.goals': 'இலக்குகள்', 'nav.insights': 'நுண்ணறிவு', 'nav.timeline': 'காலவரிசை',
  'nav.profile': 'சுயவிவரம்', 'nav.settings': 'அமைப்புகள்', 'nav.privacy': 'தனியுரிமை & பாதுகாப்பு', 'nav.signOut': 'வெளியேறு',
  'page.dashboard': 'டாஷ்போர்டு', 'page.records': 'உடல்நல பதிவுகள்',
  'page.records.sub': 'உங்கள் சுகாதார ஆவணங்களை ஒழுங்கமைக்கவும்',
  'page.abha': 'ABHA & சுகாதார பதிவுகள்',
  'page.reports': 'மருத்துவ அறிக்கைகள்', 'page.settings': 'அமைப்புகள்',
  'page.settings.sub': 'உங்கள் கணக்கு, விருப்பங்கள் மற்றும் தரவை நிர்வகிக்கவும்',
  'page.medications': 'மருந்துகள்', 'page.reminders': 'நினைவூட்டல்கள்',
  'page.goals': 'உடல்நல இலக்குகள்', 'page.insights': 'AI நுண்ணறிவு', 'page.profile': 'சுயவிவரம்',
  'records.addRecord': 'பதிவு சேர்', 'records.search': 'பதிவுகளை தேடு...',
  'records.allCategories': 'அனைத்து வகைகளும்', 'records.noRecords': 'இன்னும் உடல்நல பதிவுகள் இல்லை',
  'records.noRecordsDesc': 'உங்கள் முதல் அறிக்கையை பதிவேற்றவும்.',
  'records.filterBy': 'வடிகட்டு', 'records.sortBy': 'வரிசைப்படுத்து', 'records.clearFilters': 'வடிப்பான்களை நீக்கு',
  'records.viewAnalysis': 'பகுப்பாய்வு காண்', 'records.view': 'காண்', 'records.edit': 'திருத்து',
  'records.delete': 'நீக்கு', 'records.demoData': 'டெமோ தரவு',
  'records.editRecord': 'பதிவை திருத்து', 'records.addRecordModal': 'பதிவை சேர்',
  'cat.medical_report': 'மருத்துவ அறிக்கைகள்', 'cat.lab_result': 'ஆய்வக முடிவுகள்',
  'cat.prescription': 'மருந்து சீட்டுகள்', 'cat.doctor_note': 'மருத்துவர் குறிப்புகள்',
  'cat.vaccination': 'தடுப்பூசி பதிவுகள்', 'cat.other': 'பிற',
  'status.uploaded': 'பதிவேற்றப்பட்டது', 'status.analyzed': 'பகுப்பாய்வு செய்யப்பட்டது', 'status.pending': 'நிலுவையில்',
  'status.normal': 'சாதாரண', 'status.slightly_off': 'சிறிது வித்தியாசம்',
  'status.needs_attention': 'கவனம் தேவை', 'status.critical': 'தீவிரமான',
  'ai.summary': 'AI சுருக்கம்', 'ai.summaryTitle': 'AI உடல்நல சுருக்கம்',
  'ai.plainLanguage': 'எளிய மொழி', 'ai.generating': 'உங்கள் தனிப்பயன் சுருக்கம் எளிய மொழியில் உருவாகிறது…',
  'ai.whatIsThis': 'இது என்ன?', 'ai.yourResults': 'உங்கள் முடிவுகள் — எளிய சொற்களில்',
  'ai.overallPicture': 'ஒட்டுமொத்த படம்', 'ai.nextSteps': 'அடுத்து என்ன செய்ய வேண்டும்',
  'ai.gotIt': 'புரிந்தது', 'ai.poweredBy': 'HealthPilot AI ஆல்',
  'ai.notMedicalAdvice': 'மருத்துவ ஆலோசனை அல்ல', 'ai.failedSummary': 'சுருக்கம் உருவாக்கவில்லை',
  'ai.failedDesc': 'மீண்டும் முயற்சிக்கவும்.', 'ai.summaryIn': 'சுருக்க மொழி',
  'settings.language': 'மொழி & பிராந்தியம்', 'settings.languageSub': 'இடைமுகம் மற்றும் AI சுருக்கங்களுக்கான மொழியை தேர்ந்தெடுக்கவும்',
  'settings.chooseLanguage': 'இடைமுக மொழி', 'settings.aiSummaryLang': 'AI சுருக்க மொழி',
  'settings.aiSummaryLangDesc': 'AI சுருக்கங்கள் இந்த மொழியில் உருவாகும்',
  'settings.ocrLanguage': 'OCR மொழி (மருந்து சீட்டுகளுக்கு)', 'settings.ocrLanguageDesc': 'சிறந்த OCR-க்கு மொழியை தேர்ந்தெடுக்கவும்',
  'settings.notifications': 'அறிவிப்பு அமைப்புகள்', 'settings.privacy': 'தனியுரிமை அமைப்புகள்',
  'settings.aiPrefs': 'AI விருப்பங்கள்', 'settings.dataManagement': 'தரவு மேலாண்மை',
  'settings.account': 'கணக்கு அமைப்புகள்',
  'common.cancel': 'ரத்து செய்', 'common.save': 'சேமி', 'common.close': 'மூடு',
  'common.loading': 'ஏற்றுகிறது...', 'common.error': 'பிழை', 'common.success': 'வெற்றி',
  'common.add': 'சேர்', 'common.addRecord': 'பதிவு சேர்', 'common.title': 'தலைப்பு',
  'common.date': 'தேதி', 'common.provider': 'வழங்குநர் (விருப்பமான)',
  'common.notes': 'குறிப்புகள் (விருப்பமான)', 'common.category': 'வகை',
  'common.optional': 'விருப்பமான', 'common.saveChanges': 'மாற்றங்களை சேமி',
  'common.newest': 'புதியவை முதலில்', 'common.oldest': 'பழையவை முதலில்', 'common.titleAZ': 'தலைப்பு (A-Z)',
  'common.language': 'மொழி',
};

// ─── Bengali (বাংলা) ──────────────────────────────────────────────────────────

const bn: Translations = {
  'nav.dashboard': 'ড্যাশবোর্ড', 'nav.copilot': 'AI সহকারী', 'nav.records': 'রেকর্ড', 'nav.abha': 'ABHA ও রেকর্ড',
  'nav.reports': 'রিপোর্ট', 'nav.reportAnalysis': 'রিপোর্ট বিশ্লেষণ', 'nav.reportComparison': 'রিপোর্ট তুলনা',
  'nav.medications': 'ওষুধ', 'nav.reminders': 'অনুস্মারক',
  'nav.goals': 'লক্ষ্য', 'nav.insights': 'অন্তর্দৃষ্টি', 'nav.timeline': 'টাইমলাইন',
  'nav.profile': 'প্রোফাইল', 'nav.settings': 'সেটিংস', 'nav.privacy': 'গোপনীয়তা ও নিরাপত্তা', 'nav.signOut': 'সাইন আউট',
  'page.dashboard': 'ড্যাশবোর্ড', 'page.records': 'স্বাস্থ্য রেকর্ড',
  'page.records.sub': 'আপনার সমস্ত স্বাস্থ্য নথি সংগঠিত করুন',
  'page.abha': 'ABHA ও স্বাস্থ্য রেকর্ড',
  'page.reports': 'চিকিৎসা রিপোর্ট', 'page.settings': 'সেটিংস',
  'page.settings.sub': 'আপনার অ্যাকাউন্ট, পছন্দ এবং ডেটা পরিচালনা করুন',
  'page.medications': 'ওষুধ', 'page.reminders': 'অনুস্মারক',
  'page.goals': 'স্বাস্থ্য লক্ষ্য', 'page.insights': 'AI অন্তর্দৃষ্টি', 'page.profile': 'প্রোফাইল',
  'records.addRecord': 'রেকর্ড যোগ করুন', 'records.search': 'রেকর্ড খুঁজুন...',
  'records.allCategories': 'সব বিভাগ', 'records.noRecords': 'এখনো কোনো স্বাস্থ্য রেকর্ড নেই',
  'records.noRecordsDesc': 'আপনার প্রথম রিপোর্ট আপলোড করুন।',
  'records.filterBy': 'ফিল্টার', 'records.sortBy': 'সাজান', 'records.clearFilters': 'ফিল্টার সাফ করুন',
  'records.viewAnalysis': 'বিশ্লেষণ দেখুন', 'records.view': 'দেখুন', 'records.edit': 'সম্পাদনা করুন',
  'records.delete': 'মুছুন', 'records.demoData': 'ডেমো ডেটা',
  'records.editRecord': 'রেকর্ড সম্পাদনা করুন', 'records.addRecordModal': 'রেকর্ড যোগ করুন',
  'cat.medical_report': 'চিকিৎসা রিপোর্ট', 'cat.lab_result': 'ল্যাব ফলাফল',
  'cat.prescription': 'প্রেসক্রিপশন', 'cat.doctor_note': 'ডাক্তারের নোট',
  'cat.vaccination': 'টিকার রেকর্ড', 'cat.other': 'অন্যান্য',
  'status.uploaded': 'আপলোড হয়েছে', 'status.analyzed': 'বিশ্লেষিত', 'status.pending': 'অপেক্ষমাণ',
  'status.normal': 'স্বাভাবিক', 'status.slightly_off': 'সামান্য অস্বাভাবিক',
  'status.needs_attention': 'মনোযোগ প্রয়োজন', 'status.critical': 'গুরুত্বপূর্ণ',
  'ai.summary': 'AI সারাংশ', 'ai.summaryTitle': 'AI স্বাস্থ্য সারাংশ',
  'ai.plainLanguage': 'সহজ ভাষা', 'ai.generating': 'আপনার ব্যক্তিগত সারাংশ সহজ ভাষায় তৈরি হচ্ছে…',
  'ai.whatIsThis': 'এটি কী?', 'ai.yourResults': 'আপনার ফলাফল — সহজ ভাষায়',
  'ai.overallPicture': 'সামগ্রিক চিত্র', 'ai.nextSteps': 'পরবর্তী কী করবেন',
  'ai.gotIt': 'বুঝলাম', 'ai.poweredBy': 'HealthPilot AI দ্বারা',
  'ai.notMedicalAdvice': 'চিকিৎসা পরামর্শ নয়', 'ai.failedSummary': 'সারাংশ তৈরি করা যায়নি',
  'ai.failedDesc': 'আবার চেষ্টা করুন।', 'ai.summaryIn': 'সারাংশ ভাষা',
  'settings.language': 'ভাষা ও অঞ্চল', 'settings.languageSub': 'ইন্টারফেস এবং AI সারাংশের ভাষা বেছে নিন',
  'settings.chooseLanguage': 'ইন্টারফেস ভাষা', 'settings.aiSummaryLang': 'AI সারাংশ ভাষা',
  'settings.aiSummaryLangDesc': 'AI সারাংশ এই ভাষায় তৈরি হবে',
  'settings.ocrLanguage': 'OCR ভাষা (প্রেসক্রিপশনের জন্য)', 'settings.ocrLanguageDesc': 'ভালো OCR-এর জন্য ভাষা বেছে নিন',
  'settings.notifications': 'বিজ্ঞপ্তি সেটিংস', 'settings.privacy': 'গোপনীয়তা সেটিংস',
  'settings.aiPrefs': 'AI পছন্দ', 'settings.dataManagement': 'ডেটা ব্যবস্থাপনা',
  'settings.account': 'অ্যাকাউন্ট সেটিংস',
  'common.cancel': 'বাতিল', 'common.save': 'সংরক্ষণ', 'common.close': 'বন্ধ করুন',
  'common.loading': 'লোড হচ্ছে...', 'common.error': 'ত্রুটি', 'common.success': 'সফল',
  'common.add': 'যোগ করুন', 'common.addRecord': 'রেকর্ড যোগ করুন', 'common.title': 'শিরোনাম',
  'common.date': 'তারিখ', 'common.provider': 'প্রদানকারী (ঐচ্ছিক)',
  'common.notes': 'নোট (ঐচ্ছিক)', 'common.category': 'বিভাগ',
  'common.optional': 'ঐচ্ছিক', 'common.saveChanges': 'পরিবর্তন সংরক্ষণ করুন',
  'common.newest': 'নতুন আগে', 'common.oldest': 'পুরনো আগে', 'common.titleAZ': 'শিরোনাম (A-Z)',
  'common.language': 'ভাষা',
};

// ─── Marathi (मराठी) ─────────────────────────────────────────────────────────

const mr: Translations = {
  'nav.dashboard': 'डॅशबोर्ड', 'nav.copilot': 'AI सहाय्यक', 'nav.records': 'नोंदी', 'nav.abha': 'ABHA नोंदी',
  'nav.reports': 'अहवाल', 'nav.reportAnalysis': 'अहवाल विश्लेषण', 'nav.reportComparison': 'अहवाल तुलना',
  'nav.medications': 'औषधे', 'nav.reminders': 'स्मरणपत्रे',
  'nav.goals': 'लक्ष्य', 'nav.insights': 'अंतर्दृष्टी', 'nav.timeline': 'टाइमलाइन',
  'nav.profile': 'प्रोफाइल', 'nav.settings': 'सेटिंग्ज', 'nav.privacy': 'गोपनीयता आणि सुरक्षितता', 'nav.signOut': 'साइन आउट',
  'page.dashboard': 'डॅशबोर्ड', 'page.records': 'आरोग्य नोंदी',
  'page.records.sub': 'तुमची सर्व आरोग्य कागदपत्रे व्यवस्थापित करा',
  'page.abha': 'ABHA आणि आरोग्य नोंदी',
  'page.reports': 'वैद्यकीय अहवाल', 'page.settings': 'सेटिंग्ज',
  'page.settings.sub': 'तुमचे खाते, प्राधान्ये आणि डेटा व्यवस्थापित करा',
  'page.medications': 'औषधे', 'page.reminders': 'स्मरणपत्रे',
  'page.goals': 'आरोग्य लक्ष्य', 'page.insights': 'AI अंतर्दृष्टी', 'page.profile': 'प्रोफाइल',
  'records.addRecord': 'नोंद जोडा', 'records.search': 'नोंदी शोधा...',
  'records.allCategories': 'सर्व श्रेण्या', 'records.noRecords': 'अद्याप कोणत्याही आरोग्य नोंदी नाहीत',
  'records.noRecordsDesc': 'तुमचा पहिला अहवाल अपलोड करा.',
  'records.filterBy': 'फिल्टर', 'records.sortBy': 'क्रमवारी', 'records.clearFilters': 'फिल्टर साफ करा',
  'records.viewAnalysis': 'विश्लेषण पहा', 'records.view': 'पहा', 'records.edit': 'संपादित करा',
  'records.delete': 'हटवा', 'records.demoData': 'डेमो डेटा',
  'records.editRecord': 'नोंद संपादित करा', 'records.addRecordModal': 'नोंद जोडा',
  'cat.medical_report': 'वैद्यकीय अहवाल', 'cat.lab_result': 'प्रयोगशाळा निकाल',
  'cat.prescription': 'प्रिस्क्रिप्शन', 'cat.doctor_note': 'डॉक्टरांच्या नोंदी',
  'cat.vaccination': 'लसीकरण नोंदी', 'cat.other': 'इतर',
  'status.uploaded': 'अपलोड केले', 'status.analyzed': 'विश्लेषित', 'status.pending': 'प्रलंबित',
  'status.normal': 'सामान्य', 'status.slightly_off': 'थोडे असामान्य',
  'status.needs_attention': 'लक्ष आवश्यक', 'status.critical': 'गंभीर',
  'ai.summary': 'AI सारांश', 'ai.summaryTitle': 'AI आरोग्य सारांश',
  'ai.plainLanguage': 'सोप्या भाषेत', 'ai.generating': 'तुमचा वैयक्तिक सारांश सोप्या भाषेत तयार होत आहे…',
  'ai.whatIsThis': 'हे काय आहे?', 'ai.yourResults': 'तुमचे निकाल — सोप्या शब्दांत',
  'ai.overallPicture': 'एकूण चित्र', 'ai.nextSteps': 'पुढे काय करायचे',
  'ai.gotIt': 'समजले', 'ai.poweredBy': 'HealthPilot AI द्वारे',
  'ai.notMedicalAdvice': 'वैद्यकीय सल्ला नाही', 'ai.failedSummary': 'सारांश तयार होऊ शकला नाही',
  'ai.failedDesc': 'कृपया पुन्हा प्रयत्न करा.', 'ai.summaryIn': 'सारांश भाषा',
  'settings.language': 'भाषा आणि प्रदेश', 'settings.languageSub': 'इंटरफेस आणि AI सारांशांसाठी भाषा निवडा',
  'settings.chooseLanguage': 'इंटरफेस भाषा', 'settings.aiSummaryLang': 'AI सारांश भाषा',
  'settings.aiSummaryLangDesc': 'AI सारांश या भाषेत तयार होतील',
  'settings.ocrLanguage': 'OCR भाषा (प्रिस्क्रिप्शनसाठी)', 'settings.ocrLanguageDesc': 'चांगल्या OCR साठी भाषा निवडा',
  'settings.notifications': 'सूचना सेटिंग्ज', 'settings.privacy': 'गोपनीयता सेटिंग्ज',
  'settings.aiPrefs': 'AI प्राधान्ये', 'settings.dataManagement': 'डेटा व्यवस्थापन',
  'settings.account': 'खाते सेटिंग्ज',
  'common.cancel': 'रद्द करा', 'common.save': 'जतन करा', 'common.close': 'बंद करा',
  'common.loading': 'लोड होत आहे...', 'common.error': 'त्रुटी', 'common.success': 'यश',
  'common.add': 'जोडा', 'common.addRecord': 'नोंद जोडा', 'common.title': 'शीर्षक',
  'common.date': 'तारीख', 'common.provider': 'प्रदाता (पर्यायी)',
  'common.notes': 'नोंदी (पर्यायी)', 'common.category': 'श्रेणी',
  'common.optional': 'पर्यायी', 'common.saveChanges': 'बदल जतन करा',
  'common.newest': 'नवीन आधी', 'common.oldest': 'जुने आधी', 'common.titleAZ': 'शीर्षक (A-Z)',
  'common.language': 'भाषा',
};

// ─── Registry ─────────────────────────────────────────────────────────────────

const TRANSLATIONS: Record<LangCode, Translations> = { en, hi, te, ta, bn, mr };

/**
 * Get the translation for a key in a given language.
 * Falls back to English if the key is missing in the target language.
 */
export function t(key: TranslationKey, lang: LangCode = 'en'): string {
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['en'][key] ?? key;
}

/**
 * Retrieve the full LangMeta object for a given code.
 */
export function getLangMeta(code: LangCode): LangMeta {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/**
 * Return the Groq/AI-friendly full language name to embed in prompts.
 * e.g.  hi → "Hindi"   te → "Telugu"
 */
export function langNameForPrompt(code: LangCode): string {
  const map: Record<LangCode, string> = {
    en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil', bn: 'Bengali', mr: 'Marathi',
  };
  return map[code];
}
