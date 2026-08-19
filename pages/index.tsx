import { useState, useMemo, useEffect } from 'react';
import styles from '../styles/Home.module.css';
import { useTimestampParser } from '../hooks/useTimestampParser';
import { useCommandGenerator } from '../hooks/useCommandGenerator';
import { useBatchCommandGenerator } from '../hooks/useBatchCommandGenerator';
import { useUrlListParser } from '../hooks/useUrlListParser';
import { useDebounce } from '../hooks/useDebounce';
import { isValidYouTubeUrl, normalizeYouTubeUrl } from '../utils/youtube';
import { UrlInput } from '../components/UrlInput';
import { UrlListInput } from '../components/UrlListInput';
import { TimestampInput } from '../components/TimestampInput';
import { StatusMessages, Status } from '../components/StatusMessages';
import { CommandOutput } from '../components/CommandOutput';
import { Sidebar } from '../components/Sidebar';
import type { AccordionSection } from '../types/ui';

type Mode = 'single' | 'playlist';

export default function Home() {
  const [mode, setMode] = useState<Mode>('single');
  const [sourceUrl, setSourceUrl] = useState('');
  const [timestampInput, setTimestampInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [urlListInput, setUrlListInput] = useState('');
  const [generatedCommands, setGeneratedCommands] = useState<string[]>([]);
  const [openSection, setOpenSection] = useState<AccordionSection>(null);
  const [status, setStatus] = useState<Status>(null);

  // Debounce URL input to avoid excessive validation
  const debouncedUrl = useDebounce(sourceUrl, 300);

  // Hooks
  const { parseTimestamps } = useTimestampParser();
  const { generateCommands: createCommands } = useCommandGenerator();
  const { generateBatchCommands } = useBatchCommandGenerator();
  const { parseUrlList } = useUrlListParser();

  // URL
  const isValidUrl = useMemo(() => (debouncedUrl ? isValidYouTubeUrl(debouncedUrl) : false), [debouncedUrl]);
  const normalizedUrl = useMemo(() => (sourceUrl ? normalizeYouTubeUrl(sourceUrl) : ''), [sourceUrl]);

  // Timestamps
  const parsedChapters = useMemo(() => parseTimestamps(timestampInput), [timestampInput, parseTimestamps]);
  const timestampProvided = useMemo(() => timestampInput.trim().length > 0, [timestampInput]);
  const hasTimestamps = useMemo(() => timestampProvided && parsedChapters.length > 0, [timestampProvided, parsedChapters.length]);

  // Playlist mode: list of URLs
  const { validUrls, invalidLines } = useMemo(() => parseUrlList(urlListInput), [urlListInput, parseUrlList]);

  // Centralized status messages
  useEffect(() => {
    if (mode === 'playlist') {
      if (!urlListInput.trim()) { setStatus(null); return; }
      if (validUrls.length === 0) { setStatus({ type: 'error', text: '⚠ no valid youtube urls found' }); return; }
      if (invalidLines.length > 0) { setStatus({ type: 'error', text: `⚠ ${invalidLines.length} invalid url(s) found - ${validUrls.length} valid` }); return; }
      setStatus({ type: 'success', text: `found ${validUrls.length} url(s)` });
      return;
    }

    // 1) invalid URL
    if (sourceUrl && !isValidUrl) {
      setStatus({ type: 'error', text: '⚠ invalid youtube url format' });
      return;
    }

    // 2) split-only notice (no URL + valid timestamps)
    if (!sourceUrl && hasTimestamps) {
      setStatus({ type: 'notice', text: "no URL detected, I'm assuming that you only want to split audio files." });
      return;
    }

    // 3) download-only info (URL ok + no timestamps provided at all)
    if (sourceUrl && isValidUrl && !timestampProvided) {
      setStatus({ type: 'info', text: 'no timestamps provided - will download as single mp3 file' });
      return;
    }

    // 4) invalid timestamps (text present but nothing parsed)
    if (sourceUrl && isValidUrl && timestampProvided && !hasTimestamps) {
      setStatus({ type: 'error', text: 'no valid timestamps found' });
      return;
    }

    // 5) SUCCESS — only when there is a valid URL and valid timestamps
    if (sourceUrl && isValidUrl && hasTimestamps && parsedChapters.length > 0) {
      setStatus({ type: 'success', text: `found ${parsedChapters.length} chapter(s)` });
      return;
    }

    // default: no message
    setStatus(null);
  }, [mode, urlListInput, validUrls.length, invalidLines.length, sourceUrl, isValidUrl, timestampProvided, hasTimestamps, parsedChapters.length]);

  // UI helpers
  const toggleSection = (key: AccordionSection) => setOpenSection(prev => (prev === key ? null : key));

  const handleGenerateCommands = () => {
    if (mode === 'playlist') {
      setGeneratedCommands(generateBatchCommands(validUrls));
      return;
    }

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

  const handleModeChange = (next: Mode) => {
    setMode(next);
    setGeneratedCommands([]);
  };

  // Enable when: (a) URL is valid (download-only or download+split), or (b) no URL and we have valid timestamps (split-only)
  const canGenerate = mode === 'playlist' ? validUrls.length > 0 : (sourceUrl ? isValidUrl : hasTimestamps);

  return (
    <div className={styles.container}>
      <div className={styles.mainView}>
        <h1 className={styles.title}>audiobook splitter</h1>

        <div className={styles.introBox}>
          <p><strong>Welcome!</strong></p>
          <p>This tool helps you download audio from youtube and split the resulting file into individual tracks, based on the timestamps.</p>
          <p>It requires minimal setup to work. Check the sidebar for more details!</p>
        </div>

        <div className={styles.modeToggle} role="tablist" aria-label="Mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'single'}
            onClick={() => handleModeChange('single')}
            className={mode === 'single' ? styles.modeButtonActive : styles.modeButton}
          >
            single video
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'playlist'}
            onClick={() => handleModeChange('playlist')}
            className={mode === 'playlist' ? styles.modeButtonActive : styles.modeButton}
          >
            playlist (multiple urls)
          </button>
        </div>

        {mode === 'single' ? (
          <>
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
          </>
        ) : (
          <UrlListInput value={urlListInput} onChange={setUrlListInput} />
        )}

        <button onClick={handleGenerateCommands} disabled={!canGenerate} className={styles.generateButton} aria-disabled={!canGenerate}>
          generate
        </button>

        <StatusMessages message={status} />

        {generatedCommands.length > 0 && (
          <CommandOutput commands={generatedCommands} onCopy={handleCopyCommands} onReset={handleReset} />
        )}
      </div>

      <Sidebar openSection={openSection} onToggleSection={toggleSection} />
    </div>
  );
}
