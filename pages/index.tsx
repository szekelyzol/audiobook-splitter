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

// Status type for a single message rendered by StatusMessages
type Status = { type: 'info' | 'error' | 'notice'; text: string } | null;

export default function Home() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [timestampInput, setTimestampInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [generatedCommands, setGeneratedCommands] = useState<string[]>([]);
  const [openSection, setOpenSection] = useState<AccordionSection>(null);
  const [status, setStatus] = useState<Status>(null);

  const debouncedUrl = useDebounce(sourceUrl, 300);
  const { parseTimestamps } = useTimestampParser();
  const { generateCommands: createCommands } = useCommandGenerator();

  const isValidUrl = useMemo(() => (debouncedUrl ? isValidYouTubeUrl(debouncedUrl) : false), [debouncedUrl]);
  const normalizedUrl = useMemo(() => (sourceUrl ? normalizeYouTubeUrl(sourceUrl) : ''), [sourceUrl]);

  const parsedChapters = useMemo(() => parseTimestamps(timestampInput), [timestampInput, parseTimestamps]);

  // Distinguish between "user typed something" and "we parsed chapters"
  const timestampProvided = useMemo(() => timestampInput.trim().length > 0, [timestampInput]);
  const hasTimestamps = useMemo(() => timestampProvided && parsedChapters.length > 0, [timestampProvided, parsedChapters.length]);

  // Centralize ALL status messages via useEffect
  useEffect(() => {
    // Priority order of messages:
    // 1) Invalid URL
    if (sourceUrl && !isValidUrl) {
      setStatus({ type: 'error', text: '⚠ invalid youtube url format' });
      return;
    }

    // 2) Split-only info (no URL + valid timestamps)
    if (!sourceUrl && hasTimestamps) {
      setStatus({ type: 'notice', text: "no URL detected, I'm assuming that you only want to split audio files." });
      return;
    }

    // 3) Download-only info (URL ok + no timestamps provided at all)
    if (sourceUrl && isValidUrl && !timestampProvided) {
      setStatus({ type: 'info', text: 'ℹ no timestamps provided - will download as single mp3 file' });
      return;
    }

    // 4) Invalid timestamps (text present but nothing parsed)
    if (sourceUrl && isValidUrl && timestampProvided && !hasTimestamps) {
      setStatus({ type: 'error', text: '⚠ no valid timestamps found' });
      return;
    }

    // 5) Otherwise, no status message (no separate "success" state by request)
    setStatus(null);
  }, [sourceUrl, isValidUrl, timestampProvided, hasTimestamps]);

  const toggleSection = (key: AccordionSection) => setOpenSection(prev => (prev === key ? null : key));

  const handleGenerateCommands = () => {
    const urlProvided = normalizedUrl.length > 0;
    if (urlProvided && !isValidUrl) return;

    const commands = createCommands(urlProvided ? normalizedUrl : '', parsedChapters, titleInput.trim());
    setGeneratedCommands(commands);
  };

  const handleCopyCommands = async () => {
    try { await navigator.clipboard.writeText(generatedCommands.join('\n')); alert('Commands copied to clipboard!'); }
    catch (error) { console.error('Failed to copy:', error); alert('Copy failed. Please copy manually.'); }
  };

  const handleReset = () => { setGeneratedCommands([]); };

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

        {/* Single source of truth for status messaging */}
        <StatusMessages message={status} />

        {generatedCommands.length > 0 && (
          <CommandOutput commands={generatedCommands} onCopy={handleCopyCommands} onReset={handleReset} />
        )}
      </div>

      <Sidebar openSection={openSection} onToggleSection={toggleSection} />
    </div>
  );
}
