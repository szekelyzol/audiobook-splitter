import { useState } from 'react';
import styles from '../styles/Home.module.css';

interface Chapter {
  start: string;
  end: string;
  title: string;
}

export default function Home() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [timestampInput, setTimestampInput] = useState('');
  const [generatedCommands, setGeneratedCommands] = useState<string[]>([]);

  // Accordion: which sidebar section is open?
  const [openSection, setOpenSection] = useState<'info' | 'requirements' | 'howto' | null>(null);
  const toggleSection = (key: 'info' | 'requirements' | 'howto') => {
    setOpenSection(prev => (prev === key ? null : key));
  };

  const isValidYouTubeUrl = (url: string): boolean => {
    if (!url) return false;
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
      /^https?:\/\/m\.youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/(www\.)?youtube-nocookie\.com\/embed\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/
    ];
    return patterns.some(pattern => pattern.test(url));
  };

  const parseTimestamps = (input: string): Chapter[] => {
    if (!input.trim()) return [];

    const lines = input.split('\n').map(line => line.trim()).filter(line => line !== '');
    const chapters: Chapter[] = [];

    let startIndex = 0;
    if (lines[0] && lines[0].toUpperCase() === 'WEBVTT') {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('-->')) {
        const [start, end = ''] = line.split('-->').map(part => part.trim());
        const title = lines[i + 1]?.trim() || `Chapter ${chapters.length + 1}`;

        chapters.push({
          start: normalizeTimestamp(start),
          end: normalizeTimestamp(end),
          title: sanitizeTitle(title)
        });
        i++;
      }
      else if (line.match(/(\d+:[\d:]+)|(\d+\.\s)|(\d+:\s)|(Chapter\s+\d+)/i)) {
        const timeMatch = line.match(/(\d+:[\d:]+)/);
        let title = '';
        let start = '';

        if (timeMatch) {
          start = normalizeTimestamp(timeMatch[1]);
          title = line.replace(timeMatch[0], '').replace(/[-–—]/g, '').trim();
        } else {
          const chapterMatch = line.match(/Chapter\s+(\d+)/i);
          if (chapterMatch) {
            title = line;
            start = '00:00:00';
          }
        }

        if (start && title) {
          chapters.push({
            start,
            end: '',
            title: sanitizeTitle(title)
          });
        }
      }
    }

    // Fill missing end times with next chapter's start
    for (let i = 0; i < chapters.length - 1; i++) {
      if (!chapters[i].end) {
        chapters[i].end = chapters[i + 1].start;
      }
    }

    return chapters;
  };

  const normalizeTimestamp = (timestamp: string): string => {
    if (!timestamp) return '';
    const cleaned = timestamp.replace(/\.\d+/, '').trim();
    const parts = cleaned.split(':');

    if (parts.length === 2) {
      return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    } else if (parts.length === 3) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    }
    return cleaned;
  };

  const sanitizeTitle = (title: string): string => {
    if (!title || title.trim() === '') {
      return 'Untitled_Chapter';
    }

    let cleaned = title
      .replace(/^Chapter\s+\d+:?\s*/i, '')
      .replace(/^\d+\.\s*/, '')
      .trim();

    if (!cleaned || /^\d+$/.test(cleaned)) {
      cleaned = title.trim();
    }

    return cleaned
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50)
      || 'Untitled_Chapter';
  };

    const generateCommands = () => {
      if (!sourceUrl) return;
    
      const commands: string[] = [];

    // If no timestamps are added, just download the full audio
    if (parsedChapters.length === 0) {
      commands.push('# Download full audio as single file');
      commands.push(`yt-dlp -x --audio-format mp3 -o "audiobook.mp3" "${sourceUrl}"`);

      setGeneratedCommands(commands);
      return;
    }

    // Generate macOS commands
    commands.push('# Step 1: Download audio from source');
    commands.push(`yt-dlp -x --audio-format mp3 -o "audiobook.%(ext)s" "${sourceUrl}"`);
    commands.push('');
    commands.push('# Step 2: Split audio into chapters');
    commands.push('');

    parsedChapters.forEach((chapter, index) => {
      const paddedIndex = (index + 1).toString().padStart(2, '0');
      let cmd = `ffmpeg -i "audiobook.mp3" -ss ${chapter.start}`;
      if (chapter.end) {
        cmd += ` -to ${chapter.end}`;
      }
      cmd += ` -c copy "${paddedIndex}_${chapter.title}.mp3"`;
      commands.push(cmd);
    });

    setGeneratedCommands(commands);
  }  

  const copyCommands = () => {
    navigator.clipboard.writeText(generatedCommands.join('\n'));
    alert('Commands copied to clipboard!');
  };

  // Quick copy helper for installer commands
  const copyLine = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => alert('Command copied!'))
      .catch(() => alert('Copy failed. Please copy manually.'));
  };

  // Package-manager installer commands
  const WIN_WINGET = 'winget install -e --id yt-dlp.yt-dlp && winget install -e --id FFmpeg.FFmpeg';

  const MAC_BREW  = 'brew install yt-dlp ffmpeg';
  
  // compute once per render for UI messages
  const parsedChapters = parseTimestamps(timestampInput);

  return (
    <div className={styles.minimalContainer}>
      {/* Main section */}
      <div className={styles.mainView}>
        <h1 className={styles.minimalTitle}>audiobook splitter</h1>

        {/* INTRO section */}
        <div className={styles.introbox}>
          <p><strong>welcome!</strong></p>
          <p>this tool helps you download audio from youtube and split the resulting file into individual tracks, based on the timestamps.</p>
          <p>it offers a manual and an automated workflow: use the generated command line prompts, or use the script that runs the prompts for you.</p>
          <p>open the sidebar for more details!</p>
        </div>

        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="youtube url"
          className={styles.minimalInput}
        />

        <textarea
          value={timestampInput}
          onChange={(e) => setTimestampInput(e.target.value)}
          placeholder="timestamps (e.g. 00:00 Introduction)"
          rows={8}
          className={styles.minimalTextarea}
        />

        {/* Error/Success messages */}
        {sourceUrl && !isValidYouTubeUrl(sourceUrl) && (
          <div className={styles.errorMessage}>⚠ invalid youtube url format</div>
        )}
        {!sourceUrl && timestampInput && (
          <div className={styles.errorMessage}>⚠ missing youtube url</div>
        )}
        {sourceUrl && isValidYouTubeUrl(sourceUrl) && parsedChapters.length === 0 && timestampInput && (
          <div className={styles.errorMessage}>⚠ no valid timestamps found</div>
        )}
        {sourceUrl && isValidYouTubeUrl(sourceUrl) && !timestampInput.trim() && (
          <div className={styles.infoMessage}>ℹ no timestamps provided - will download as single mp3 file</div>
        )}
        {sourceUrl && isValidYouTubeUrl(sourceUrl) && parsedChapters.length > 0 && (
          <div className={styles.successMinimal}>✓ found {parsedChapters.length} chapter(s)</div>
        )}

        <button
          onClick={generateCommands}
          disabled={!sourceUrl || !isValidYouTubeUrl(sourceUrl)}
          className={styles.minimalButton}
        >
          generate
        </button>

        {/* GENERATED COMMANDS section */}
        {generatedCommands.length > 0 && (
          <div className={styles.minimalCommands}>
            <pre>{generatedCommands.join('\n')}</pre>
            <div className={styles.minimalActions}>
              <button onClick={copyCommands} title="Copy commands to clipboard">copy</button>
              <button onClick={() => setGeneratedCommands([])} title="Clear everything">reset</button>
            </div>
          </div>
        )}
      </div>

      {/* SIDEBAR (always visible, with accordion behavior) */}
      <div className={`${styles.sidebar} ${styles.sidebarOpen}`}>
        <div className={styles.sidebarContent}>

          {/* INFO section */}
          <details open={openSection === 'info'}>
            <summary onClick={(e) => { e.preventDefault(); toggleSection('info'); }}>
              <h2>info</h2>
            </summary>
            <p>I created this tool to download audiobooks from youtube and split them into separate chapters.</p>
            <p>You can use it to download and split any kind of audio content from youtube. The original goal was to make life easier for me, a parent who has a daughter that finishes audiobooks at an unreasonable pace.</p>
            <p>You can use the output of this tool with a Yoto, or any similar device that plays mp3 files.</p>

            <div className={styles.disclaimer}>
              <p><strong>Note:</strong> this tool only generates commands that you can use locally on your device. It does not automatically download content from youtube for you, and does not run anything on your device.</p>
              <p>Make sure that you only use it with content that is legally available for you to download.</p>
            </div>
          </details>

          <hr />

          {/* REQUIREMENTS and INSTALLER section */}
          <details open={openSection === 'requirements'}>
            <summary onClick={(e) => { e.preventDefault(); toggleSection('requirements'); }}>
              <h2>requirements</h2>
            </summary>
            <div className={styles.sidebarSection}>
              <p>You need two command‑line tools:</p>
              <p><strong>1. yt-dlp</strong> — downloads the audio</p>
              <p><strong>2. ffmpeg</strong> — splits the chapters</p>

              <h3>Install via package manager</h3>

              <p>If you do not have a package manager yet, install WinGet for Windows, or homebrew for macOS.</p>

              <p><strong>windows</strong></p>
              <div className={styles.minimalCommands}>
                <p>winget</p>
                <pre>{WIN_WINGET}</pre>
                <div className={styles.minimalActions}>
                  <button onClick={() => copyLine(WIN_WINGET)}>copy winget</button>
                </div>
              </div>

              <p><strong>macOS</strong></p>
              <div className={styles.minimalCommands}>
                <p>homebrew</p>
                <pre>{MAC_BREW}</pre>
                <div className={styles.minimalActions}>
                  <button onClick={() => copyLine(MAC_BREW)}>copy brew</button>
                </div>
              </div>

              <h3>install manually</h3>

              <a href="https://github.com/yt-dlp/yt-dlp/wiki/Installation" target="_blank" rel="noopener noreferrer">→ yt-dlp installation guide</a>
              <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer">→ ffmpeg downloads</a>
              <div className={styles.disclaimer}>
              <p>finding the right ffmpeg package can be a bit tricky. for windows, download the latest release build directly from here: <a href="https://www.gyan.dev/ffmpeg/builds/#release-builds" target="_blank" rel="noopener noreferrer"><strong>ffmpeg-release-essentials.zip</strong></a></p>
              <p>for macOS, check the stable release here:<a href="https://evermeet.cx/ffmpeg/" target="_blank" rel="noopener noreferrer"><strong>ffmpeg-X.Y.Z.zip</strong></a></p>
              <p>X.Y.Z. is going to be a version number.</p>
              </div>
            </div>
          </details>

          <hr />

          {/* HOW TO USE section */}
          <details open={openSection === 'howto'}>
            <summary onClick={(e) => { e.preventDefault(); toggleSection('howto'); }}>
              <h2>how to use</h2>
            </summary>
            <div className={styles.sidebarSection}>

              <h3>steps</h3>

              <p><strong>1.</strong> Install the required packages.</p>
              <p><strong>2.</strong> Paste a youtube url (shorts not supported).</p>
              <p><strong>3.</strong> Paste timestamps (from youtube description/comments).</p>
              <p><strong>4.</strong> Click <em>generate</em> to create the commands.</p>
              <p><strong>5.</strong> Run the generated commands in a terminal.</p>
              <p><strong>6.</strong> Your mp3 tracks should be ready in the current folder.</p>

          {/* TIMESTAMP FORMAT section */}

            <div className={styles.disclaimer}>
              <h3>supported timestamp formats</h3>
              <p>• standard webvtt: 00:00:00 --&gt; 00:24:54</p>
              <p>• simple format: 0:00 chapter title</p>
              <p><a href="https://www.w3.org/TR/webvtt1/#introduction-chapters" target="_blank" rel="noopener noreferrer">
                See the webvtt specs for more info and examples.
              </a></p>
            </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
