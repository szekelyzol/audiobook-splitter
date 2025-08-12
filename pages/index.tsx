import { useState } from 'react';
import Head from 'next/head';

interface Chapter {
  start: string;
  end: string;
  title: string;
}

interface ParseResult {
  chapters: Chapter[];
  errors: string[];
  warnings: string[];
}

type OSType = 'windows' | 'macos';

export default function Home() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [timestampInput, setTimestampInput] = useState('');
  const [selectedOS, setSelectedOS] = useState<OSType>('windows');
  const [generatedCommands, setGeneratedCommands] = useState<string[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult>({ chapters: [], errors: [], warnings: [] });
  const [showSetupCommands, setShowSetupCommands] = useState(false);

  // Sample timestamp text for placeholder
  const sampleTimestamps = `WEBVTT

00:00:00 --> 00:24:54
Chapter 1: Introduction

00:24:54 --> 00:51:46
Chapter 2: Getting Started

00:51:46 --> 
Chapter 3: Advanced Topics`;

  // Setup command templates
  const windowsSetupCommands = `# Windows PowerShell Setup Commands (Run as Administrator)
# Create tools directory
$toolsDir = "$env:USERPROFILE\\AudiobookTools"
New-Item -ItemType Directory -Force -Path $toolsDir
Set-Location $toolsDir

# Download yt-dlp
Write-Host "Downloading yt-dlp..." -ForegroundColor Green
Invoke-WebRequest -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -OutFile "yt-dlp.exe"

# Download FFmpeg
Write-Host "Downloading FFmpeg..." -ForegroundColor Green
Invoke-WebRequest -Uri "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -OutFile "ffmpeg.zip"
Expand-Archive -Path "ffmpeg.zip" -DestinationPath "." -Force
Move-Item "ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe" .
Remove-Item "ffmpeg.zip", "ffmpeg-master-latest-win64-gpl" -Recurse -Force

Write-Host "Setup complete! Tools are ready in: $toolsDir" -ForegroundColor Green
Write-Host "Test with: .\\yt-dlp --version and .\\ffmpeg -version" -ForegroundColor Yellow`;

  const macosSetupCommands = `# macOS/Linux Terminal Setup Commands
# Create tools directory
TOOLS_DIR="$HOME/AudiobookTools"
mkdir -p "$TOOLS_DIR"
cd "$TOOLS_DIR"

# Download yt-dlp
echo "Downloading yt-dlp..."
curl -L -o yt-dlp "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"
chmod +x yt-dlp

# Check if FFmpeg is already installed
if command -v ffmpeg >/dev/null 2>&1; then
    echo "FFmpeg is already installed system-wide"
    ln -sf "$(which ffmpeg)" ./ffmpeg
else
    echo "Downloading FFmpeg..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        curl -L -o ffmpeg.zip "https://evermeet.cx/ffmpeg/ffmpeg-6.0.zip"
        unzip -q ffmpeg.zip && rm ffmpeg.zip
    else
        # Linux
        curl -L -o ffmpeg.tar.xz "https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
        tar -xf ffmpeg.tar.xz --strip-components=1 && rm ffmpeg.tar.xz
    fi
    chmod +x ffmpeg
fi

echo "Setup complete! Tools are ready in: $TOOLS_DIR"
echo "Test with: ./yt-dlp --version and ./ffmpeg -version"`;

  const isValidTimestamp = (timestamp: string): boolean => {
    if (!timestamp) return false;
    
    // Valid formats: HH:MM:SS, MM:SS, H:MM:SS, M:SS
    const timeRegex = /^(\d{1,2}):([0-5]\d):([0-5]\d)$|^(\d{1,2}):([0-5]\d)$/;
    return timeRegex.test(timestamp.trim());
  };

  const normalizeTimestamp = (timestamp: string): string => {
    if (!timestamp) return '';
    
    // Clean up timestamp
    const cleaned = timestamp.replace(/\.\d+/, '').trim();
    const parts = cleaned.split(':');
    
    if (parts.length === 2) {
      // MM:SS format, add hours
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);
      
      // Validate ranges
      if (minutes < 0 || seconds < 0 || seconds >= 60) {
        return cleaned; // Return as-is for error reporting
      }
      
      return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const hours = parseInt(parts[0]);
      const minutes = parseInt(parts[1]);
      const seconds = parseInt(parts[2]);
      
      // Validate ranges
      if (hours < 0 || minutes < 0 || seconds < 0 || minutes >= 60 || seconds >= 60) {
        return cleaned; // Return as-is for error reporting
      }
      
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

  const parseTimestampsWithValidation = (input: string): ParseResult => {
    if (!input.trim()) {
      return { chapters: [], errors: ['No input provided'], warnings: [] };
    }
    
    const lines = input.split('\n').map(line => line.trim()).filter(line => line !== '');
    const chapters: Chapter[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for WEBVTT header
    let startIndex = 0;
    if (lines[0] && lines[0].toUpperCase() === 'WEBVTT') {
      startIndex = 1;
    } else {
      warnings.push('Missing WEBVTT header - assuming informal timestamp format');
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // WebVTT format: 00:00:00 --> 00:24:54
      if (line.includes('-->')) {
        const [start, end = ''] = line.split('-->').map(part => part.trim());
        
        // Validate start timestamp
        if (!start) {
          errors.push(`Line ${lineNumber}: Missing start timestamp`);
          continue;
        }
        
        const normalizedStart = normalizeTimestamp(start);
        if (!isValidTimestamp(normalizedStart)) {
          errors.push(`Line ${lineNumber}: Invalid start timestamp format "${start}"`);
          continue;
        }
        
        // Validate end timestamp (if provided)
        let normalizedEnd = '';
        if (end && end.toUpperCase() !== 'END') {
          normalizedEnd = normalizeTimestamp(end);
          if (!isValidTimestamp(normalizedEnd)) {
            errors.push(`Line ${lineNumber}: Invalid end timestamp format "${end}"`);
            continue;
          }
          
          // Check if end time is after start time
          if (normalizedEnd && normalizedStart >= normalizedEnd) {
            warnings.push(`Line ${lineNumber}: End time (${end}) should be after start time (${start})`);
          }
        }
        
        // Get title from next line
        const title = lines[i + 1]?.trim() || `Chapter ${chapters.length + 1}`;
        if (!lines[i + 1]?.trim()) {
          warnings.push(`Line ${lineNumber + 1}: Missing chapter title, using default`);
        }
        
        chapters.push({
          start: normalizedStart,
          end: normalizedEnd,
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
          if (!isValidTimestamp(start)) {
            errors.push(`Line ${lineNumber}: Invalid timestamp format "${timeMatch[1]}"`);
            continue;
          }
          title = line.replace(timeMatch[0], '').replace(/[-–—]/g, '').trim();
        } else {
          // Handle "Chapter 1: Title" without explicit time
          const chapterMatch = line.match(/Chapter\s+(\d+)/i);
          if (chapterMatch) {
            title = line;
            start = '00:00:00'; // Default start time
            warnings.push(`Line ${lineNumber}: No timestamp found, using default start time`);
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
      // Unrecognized format
      else if (line.length > 0) {
        warnings.push(`Line ${lineNumber}: Unrecognized format "${line.substring(0, 30)}${line.length > 30 ? '...' : ''}"`);
      }
    }

    // Fill in end times and validate chapter sequence
    for (let i = 0; i < chapters.length - 1; i++) {
      if (!chapters[i].end) {
        chapters[i].end = chapters[i + 1].start;
      }
      
      // Check for overlapping chapters
      if (chapters[i].end && chapters[i + 1].start < chapters[i].end) {
        warnings.push(`Chapters ${i + 1} and ${i + 2}: Overlapping time ranges`);
      }
    }

    // Check for duplicate chapter names
    const titleCounts = new Map<string, number>();
    chapters.forEach((chapter, index) => {
      const count = titleCounts.get(chapter.title) || 0;
      titleCounts.set(chapter.title, count + 1);
      if (count > 0) {
        warnings.push(`Chapter ${index + 1}: Duplicate title "${chapter.title}"`);
      }
    });

    // Final validation
    if (chapters.length === 0 && errors.length === 0) {
      errors.push('No valid chapters found in input');
    }

    return { chapters, errors, warnings };
  };

  const handleTimestampChange = (value: string) => {
    setTimestampInput(value);
    const result = parseTimestampsWithValidation(value);
    setParseResult(result);
  };

  const generateCommands = () => {
    const { chapters: parsedChapters } = parseResult;
    
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
    const { chapters: parsedChapters } = parseResult;
    
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
          <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
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

          {/* Requirements Section with Copy-Paste Setup */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            padding: '15px'
          }}>
            <h4 style={{ marginTop: 0, color: '#333' }}>📋 Required Tools Setup:</h4>
            
            {/* Easy Setup Toggle */}
            <div style={{
              background: '#e8f5e8',
              border: '1px solid #c3e6cb',
              borderRadius: '6px',
              padding: '15px',
              marginBottom: '15px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                <h5 style={{ margin: 0, color: '#155724' }}>🚀 Easy Setup Commands</h5>
                <button
                  onClick={() => setShowSetupCommands(!showSetupCommands)}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {showSetupCommands ? '🔼 Hide' : '🔽 Show'} Setup Commands
                </button>
              </div>
              
              {showSetupCommands && (
                <div>
                  <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#155724' }}>
                    Copy and paste these commands in your {selectedOS === 'windows' ? 'PowerShell' : 'Terminal'} to automatically install both tools:
                  </p>
                  
                  <div style={{
                    background: '#1a1a1a',
                    color: '#f8f8f2',
                    padding: '15px',
                    borderRadius: '6px',
                    fontFamily: 'Monaco, Menlo, monospace',
                    fontSize: '13px',
                    overflowX: 'auto',
                    position: 'relative'
                  }}>
                    <button
                      onClick={() => {
                        const commands = selectedOS === 'windows' ? windowsSetupCommands : macosSetupCommands;
                        navigator.clipboard.writeText(commands);
                        alert('Setup commands copied to clipboard!');
                      }}
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      📋 Copy
                    </button>
                    
                    <div style={{ marginTop: '25px' }}>
                      {(selectedOS === 'windows' ? windowsSetupCommands : macosSetupCommands)
                        .split('\n')
                        .map((line, index) => (
                          <div key={index} style={{ 
                            margin: '2px 0',
                            color: line.startsWith('#') || line.startsWith('echo') || line.startsWith('Write-Host') ? '#6272a4' : '#f8f8f2'
                          }}>
                            {line}
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  <div style={{
                    background: '#fff3cd',
                    border: '1px solid #ffeaa7',
                    borderRadius: '4px',
                    padding: '10px',
                    marginTop: '10px',
                    fontSize: '13px',
                    color: '#856404'
                  }}>
                    <strong>💡 How to use:</strong>
                    <ol style={{ margin: '5px 0', paddingLeft: '20px' }}>
                      <li>Click "Copy" above</li>
                      <li>Open {selectedOS === 'windows' ? 'PowerShell (Run as Administrator)' : 'Terminal'}</li>
                      <li>Paste and press Enter</li>
                      <li>Wait for downloads to complete</li>
                      <li>Tools will be ready in {selectedOS === 'windows' ? '%USERPROFILE%\\AudiobookTools' : '$HOME/AudiobookTools'}</li>
                    </ol>
                  </div>
                </div>
            </div>

          {/* Generate Commands Section */}
          <div>
            <h2>🔧 Generate Commands</h2>
            
            {generatedCommands.length === 0 ? (
              <div style={{ textAlign: 'center', margin: '30px 0' }}>
                <button 
                  onClick={generateCommands}
                  disabled={!sourceUrl || parseResult.chapters.length === 0 || parseResult.errors.length > 0}
                  style={{
                    background: (!sourceUrl || parseResult.chapters.length === 0 || parseResult.errors.length > 0) ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: (!sourceUrl || parseResult.chapters.length === 0 || parseResult.errors.length > 0) ? 'not-allowed' : 'pointer'
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
                          : 'Open Terminal and navigate to your AudiobookTools folder'
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
            </div>

            {/* Manual Setup Option */}
            <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '15px' }}>
              <h5 style={{ marginTop: 0, color: '#333' }}>🔧 Manual Download Links</h5>
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
              </div>
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
                onChange={(e) => handleTimestampChange(e.target.value)}
                placeholder={sampleTimestamps}
                rows={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${parseResult.errors.length > 0 ? '#dc3545' : '#e1e5e9'}`,
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

            {/* Validation Results */}
            {parseResult.errors.length > 0 && (
              <div style={{
                background: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '8px',
                padding: '15px',
                marginTop: '15px'
              }}>
                <strong>❌ Errors found:</strong>
                <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                  {parseResult.errors.map((error, index) => (
                    <li key={index} style={{ color: '#721c24' }}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {parseResult.warnings.length > 0 && (
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                padding: '15px',
                marginTop: '15px'
              }}>
                <strong>⚠️ Warnings:</strong>
                <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                  {parseResult.warnings.map((warning, index) => (
                    <li key={index} style={{ color: '#856404' }}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {parseResult.chapters.length > 0 && parseResult.errors.length === 0 && (
              <div style={{
                background: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '8px',
                padding: '15px',
                marginTop: '15px'
              }}>
                <strong>✅ Found {parseResult.chapters.length} {parseResult.chapters.length === 1 ? 'chapter' : 'chapters'}:</strong>
                <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                  {parseResult.chapters.slice(0, 3).map((chapter, index) => (
                    <li key={index}>
                      {chapter.start} → {chapter.end || 'END'}: {chapter.title}
                    </li>
                  ))}
                  {parseResult.chapters.length > 3 && (
                    <li>... and {parseResult.chapters.length - 3} more chapters</li>
                  )}
                </ul>
              </div>
            )}