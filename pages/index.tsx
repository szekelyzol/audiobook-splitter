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

  // Sample timestamp text for placeholder
  const sampleTimestamps = `WEBVTT

00:00:00 --> 00:24:54
Chapter 1: Introduction

00:24:54 --> 00:51:46
Chapter 2: Getting Started

00:51:46 --> 
Chapter 3: Advanced Topics`;

  const parseTimestamps = (input: string): Chapter[] => {
    if (!input.trim()) return [];
    
    const lines = input.split('\n').map(line => line.trim()).filter(line => line !== '');
    const chapters: Chapter[] = [];

    // Remove WEBVTT header if present
    let startIndex = 0;
    if (lines[0] && lines[0].toUpperCase() === 'WEBVTT') {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      // WebVTT format: 00:00:00 --> 00:24:54
      if (line.includes('-->')) {
        const [start, end = ''] = line.split('-->').map(part => part.trim());
        const title = lines[i + 1]?.trim() || `Chapter ${chapters.length + 1}`;
        
        chapters.push({
          start: normalizeTimestamp(start),
          end: normalizeTimestamp(end),
          title: sanitizeTitle(title)
        });
        i++; // Skip title line
      }
      // Simple format: Chapter 1 - 0:00 or 0:00 Title or Chapter 1: Title
      else if (line.match(/(\d+:[\d:]+)|(\d+\.\s)|(\d+:\s)|(Chapter\s+\d+)/i)) {
        const timeMatch = line.match(/(\d+:[\d:]+)/);
        let title = '';
        let start = '';
        
        if (timeMatch) {
          start = normalizeTimestamp(timeMatch[1]);
          title = line.replace(timeMatch[0], '').replace(/[-–—]/g, '').trim();
        } else {
          // Handle "Chapter 1: Title" without explicit time
          const chapterMatch = line.match(/Chapter\s+(\d+)/i);
          if (chapterMatch) {
            title = line;
            start = '00:00:00'; // Default start time, will be overridden
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

    // Fill in end times and handle edge cases
    for (let i = 0; i < chapters.length - 1; i++) {
      if (!chapters[i].end) {
        chapters[i].end = chapters[i + 1].start;
      }
    }

    // Handle last chapter - if it has no end time, it goes to the end
    if (chapters.length > 0 && !chapters[chapters.length - 1].end) {
      // Last chapter goes to END - we'll omit the -to parameter in ffmpeg
    }

    return chapters;
  };

  const normalizeTimestamp = (timestamp: string): string => {
    if (!timestamp) return '';
    
    // Clean up timestamp
    const cleaned = timestamp.replace(/\.\d+/, '').trim();
    const parts = cleaned.split(':');
    
    if (parts.length === 2) {
      // MM:SS format, add hours
      return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    }
    
    return cleaned;
  };

  const sanitizeTitle = (title: string): string => {
    if (!title || title.trim() === '') {
      return 'Untitled_Chapter';
    }
    
    let cleaned = title
      .replace(/^Chapter\s+\d+:?\s*/i, '') // Remove "Chapter X:" prefix
      .replace(/^\d+\.\s*/, '') // Remove "1. " prefix
      .trim(); // Remove leading/trailing whitespace
    
    // If after cleaning we have nothing or just numbers, use the original title
    if (!cleaned || /^\d+$/.test(cleaned)) {
      cleaned = title.trim();
    }
    
    return cleaned
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid filename chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .substring(0, 50) // Limit length
      || 'Untitled_Chapter';
  };

  const generateCommands = () => {
    const parsedChapters = parseTimestamps(timestampInput);
    
    if (parsedChapters.length === 0 || !sourceUrl) {
      return;
    }

    const commands = [];
    const ffmpegCmd = selectedOS === 'windows' ? '.\\ffmpeg' : 'ffmpeg';
    const ytDlpCmd = selectedOS === 'windows' ? '.\\yt-dlp' : 'yt-dlp';

    // Step 1: Download command
    commands.push('# Step 1: Download audio from source');
    commands.push(`${ytDlpCmd} -x --audio-format mp3 -o "audiobook.%(ext)s" "${sourceUrl}"`);
    commands.push('');

    // Step 2: Split commands
    commands.push('# Step 2: Split audio into chapters');
    commands.push('');

    parsedChapters.forEach((chapter, index) => {
      const paddedIndex = (index + 1).toString().padStart(2, '0');
      let cmd = `${ffmpegCmd} -i "audiobook.mp3" -ss ${chapter.start}`;
      
      // Only add -to if we have an end time (last chapter might not have one)
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
${generatedCommands
  .filter(cmd => cmd.includes('ffmpeg'))
  .join('\n')}

echo
echo "========================================"
echo "    Processing complete!"
echo "========================================"
echo "Your chapter files are ready!"`;
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
    <>
      <Head>
        <title>Audiobook Command Generator</title>
        <meta name="description" content="Generate CLI commands to split audiobooks" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>🎧 Audiobook Command Generator</h1>
          <p>Generate the exact CLI commands you need to split audiobooks into chapters</p>
        </div>
        
        {/* Legal Disclaimer */}
        <div className={styles.disclaimer}>
          <strong>⚠️ Important:</strong> This tool generates commands for your local use. 
          Ensure you have proper rights to download and process any content. 
          This tool does not download or process any files - it only generates commands.
        </div>

        {/* OS Selector */}
        <div className={styles.osSelector}>
          <h3>🖥️ Choose Your Operating System</h3>
          <div className={styles.osOptions}>
            <label className={styles.osOption}>
              <input
                type="radio"
                value="windows"
                checked={selectedOS === 'windows'}
                onChange={(e) => setSelectedOS(e.target.value as OSType)}
              />
              <span className={`${styles.osOptionText} ${selectedOS === 'windows' ? styles.selected : ''}`}>
                🪟 Windows (PowerShell/Command Prompt)
              </span>
            </label>
            <label className={styles.osOption}>
              <input
                type="radio"
                value="macos"
                checked={selectedOS === 'macos'}
                onChange={(e) => setSelectedOS(e.target.value as OSType)}
              />
              <span className={`${styles.osOptionText} ${selectedOS === 'macos' ? styles.selected : ''}`}>
                🍎 macOS/Linux (Terminal)
              </span>
            </label>
          </div>

          {/* Requirements Section */}
          <div className={styles.requirements}>
            <h4>📋 Required Tools:</h4>
            <div className={styles.requirementsList}>
              <div className={styles.requirementItem}>
                <strong>1. yt-dlp</strong> - Downloads audio from YouTube
                <br />
                <a 
                  href="https://github.com/yt-dlp/yt-dlp/releases" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.requirementLink}
                >
                  → Download from GitHub
                </a>
              </div>
              <div className={styles.requirementItem}>
                <strong>2. FFmpeg</strong> - Splits audio into chapters
                <br />
                <a 
                  href="https://ffmpeg.org/download.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={styles.requirementLink}
                >
                  → Download from Official Site
                </a>
              </div>
              {selectedOS === 'windows' && (
                <div className={styles.windowsNote}>
                  <strong>Windows Note:</strong> Place yt-dlp.exe and ffmpeg.exe in the same folder where you&apos;ll run the commands.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className={styles.mainForm}>
          
          {/* Source URL Input */}
          <div className={styles.section}>
            <h2>🔗 Source URL</h2>
            <div className={styles.inputGroup}>
              <label htmlFor="url" className={styles.label}>
                YouTube URL:
              </label>
              <input 
                id="url"
                type="url" 
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className={styles.input}
              />
            </div>

            {sourceUrl && (
              <div className={styles.successMessage}>
                <strong>✅ URL looks good!</strong> Ready for download.
              </div>
            )}
          </div>

          {/* Timestamp Input */}
          <div className={styles.section}>
            <h2>⏰ Chapter Timestamps</h2>
            <p>Paste your chapter timestamps. Supports multiple formats:</p>

            <div className={styles.inputGroup}>
              <label htmlFor="timestamps" className={styles.label}>
                Chapter Timestamps:
              </label>
              <textarea
                id="timestamps"
                value={timestampInput}
                onChange={(e) => setTimestampInput(e.target.value)}
                placeholder={sampleTimestamps}
                rows={8}
                className={styles.textarea}
              />
            </div>

            <div className={styles.infoBox}>
              <strong>💡 Supported formats:</strong>
              <ul>
                <li><strong>WebVTT:</strong> 00:00:00 --&gt; 00:24:54</li>
                <li><strong>Simple:</strong> Chapter 1 - 0:00</li>
                <li><strong>Basic:</strong> 0:00 Introduction</li>
                <li><strong>Numbered:</strong> 1. Introduction</li>
              </ul>
            </div>

            {parsedChapters.length > 0 && (
              <div className={styles.successMessage}>
                <strong>✅ Found {parsedChapters.length} {parsedChapters.length === 1 ? 'chapter' : 'chapters'}:</strong>
                <ul className={styles.chaptersList}>
                  {parsedChapters.slice(0, 3).map((chapter, index) => (
                    <li key={index}>
                      {chapter.start} → {chapter.end || 'END'}: {chapter.title}
                    </li>
                  ))}
                  {parsedChapters.length > 3 && (
                    <li>... and {parsedChapters.length - 3} more chapters</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Generate Commands Section */}
          <div className={styles.section}>
            <h2>🔧 Generate Commands</h2>
            
            {generatedCommands.length === 0 ? (
              <div className={styles.generateSection}>
                <button 
                  onClick={generateCommands}
                  disabled={!sourceUrl || parsedChapters.length === 0}
                  className={styles.generateButton}
                >
                  🚀 Generate {selectedOS === 'windows' ? 'Windows' : 'macOS/Linux'} Commands
                </button>
              </div>
            ) : (
              <div>
                <div className={styles.commandsContainer}>
                  <h3>📋 {selectedOS === 'windows' ? 'Windows' : 'macOS/Linux'} Commands:</h3>
                  <div className={styles.commandBlock}>
                    {generatedCommands.map((cmd, index) => (
                      <div 
                        key={index} 
                        className={`${styles.commandLine} ${cmd.startsWith('#') ? styles.commandComment : styles.commandRegular}`}
                      >
                        {cmd}
                      </div>
                    ))}
                  </div>
                  
                  <div className={styles.actionButtons}>
                    <button 
                      onClick={copyCommands}
                      className={`${styles.actionButton} ${styles.copyButton}`}
                    >
                      📋 Copy Commands
                    </button>
                    
                    <button 
                      onClick={downloadBatchFile}
                      className={`${styles.actionButton} ${styles.downloadButton}`}
                    >
                      💾 Download {selectedOS === 'windows' ? '.bat' : '.sh'} Script
                    </button>

                    <button 
                      onClick={() => setGeneratedCommands([])}
                      className={`${styles.actionButton} ${styles.resetButton}`}
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>

                {/* Usage Instructions */}
                <div className={styles.instructions}>
                  <h3>📚 How to Use:</h3>
                  <div className={styles.instructionSteps}>
                    <div className={styles.instructionStep}>
                      <h4>Step 1 - {selectedOS === 'windows' ? 'Windows' : 'macOS/Linux'}:</h4>
                      <p>
                        {selectedOS === 'windows' 
                          ? 'Open PowerShell or Command Prompt in the folder containing yt-dlp.exe and ffmpeg.exe'
                          : 'Open Terminal and navigate to your desired folder'
                        }
                      </p>
                    </div>
                    
                    <div className={styles.instructionStep}>
                      <h4>Step 2:</h4>
                      <p>
                        Run the commands above one by one, or download the script file and run it
                      </p>
                    </div>
                    
                    <div className={styles.instructionStep}>
                      <h4>Step 3:</h4>
                      <p>
                        Your chapter files will be created with names like: 01_Introduction.mp3, 02_Getting_Started.mp3, etc.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className={styles.footer}>
          <p>
            This tool generates CLI commands only - no files are processed on our servers.
          </p>
        </footer>
      </div>
    </>
  );
}