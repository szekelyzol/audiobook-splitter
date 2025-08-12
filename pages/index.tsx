import { useState } from 'react';
import Head from 'next/head';
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
  const [error, setError] = useState('');

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
    setError('');
    const parsedChapters = parseTimestamps(timestampInput);
    
    if (!sourceUrl) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    if (parsedChapters.length === 0) {
      setError('Please enter valid timestamps');
      return;
    }

    const commands = [];
    const ffmpegCmd = selectedOS === 'windows' ? '.\\ffmpeg' : 'ffmpeg';
    const ytDlpCmd = selectedOS === 'windows' ? '.\\yt-dlp' : 'yt-dlp';

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

  const copyCommands = () => {
    navigator.clipboard.writeText(generatedCommands.join('\n'));
    alert('Commands copied to clipboard!');
  };

  const downloadBatchFile = () => {
    const parsedChapters = parseTimestamps(timestampInput);
    
    let scriptContent = '';
    
    if (selectedOS === 'windows') {
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
${generatedCommands.filter(cmd => cmd.includes('ffmpeg')).join('\n')}

echo.
echo ========================================
echo     Processing complete!
echo ========================================
pause`;
    } else {
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
${generatedCommands.filter(cmd => cmd.includes('ffmpeg')).join('\n')}

echo
echo "========================================"
echo "    Processing complete!"
echo "========================================"`;
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

  const parsedChapters = parseTimestamps(timestampInput);

  return (
    <>
      <Head>
        <title>Audiobook Splitter</title>
        <meta name="description" content="Generate commands to split audiobooks" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.minimalContainer}>
        <button 
          className={styles.sidebarToggle}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? '✕' : 'ℹ'}
        </button>

        <div className={styles.mainView}>
          <h1 className={styles.minimalTitle}>audiobook splitter</h1>
          
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
            rows={6}
            className={styles.minimalTextarea}
          />

          {error && (
            <div className={styles.errorMessage}>{error}</div>
          )}

          {parsedChapters.length > 0 && !error && (
            <div className={styles.successMinimal}>
              ✓ {parsedChapters.length} chapters detected
            </div>
          )}

          <button 
            onClick={generateCommands}
            className={styles.minimalButton}
          >
            generate
          </button>

          {generatedCommands.length > 0 && (
            <div className={styles.minimalCommands}>
              <pre>{generatedCommands.join('\n')}</pre>
              <div className={styles.minimalActions}>
                <button onClick={copyCommands}>copy</button>
                <button onClick={downloadBatchFile}>download script</button>
              </div>
            </div>
          )}
        </div>

        <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarContent}>
            <h2>Info</h2>
            
            <div className={styles.sidebarSection}>
              <h3>Operating System</h3>
              <label>
                <input
                  type="radio"
                  value="windows"
                  checked={selectedOS === 'windows'}
                  onChange={(e) => setSelectedOS(e.target.value as OSType)}
                />
                Windows
              </label>
              <label>
                <input
                  type="radio"
                  value="macos"
                  checked={selectedOS === 'macos'}
                  onChange={(e) => setSelectedOS(e.target.value as OSType)}
                />
                macOS/Linux
              </label>
            </div>

            <div className={styles.sidebarSection}>
              <h3>Required Tools</h3>
              <p><strong>yt-dlp:</strong> Downloads audio</p>
              <a href="https://github.com/yt-dlp/yt-dlp/releases" target="_blank" rel="noopener noreferrer">
                → Download yt-dlp
              </a>
              <p><strong>FFmpeg:</strong> Splits chapters</p>
              <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer">
                → Download FFmpeg
              </a>
            </div>

            <div className={styles.sidebarSection}>
              <h3>Supported Formats</h3>
              <ul>
                <li>WebVTT: 00:00:00 --&gt; 00:24:54</li>
                <li>Simple: 0:00 Introduction</li>
                <li>Numbered: 1. Introduction</li>
              </ul>
            </div>

            <div className={styles.sidebarSection}>
              <h3>How to Use</h3>
              <ol>
                <li>Install yt-dlp and FFmpeg</li>
                <li>Enter YouTube URL</li>
                <li>Paste timestamps</li>
                <li>Generate commands</li>
                <li>Run in terminal</li>
              </ol>
            </div>

            <div className={styles.sidebarSection}>
              <p className={styles.disclaimer}>
                This tool generates commands for local use only. Ensure you have proper rights to download content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}