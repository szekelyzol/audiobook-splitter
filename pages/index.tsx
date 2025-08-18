import { useState, useMemo } from 'react';
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
import { ACCORDION_SECTIONS } from '../constants/ui';
import type { AccordionSection } from '../types/ui';

export default function Home() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [timestampInput, setTimestampInput] = useState('');
  const [generatedCommands, setGeneratedCommands] = useState<string[]>([]);
  const [openSection, setOpenSection] = useState<AccordionSection>(null);

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
    timestampInput.trim().length > 0, 
    [timestampInput]
  );

  // Event handlers
  const toggleSection = (key: AccordionSection) => {
    setOpenSection(prev => (prev === key ? null : key));
  };

  const handleGenerateCommands = () => {
    if (!normalizedUrl || !isValidUrl) return;
    
    const commands = createCommands(normalizedUrl, parsedChapters);
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
  };

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

        <button
          onClick={handleGenerateCommands}
          disabled={!sourceUrl || !isValidUrl}
          className={styles.generateButton}
        >
          generate
        </button>

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