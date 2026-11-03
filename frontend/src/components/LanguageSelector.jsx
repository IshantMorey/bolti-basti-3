import React from 'react';
import { Languages } from 'lucide-react';

const LANGUAGES = [
  { code: 'mr-IN', name: 'मराठी', label: 'Marathi' },
  { code: 'hi-IN', name: 'हिन्दी', label: 'Hindi' },
  { code: 'en-IN', name: 'English', label: 'English' }
];

export default function LanguageSelector({ selectedLang, onSelectLang }) {
  return (
    <div className="lang-bar">
      <span style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Languages size={16} /> भाषा / Language:
      </span>
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={`lang-btn ${selectedLang === lang.code ? 'active' : ''}`}
          onClick={() => onSelectLang(lang.code)}
        >
          {lang.name} <span style={{ opacity: 0.7, fontSize: '0.75rem' }}>({lang.label})</span>
        </button>
      ))}
    </div>
  );
}
