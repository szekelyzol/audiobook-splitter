import { useState, useMemo, useEffect } from 'react';
import styles from '../styles/Home.module.css';
import { useTimestampParser } from '../hooks/useTimestampParser';
import { useCommandGenerator } from '../hooks/useCommandGenerator';
import { useDebounce } from '../hooks/useDebounce';
import { isValidYouTubeUrl, normalizeYouTubeUrl } from '../utils/youtube';
import { UrlInput } from '../components/UrlInput';
import { TimestampInput } from '../components/TimestampInput';
import { StatusMessages } from '../components/StatusMessages';
import { CommandOutput } from '../components/CommandOutput';
import { Sidebar } from '../components/Sidebar';
import type { AccordionSection } from '../types/ui';

export default function Home() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [timestampInput, setTimestampInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [generatedCommands, setGeneratedCommands] = useState<string[]>([]);
  const [openSection, setOpenSection] = useState<AccordionSection>(null);
  const [notice, setNotice] = useState<string>('');

  // Debounce URL input to avoid excessive validation
  const debouncedUrl = useDebounce(sourceUrl, 300);
  
  // Custom hooks for business logic
  const { parseTimestamps } = useTimestampParser();
  const { generateCommands: createCommands } = useCommandGenerator();

  // Memoized computations
  const isValidUrl = useMemo(() => 
    debouncedUrl ? isValidYouTubeUrl(debouncedUrl) : false, 
    [debouncedUrl]
  );

  const normalizedUrl = useMemo(() => 
    sourceUrl ? normalizeYouTubeUrl(sourceUrl) : '', 
    [sourceUrl]
  );

  const parsedChapters = useMemo(() => 
    parseTimestamps(timestampInput), 
    [timestampInput, parseTimestamps]
  );

  const hasTimestamps = useMemo(() => 
    timestampInput.trim().length > 0 && parsedChapters.length > 0, 
    [timestampInput, parsedChapters.length]
  );

  // Reset notice if inputs change meaningfully
  useEffect(() => {
    setNotice('');
  }, [sourceUrl, timestampInput]);

  // Event handlers
  const toggleSection = (key: AccordionSection) => {
    setOpenSection(prev => (prev === key ? null : key));
  };

  const handleGenerateCommands = () => {
    // Allow empty URL: if a URL is provided but invalid, do nothing; if empty, proceed in split-only mode
    const urlProvided = normalizedUrl.length > 0;
    if (urlProvided && !isValidUrl) return;

    // When URL missing but timestamps valid, show custom notice
    if (!urlProvided && hasTimestamps) {
      setNotice("No URL detected, I am assuming that you only want to split audio files.");
    }

    // Pass empty string/undefined to signal split-only mode to the generator
    const commands = createCommands(
      urlProvided ? normalizedUrl : '',  // empty string when no URL
      parsedChapters,
      titleInput.trim()
    );
    setGeneratedCommands(commands);
  };

  const handleCopyCommands = async () => {
    try {
      await navigator.clipboard.writeText(generatedCommands.join('\n'));
      // In a real app, you'd show a toast notification instead of alert
      alert('Commands copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Copy failed. Please copy manually.');
    }
  };

  const handleReset = () => {
    setGeneratedCommands([]);
    setNotice('');
  };

  // Button should be enabled when timestamps are valid, and either URL is empty OR it's valid
  const canGenerate = hasTimestamps && (!sourceUrl || isValidUrl);

  return (
    <div className={styles.container}>
      <div className={styles.mainView}>
        <h1 className={styles.title}>audiobook splitter</h1>

        <div className={styles.introBox}>
          <p><strong>Welcome!</strong></p>
          <p>This tool helps you download audio from youtube and split the resulting file into individual tracks, based on the timestamps.</p>
          <p>It requires minimal setup to work. Check the sidebar for more details!</p>
        </div>

        <UrlInput 
          value={sourceUrl}
          onChange={setSourceUrl}
        />

        <TimestampInput 
          value={timestampInput}
          onChange={setTimestampInput}
        />

        <input
          type="text"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          placeholder="custom title (optional)"
          className={styles.inputBase}
          aria-label="Custom Title"
        />

        <button
          onClick={handleGenerateCommands}
          disabled={!canGenerate}
          className={styles.generateButton}
          aria-disabled={!canGenerate}
        >
          generate
        </button>

        {/* Custom empty-URL notice */}
        {notice && (
          <div className={styles.introBox} role="status" aria-live="polite" style={{ marginTop: 10 }}>
            {notice}
          </div>
        )}

        <StatusMessages 
          sourceUrl={sourceUrl}
          debouncedUrl={debouncedUrl}
          isValidUrl={isValidUrl}
          hasTimestamps={hasTimestamps}
          chaptersCount={parsedChapters.length}
          showValidation={debouncedUrl === sourceUrl || sourceUrl === ''}
        />

        {generatedCommands.length > 0 && (
          <CommandOutput 
            commands={generatedCommands}
            onCopy={handleCopyCommands}
            onReset={handleReset}
          />
        )}
      </div>

      <Sidebar 
        openSection={openSection}
        onToggleSection={toggleSection}
      />
    </div>
  );
}
