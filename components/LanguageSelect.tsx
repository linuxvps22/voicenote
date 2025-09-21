export function LanguageSelect({
  languages,
  disabled,
  defaultLanguage,
}: {
  languages: (readonly [code: string, displayName: string])[];
  disabled?: boolean;
  defaultLanguage?: string;
}) {
  return (
    <label>
      Select language
      <select
        key={`lang-${defaultLanguage ?? 'en'}`}
        defaultValue={defaultLanguage ?? 'en'}
        name="language"
        disabled={disabled}
      >
        {languages.map(([code, displayName]) => (
          <option key={code} value={code} label={displayName} />
        ))}
      </select>
    </label>
  );
}
