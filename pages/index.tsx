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

  const debouncedUrl = useDebounce(sourceUrl, 300);
  const { parseTimestamps } = useTimestampParser();
  const { generateCommands: createCommands } = useCommandGenerator();

  const isValidUrl = useMemo(() => (debouncedUrl ? isValidYouTubeUrl(debouncedUrl) : false), [debouncedUrl]);
  const normalizedUrl = useMemo(() => (sourceUrl ? normalizeYouTubeUrl(sourceUrl) : ''), [sourceUrl]);

  const parsedChapters = useMemo(() => parseTimestamps(timestampInput), [timestampInput, parseTimestamps]);

  // Distinguish between user-provided input and actually parsed chapters
  const timestampProvided = useMemo(() => timestampInput.trim().length > 0, [timestampInput]);
  const hasTimestamps = useMemo(
    () => timestampProvided && parsedChapters.length > 0,
    [timestampProvided, parsedChapters.length]
  );

  useEffect(() => { setNotice(''); }, [sourceUrl, timestampInput]);

  const toggleSection = (key: AccordionSection) => setOpenSection(prev => (prev === key ? null : key));

  const handleGenerateCommands = () => {
    const urlProvided = normalizedUrl.length > 0;
    if (urlProvided && !isValidUrl) return;

    if (!urlProvided && hasTimestamps) {
      setNotice("no URL detected, I'm assuming that you only want to split audio files.");
    }

    const commands = createCommands(urlProvided ? normalizedUrl : '', parsedChapters, titleInput.trim());
    setGeneratedCommands(commands);
  };

  const handleCopyCommands = async () => {
    try { await navigator.clipboard.writeText(generatedCommands.join('\n')); alert('Commands copied to clipboard!'); }
    catch (error) { console.error('Failed to copy:', error); alert('Copy failed. Please copy manually.'); }
  };

  const handleReset = () => { setGeneratedCommands([]); setNotice(''); };

  // Enable when: (a) URL is valid (download-only or download+split), or (b) no URL and we have valid timestamps (split-only)
  const canGenerate = sourceUrl ? isValidUrl : hasTimestamps;

  return (
    <div className={styles.container}>
      <div className={styles.mainView}>
        <h1 className={styles.title}>audiobook splitter</h1>

        <div className={styles.introBox}>
          <p><strong>Welcome!</strong></p>
          <p>This tool helps you download audio from youtube and split the resulting file into individual tracks, based on the timestamps.</p>
          <p>It requires minimal setup to work. Check the sidebar for more details!</p>
        </div>

        <UrlInput value={sourceUrl} onChange={setSourceUrl} />
        <TimestampInput value={timestampInput} onChange={setTimestampInput} />

        <input
          type="text"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          placeholder="custom title (optional)"
          className={styles.inputBase}
          aria-label="Custom Title"
        />

        <button onClick={handleGenerateCommands} disabled={!canGenerate} className={styles.generateButton} aria-disabled={!canGenerate}>
          generate
        </button>

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
          allowEmptyUrl={hasTimestamps}
          timestampProvided={timestampProvided}
        />

        {generatedCommands.length > 0 && (
          <CommandOutput commands={generatedCommands} onCopy={handleCopyCommands} onReset={handleReset} />
        )}
      </div>

      <Sidebar openSection={openSection} onToggleSection={toggleSection} />
    </div>
  );
}
