import { useState } from 'react';
import Head from 'next/head';

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
    return title
      .replace(/^Chapter\s+\d+:?\s*/i, '') // Remove "Chapter X:" prefix
      .replace(/^\d+\.\s*/, '') // Remove "1. " prefix
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

  const downloadCommands = () => {
    const content = generatedCommands.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedOS === 'windows' ? 'audiobook-commands.bat' : 'audiobook-commands.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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

      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        <h1>🎧 Audiobook Command Generator</h1>
        <p>Generate the exact CLI commands you need to split audiobooks into chapters</p>
        
        {/* Legal Disclaimer */}
        <div style={{ 
          background: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '8px', 
          padding: '15px', 
          marginBottom: '30px', 
          fontSize: '14px', 
          color: '#856404' 
        }}>
          <strong>⚠️ Important:</strong> This tool generates commands for your local use. 
          Ensure you have proper rights to download and process any content. 
          This tool does not download or process any files - it only generates commands.
        </div>

        {/* OS Selector */}
        <div style={{
          background: '#e3f2fd',
          border: '1px solid #bbdefb',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <h3 style={{ marginTop: 0, color: '#1565c0' }}>🖥️ Choose Your Operating System</h3>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                value="windows"
                checked={selectedOS === 'windows'}
                onChange={(e) => setSelectedOS(e.target.value as OSType)}
              />
              <span style={{ fontWeight: selectedOS === 'windows' ? 'bold' : 'normal' }}>
                🪟 Windows (PowerShell/Command Prompt)
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                value="macos"
                checked={selectedOS === 'macos'}
                onChange={(e) => setSelectedOS(e.target.value as OSType)}
              />
              <span style={{ fontWeight: selectedOS === 'macos' ? 'bold' : 'normal' }}>
                🍎 macOS/Linux (Terminal)
              </span>
            </label>
          </div>

          {/* Requirements Section */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            padding: '15px'
          }}>
            <h4 style={{ marginTop: 0, color: '#333' }}>📋 Required Tools:</h4>
            <div style={{ display: 'grid', gap: '10px' }}>
              <div>
                <strong>1. yt-dlp</strong> - Downloads audio from YouTube
                <br />
                <a 
                  href="https://github.com/yt-dlp/yt-dlp/releases" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#007bff', fontSize: '14px' }}
                >
                  → Download from GitHub
                </a>
              </div>
              <div>
                <strong>2. FFmpeg</strong> - Splits audio into chapters
                <br />
                <a 
                  href="https://ffmpeg.org/download.html" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#007bff', fontSize: '14px' }}
                >
                  → Download from Official Site
                </a>
              </div>
              {selectedOS === 'windows' && (
                <div style={{ 
                  background: '#fff3cd', 
                  padding: '10px', 
                  borderRadius: '4px', 
                  fontSize: '14px',
                  color: '#856404'
                }}>
                  <strong>Windows Note:</strong> Place yt-dlp.exe and ffmpeg.exe in the same folder where you&apos;ll run the commands.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Form - Single Page */}
        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '30px', marginBottom: '30px' }}>
          
          {/* Source URL Input */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ marginTop: 0 }}>🔗 Source URL</h2>
            <div style={{ margin: '20px 0' }}>
              <label htmlFor="url" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                YouTube URL:
              </label>
              <input 
                id="url"
                type="url" 
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            {sourceUrl && (
              <div style={{ 
                background: '#d4edda', 
                border: '1px solid #c3e6cb',
                borderRadius: '8px', 
                padding: '15px',
                marginTop: '15px'
              }}>
                <strong>✅ URL looks good!</strong> Ready for download.
              </div>
            )}
          </div>

          {/* Timestamp Input */}
          <div style={{ marginBottom: '30px' }}>
            <h2>⏰ Chapter Timestamps</h2>
            <p>Paste your chapter timestamps. Supports multiple formats:</p>

            <div style={{ margin: '20px 0' }}>
              <label htmlFor="timestamps" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Chapter Timestamps:
              </label>
              <textarea
                id="timestamps"
                value={timestampInput}
                onChange={(e) => setTimestampInput(e.target.value)}
                placeholder={sampleTimestamps}
                rows={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #e1e5e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'Monaco, Menlo, monospace'
                }}
              />
            </div>

            <div style={{
              background: '#e3f2fd',
              border: '1px solid #bbdefb',
              borderRadius: '6px',
              padding: '15px',
              fontSize: '14px'
            }}>
              <strong>💡 Supported formats:</strong>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li><strong>WebVTT:</strong> 00:00:00 --&gt; 00:24:54</li>
                <li><strong>Simple:</strong> Chapter 1 - 0:00</li>
                <li><strong>Basic:</strong> 0:00 Introduction</li>
                <li><strong>Numbered:</strong> 1. Introduction</li>
              </ul>
            </div>

            {parsedChapters.length > 0 && (
              <div style={{
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '8px',
                padding: '15px',
                marginTop: '15px'
              }}>
                <strong>✅ Found {parsedChapters.length} chapters:</strong>
                <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
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
          <div>
            <h2>🔧 Generate Commands</h2>
            
            {generatedCommands.length === 0 ? (
              <div style={{ textAlign: 'center', margin: '30px 0' }}>
                <button 
                  onClick={generateCommands}
                  disabled={!sourceUrl || parsedChapters.length === 0}
                  style={{
                    background: (!sourceUrl || parsedChapters.length === 0) ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: (!sourceUrl || parsedChapters.length === 0) ? 'not-allowed' : 'pointer'
                  }}
                >
                  🚀 Generate {selectedOS === 'windows' ? 'Windows' : 'macOS/Linux'} Commands
                </button>
              </div>
            ) : (
              <div>
                <div style={{
                  background: '#ffffff',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '20px',
                  margin: '20px 0'
                }}>
                  <h3 style={{ marginTop: 0 }}>📋 {selectedOS === 'windows' ? 'Windows' : 'macOS/Linux'} Commands:</h3>
                  <div style={{
                    background: '#1a1a1a',
                    color: '#f8f8f2',
                    padding: '20px',
                    borderRadius: '8px',
                    fontFamily: 'Monaco, Menlo, monospace',
                    fontSize: '13px',
                    overflowX: 'auto',
                    margin: '15px 0',
                    maxHeight: '400px',
                    overflowY: 'auto'
                  }}>
                    {generatedCommands.map((cmd, index) => (
                      <div 
                        key={index} 
                        style={{
                          color: cmd.startsWith('#') ? '#6272a4' : '#f8f8f2',
                          fontStyle: cmd.startsWith('#') ? 'italic' : 'normal',
                          margin: '4px 0'
                        }}
                      >
                        {cmd}
                      </div>
                    ))}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '20px' }}>
                    <button 
                      onClick={copyCommands}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      📋 Copy Commands
                    </button>
                    
                    <button 
                      onClick={downloadBatchFile}
                      style={{
                        background: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      💾 Download {selectedOS === 'windows' ? '.bat' : '.sh'} Script
                    </button>

                    <button 
                      onClick={() => {
                        setGeneratedCommands([]);
                      }}
                      style={{
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      🔄 Reset
                    </button>
                  </div>
                </div>

                {/* Usage Instructions */}
                <div style={{
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '20px',
                  marginTop: '20px'
                }}>
                  <h3 style={{ marginTop: 0 }}>📚 How to Use:</h3>
                  <div style={{ display: 'grid', gap: '15px' }}>
                    <div style={{
                      background: '#ffffff',
                      padding: '15px',
                      borderRadius: '6px',
                      borderLeft: '4px solid #007bff'
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>
                        Step 1 - {selectedOS === 'windows' ? 'Windows' : 'macOS/Linux'}:
                      </h4>
                      <p style={{ margin: 0 }}>
                        {selectedOS === 'windows' 
                          ? 'Open PowerShell or Command Prompt in the folder containing yt-dlp.exe and ffmpeg.exe'
                          : 'Open Terminal and navigate to your desired folder'
                        }
                      </p>
                    </div>
                    
                    <div style={{
                      background: '#ffffff',
                      padding: '15px',
                      borderRadius: '6px',
                      borderLeft: '4px solid #007bff'
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Step 2:</h4>
                      <p style={{ margin: 0 }}>
                        Run the commands above one by one, or download the script file and run it
                      </p>
                    </div>
                    
                    <div style={{
                      background: '#ffffff',
                      padding: '15px',
                      borderRadius: '6px',
                      borderLeft: '4px solid #007bff'
                    }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Step 3:</h4>
                      <p style={{ margin: 0 }}>
                        Your chapter files will be created with names like: 01_Introduction.mp3, 02_Getting_Started.mp3, etc.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer style={{
          textAlign: 'center',
          padding: '20px 0',
          color: '#666',
          borderTop: '1px solid #e1e5e9',
          marginTop: '40px'
        }}>
          <p style={{ margin: 0 }}>
            This tool generates CLI commands only - no files are processed on our servers.
          </p>
        </footer>
      </div>
    </>
  );
}