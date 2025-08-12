import { useState } from 'react';
import styles from '../styles/Home.module.css';

interface Chapter {
  start: string;
  end: string;
  title: string;
}

type OSType = 'windows' | 'macos';

export default function Home() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [timestampInput, setTimestampInput] = useState('');
  const [selectedOS, setSelectedOS] = useState<OSType>('windows');
  const [generatedCommands, setGeneratedCommands] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    const parsedChapters = parseTimestamps(timestampInput);
    
    if (!sourceUrl) {
      return;
    }

    const commands = [];
    const ytDlpCmd = selectedOS === 'windows' ? '.\\yt-dlp' : 'yt-dlp';

    // If no timestamps, just download the full audio
    if (parsedChapters.length === 0) {
      commands.push('# Download full audio as single file');
      commands.push(`${ytDlpCmd} -x --audio-format mp3 -o "audiobook.mp3" "${sourceUrl}"`);
      setGeneratedCommands(commands);
      return;
    }

    // Otherwise, download and split
    const ffmpegCmd = selectedOS === 'windows' ? '.\\ffmpeg' : 'ffmpeg';

    commands.push('# Step 1: Download audio from source');
    commands.push(`${ytDlpCmd} -x --audio-format mp3 -o "audiobook.%(ext)s" "${sourceUrl}"`);
    commands.push('');
    commands.push('# Step 2: Split audio into chapters');
    commands.push('');

    parsedChapters.forEach((chapter, index) => {
      const paddedIndex = (index + 1).toString().padStart(2, '0');
      let cmd = `${ffmpegCmd} -i "audiobook.mp3" -ss ${chapter.start}`;
      
      if (chapter.end) {
        cmd += ` -to ${chapter.end}`;
      }
      
      cmd += ` -c copy "${paddedIndex}_${chapter.title}.mp3"`;
      commands.push(cmd);
    });

    setGeneratedCommands(commands);
  };

  const downloadBatchFile = () => {
    const parsedChapters = parseTimestamps(timestampInput);
    
    let scriptContent = '';
    
    if (selectedOS === 'windows') {
      if (parsedChapters.length === 0) {
        // Single file download
        scriptContent = `@echo off
echo ========================================
echo     Audiobook Downloader
echo ========================================
echo.

echo Downloading audio as single file...
${generatedCommands.find(cmd => cmd.includes('yt-dlp')) || ''}

if %ERRORLEVEL% neq 0 (
    echo ERROR: Download failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo     Download complete!
echo ========================================
echo Your audiobook.mp3 is ready!
pause`;
      } else {
        // Multi-chapter split
        scriptContent = `@echo off
echo ========================================
echo     Audiobook Chapter Splitter
echo ========================================
echo.

echo [1/2] Downloading audio...
${generatedCommands.find(cmd => cmd.includes('yt-dlp')) || ''}

if %ERRORLEVEL% neq 0 (
    echo ERROR: Download failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Splitting into ${parsedChapters.length} chapters...
${generatedCommands
  .filter(cmd => cmd.includes('ffmpeg'))
  .join('\n')}

echo.
echo ========================================
echo     Processing complete!
echo ========================================
echo Your chapter files are ready!
pause`;
      }
    } else {
      if (parsedChapters.length === 0) {
        // Single file download
        scriptContent = `#!/bin/bash

echo "========================================"
echo "    Audiobook Downloader"
echo "========================================"
echo

echo "Downloading audio as single file..."
${generatedCommands.find(cmd => cmd.includes('yt-dlp')) || ''}

if [ $? -ne 0 ]; then
    echo "ERROR: Download failed!"
    exit 1
fi

echo
echo "========================================"
echo "    Download complete!"
echo "========================================"
echo "Your audiobook.mp3 is ready!"`;
      } else {
        // Multi-chapter split
        scriptContent = `#!/bin/bash

echo "========================================"
echo "    Audiobook Chapter Splitter"
echo "========================================"
echo

echo "[1/2] Downloading audio..."
${generatedCommands.find(cmd => cmd.includes('yt-dlp')) || ''}

if [ $? -ne 0 ]; then
    echo "ERROR: Download failed!"
    exit 1
fi

echo
echo "[2/2] Splitting into ${parsedChapters.length} chapters..."
${generatedCommands
  .filter(cmd => cmd.includes('ffmpeg'))
  .join('\n')}

echo
echo "========================================"
echo "    Processing complete!"
echo "========================================"
echo "Your chapter files are ready!"`;
      }
    }

    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedOS === 'windows' ? 'split-audiobook.bat' : 'split-audiobook.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const copyCommands = () => {
    navigator.clipboard.writeText(generatedCommands.join('\n'));
    alert('Commands copied to clipboard!');
  };

  const parsedChapters = parseTimestamps(timestampInput);

  return (
    <div className={styles.minimalContainer}>
      {/* Sidebar Toggle */}
      <button 
        className={styles.sidebarToggle}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        ☰
      </button>

      {/* Main View */}
      <div className={styles.mainView}>
        <h1 className={styles.minimalTitle}>audiobook splitter</h1>
        
        {/* Intro */}
        <div className={styles.introbox}>
          <p><strong>welcome!</strong> this tool helps you generate command line prompts to download and split audiofiles from youtube. for example, you can use it to download audiobooks and split the resulting file into multiple mp3 files, based on the chapter timestamps.</p>
          <p>the tool only generates commands that you can use locally after installing the required tools.</p>
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

        {/* Error/Success Messages */}
        {!sourceUrl && timestampInput && (
          <div className={styles.errorMessage}>⚠ missing youtube url</div>
        )}
        {sourceUrl && parsedChapters.length === 0 && timestampInput && (
          <div className={styles.errorMessage}>⚠ no valid timestamps found</div>
        )}
        {sourceUrl && !timestampInput.trim() && (
          <div className={styles.infoMessage}>ℹ no timestamps provided - will download as single mp3 file</div>
        )}
        {sourceUrl && parsedChapters.length > 0 && (
          <div className={styles.successMinimal}>✓ found {parsedChapters.length} chapters</div>
        )}

        <button 
          onClick={generateCommands}
          disabled={!sourceUrl}
          className={styles.minimalButton}
        >
          generate
        </button>

        {/* Generated Commands */}
        {generatedCommands.length > 0 && (
          <div className={styles.minimalCommands}>
            <pre>{generatedCommands.join('\n')}</pre>
            <div className={styles.minimalActions}>
              <button onClick={copyCommands}>copy</button>
              <button onClick={downloadBatchFile}>
                download .{selectedOS === 'windows' ? 'bat' : 'sh'}
              </button>
              <button onClick={() => setGeneratedCommands([])}>reset</button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarContent}>
          <h2>info</h2>
          
          {/* OS Selection */}
          <div className={styles.sidebarSection}>
            <h3>operating system</h3>
            <label>
              <input
                type="radio"
                value="windows"
                checked={selectedOS === 'windows'}
                onChange={(e) => setSelectedOS(e.target.value as OSType)}
              />
              windows
            </label>
            <label>
              <input
                type="radio"
                value="macos"
                checked={selectedOS === 'macos'}
                onChange={(e) => setSelectedOS(e.target.value as OSType)}
              />
              macos/linux
            </label>
          </div>

          {/* Requirements */}
          <div className={styles.sidebarSection}>
            <h3>required tools</h3>
            <p>1. yt-dlp - downloads audio</p>
            <a href="https://github.com/yt-dlp/yt-dlp/releases" target="_blank" rel="noopener noreferrer">
              → download yt-dlp
            </a>
            <p>2. ffmpeg - splits chapters</p>
            <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer">
              → download ffmpeg
            </a>
          </div>

          {/* Formats */}
          <div className={styles.sidebarSection}>
            <h3>supported timestamp formats</h3>
            <p>• standard webvtt: 00:00:00 → 00:24:54</p>
            <p>• simple format: 0:00 chapter title</p>
          </div>

          {/* Instructions */}
          <div className={styles.sidebarSection}>
            <h3>how to use</h3>
            <p>1. install required tools according to your OS. you should put both the yt-dlp and the ffmpeg executable files into the folder where you will run the commands at the end.</p>
            <p>2. paste youtube url</p>
            <p>3. write or paste timestamps. you can usually find these in the youtube video description or in the comment section.</p>
            <p>4. click on generate to create the commands. the tool also offers to download batch files that help you automate the commands on your device. it is not a virus, but feel free to ignore it and just copy the commands.</p>
            <p>5. run the resulting commands in a terminal, in the folder where both the yt-dlp and the ffmpeg executables are located.</p>
          </div>

          {/* Legal */}
          <div className={styles.disclaimer}>
            <strong>note:</strong> this tool only generates commands that you can use locally on your device. it does not download content from youtube, and does not run anything on your device. make sure that you use it with content that is legally available for you to download... okay?
          </div>
        </div>
      </div>
    </div>
  );
}