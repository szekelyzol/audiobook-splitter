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

  // Accordion: check which sidebar section is open
  const [openSection, setOpenSection] = useState<'info' | 'requirements' | 'howto' | null>(null);
  const toggleSection = (key: 'info' | 'requirements' | 'howto') => {
    setOpenSection(prev => (prev === key ? null : key));
  };

  // Validate youtube URL
  const isValidYouTubeUrl = (raw: string): boolean => {
  const url = raw.trim();
  const re = /^(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/watch\?v=[\w-]+|youtu\.be\/[\w-]+|youtube\.com\/embed\/[\w-]+|youtube-nocookie\.com\/embed\/[\w-]+|youtube\.com\/v\/[\w-]+)$/i;
  return re.test(url);
  };

  const normalizeYouTubeUrl = (raw: string): string => {
  const url = raw.trim();
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
  };

  // Parse and validate timestamps. This includes WEBVTT and simple timestamp formats, and some pretty robust edge case validation.
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

        // Peek at next line; if it's another cue or blank, treat as untitled.
        const next = (lines[i + 1] ?? '').trim();
        const isNextCue = next.includes('-->');
        const hasTitle = next.length > 0 && !isNextCue;

        const titleCandidate = hasTitle ? next : '';

        chapters.push({
          start: normalizeTimestamp(start),
          end: normalizeTimestamp(end),
          title: sanitizeTitle(titleCandidate),
        });

        // Only skip the next line if it was a real title.
        if (hasTitle) i++;
      }
      else if (line.match(/(\d+:[\d:]+)|(\d+\.\s)|(\d+:\s)|(Chapter\s+\d+)/i)) {
        const timeMatch = line.match(/(\d+:[\d:]+)/);
        let title = '';
        let start = '';

        if (timeMatch) {
          start = normalizeTimestamp(timeMatch[1]);
        
          // Where is the time token in the line?
          const timeIdx = line.lastIndexOf(timeMatch[0]);
        
          // Text around the time
          const beforeRaw = line.slice(0, timeIdx);
          const afterRaw  = line.slice(timeIdx + timeMatch[0].length);
        
          // Clean both sides
          const beforeClean = beforeRaw
            .replace(/^\s*\d+\s*([.)-]\s*|\s+-\s*)/, '') // strip list bullets like "1. " / "2) " only from BEFORE side
            .replace(/[-–—]\s*$/,'')                     // trailing dash separators
            .trim();
        
          const afterClean = afterRaw
            .replace(/^[-–—]\s*/, '')                    // leading dash separators
            .trim();
        
          // Prefer title after the time; if empty, fall back to beforeTime
          title = afterClean || beforeClean;
        } else {
          const chapterMatch = line.match(/Chapter\s+(\d+)/i);
          if (chapterMatch) {
            title = line;
            start = '00:00:00';
          }
        }

        // NOTE: push even if title is empty; sanitizeTitle('') -> 'Untitled'
         if (start) {
          chapters.push({
            start,
            end: '',
            title: sanitizeTitle(title)
          });
        }
      }
    }

    // Fill missing end times with next chapter's start.
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
    if (!title || title.trim() === '') return 'Untitled';

    // 1) Keep the word "chapter" intact in chapter titles, do not strip it.
    // 2) Still strip simple numbered bullets like "1. " at the start.
    let cleaned = title
    // Remove leading "1. ", "12. ", "3) ", "4 - " patterns.
    .replace(/^\s*\d+\s*([.)-]\s*|\s+-\s*)/, '')
    .trim();

    // If stripping made it empty or just digits, fall back to the original full title
    if (!cleaned || /^\d+$/.test(cleaned)) cleaned = title.trim();

    // Final filesystem-safe normalization
    return cleaned
    .replace(/[<>:"/\\|?*]/g, '_')     // illegal filename chars
    .replace(/\s+/g, '_')              // spaces -> underscores
    .replace(/_{2,}/g, '_')            // collapse multiple underscores
    .replace(/^_|_$/g, '')             // trim leading/trailing underscores
    .substring(0, 50) || 'Untitled';
  };


    const generateCommands = () => {
      const url = normalizeYouTubeUrl(sourceUrl);
      if (!sourceUrl) return;
    
      const commands: string[] = [];

    // If no timestamps are added, just download the full audio.
    if (parsedChapters.length === 0) {
      commands.push('# Download full audio as single file');
      commands.push(`yt-dlp -x --audio-format mp3 -o "audio.mp3" "${url}"`);

      setGeneratedCommands(commands);
      return;
    }

    // Generate commands
    commands.push('# Step 1: Download audio from source');
    commands.push(`yt-dlp -x --audio-format mp3 -o "audio.%(ext)s" "${url}"`);
    commands.push('');
    commands.push('# Step 2: Split audio into chapters');
    commands.push('');

    parsedChapters.forEach((chapter, index) => {
      const paddedIndex = (index + 1).toString().padStart(2, '0');
      let cmd = `ffmpeg -i "audio.mp3" -ss ${chapter.start}`;
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
  const WIN_WINGET = 'const WIN_WINGET = `winget install -e --id yt-dlp.yt-dlp\nwinget install -e --id FFmpeg.FFmpeg`;';

  const MAC_BREW  = 'brew install yt-dlp ffmpeg';
  
  // Trim timestamps
  const hasTimestamps = timestampInput.trim().length > 0;

  // Compute once per render for UI messages
  const parsedChapters = parseTimestamps(timestampInput);

  return (
    <div className={styles.minimalContainer}>
      {/* Main section */}
      <div className={styles.mainView}>
        <h1 className={styles.minimalTitle}>audiobook splitter</h1>

        {/* INTRO section */}
        <div className={styles.introbox}>
          <p><strong>Welcome!</strong></p>
          <p>This tool helps you download audio from youtube and split the resulting file into individual tracks, based on the timestamps.</p>
          <p>It requires minimal setup to work. Check the sidebar for more details!</p>
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
        {sourceUrl && isValidYouTubeUrl(sourceUrl) && hasTimestamps && parsedChapters.length === 0 && (
          <div className={styles.infoMessage}>✓ youtube url looks good — no valid timestamps found, so this will download as a single mp3 file</div>
        )}
        {sourceUrl && isValidYouTubeUrl(sourceUrl) && !hasTimestamps && (
          <div className={styles.infoMessage}>✓ youtube url looks good, but no timestamps provided — this will download as a single mp3 file</div>
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
            <p>This tool is a simple proof of concept. I created it to download audiobooks from youtube and split them into separate chapters.</p>
            <p>You can use it to download and split any kind of audio content from youtube. The original goal was to make life easier for me, a parent, whose daughter finishes audiobooks at an unreasonable pace.</p>
            <p>You can use the output of this tool with a Yoto, or any device that can play mp3 files.</p>

            <div className={styles.disclaimer}>
              <p><strong>Note:</strong> this tool only generates commands that you can use locally on your device. It does not automatically download content from youtube for you, and does not run anything on your device.</p>
              <p>Make sure that you only use it with content that is legally available for you to download.</p>
            </div>
          </details>

          <hr />
            
          <br />

          {/* REQUIREMENTS and INSTALLER section */}
          <details open={openSection === 'requirements'}>

            <summary onClick={(e) => { e.preventDefault(); toggleSection('requirements'); }}>
              <h2>requirements</h2>
            </summary>
            <div className={styles.sidebarSection}>
              <p>You need two command‑line tools:</p>
              <p><strong>1. yt-dlp</strong> — downloads the audio</p>
              <p><strong>2. ffmpeg</strong> — splits the chapters</p>
              <p>Both are free and open-source.</p>

              <h3>Install via package manager</h3>

              <p>If you do not have a package manager yet, install WinGet for Windows, or homebrew for macOS.</p>

              <div className={styles.minimalCommands}>
                <p>Windows - WinGet</p>
                <pre>{WIN_WINGET}</pre>
                <div className={styles.minimalActions}>
                  <button onClick={() => copyLine(WIN_WINGET)}>copy winget commands</button>
                </div>
              </div>

              <div className={styles.minimalCommands}>
                <p>macOS - homebrew</p>
                <pre>{MAC_BREW}</pre>
                <div className={styles.minimalActions}>
                  <button onClick={() => copyLine(MAC_BREW)}>copy brew commands</button>
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
            
          <br />

          {/* HOW TO USE section */}
          <details open={openSection === 'howto'}>
            <summary onClick={(e) => { e.preventDefault(); toggleSection('howto'); }}>
              <h2>how to use</h2>
            </summary>
            <div className={styles.sidebarSection}>

              <h3>steps</h3>

              <p><strong>1.</strong> Install the required tools.</p>
              <p><strong>2.</strong> Paste a youtube url (shorts not supported).</p>
              <p><strong>3.</strong> Paste timestamps (from youtube description/comments).</p>
              <p><strong>4.</strong> Click <em>generate</em> to create the commands.</p>
              <p><strong>5.</strong> Run the generated commands in a terminal.</p>
              <p><strong>6.</strong> Your mp3 tracks should be ready in the current folder.</p>

              {/* TIMESTAMP FORMAT section */}

              <br />

              <h3>notes about timestamps</h3>
              
                <p>This tool supports some common timestamp formats.</p>
                <p><strong>Standard WEBVTT:</strong></p>
                
                <div className={styles.minimalCommands}>
                  <pre>
                    <p>WEBVTT</p>
                    <p>00:00:00 --&gt; 00:04:35</p>
                    <p>Title 1</p>
                    <p>00:04:35 --&gt; 00:09:21</p>
                    <p>Title 2</p>
                    <p>00:09:21 --&gt; 00:12:08</p>
                    <p>Title 3</p>
                  </pre>
                    <p><a href="https://www.w3.org/TR/webvtt1/#introduction-chapters" target="_blank" rel="noopener noreferrer">
                      See the WEBVTT specs for more info and examples.
                    </a></p>
                </div>

                <p><strong>Simple format, with start times only:</strong></p>
                
                <div className={styles.minimalCommands}>
                  <pre>
                    <p>00:00 Title 1</p>
                    <p>04:35 Title 2</p>
                    <p>09:21 Title 3</p>
                  </pre>
                </div>

                <p><strong>Inverse simple format, with start times only:</strong></p>
                
                <div className={styles.minimalCommands}>
                  <pre>
                    <p>Title 1 00:00</p>
                    <p>Title 2 04:35</p>
                    <p>Title 3 09:21</p>
                  </pre>
                </div>

                <div className={styles.disclaimer}>
                  <p>Timestamps are important, so make sure you get them right. The tool validates your input to help you avoid some common issues:</p>
                  <ul>
                   <li>Missing chapter names or titles will automatically create <em>Untitled</em> files.</li>
                   <li>Leading numbers and patterns like &quot;1. &quot;, &quot;2: &quot;, &quot;3 - &quot; are removed.</li>
                   <li>Illegal filename characters, spaces, underscores, etc. are trimmed.</li>
                  </ul>
                  <p>If your filenames or audio lengths look weird, check your input and the generated commands for incorrect timestamps.</p>
                </div>

            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
