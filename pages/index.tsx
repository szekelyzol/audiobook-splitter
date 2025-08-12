import { useState } from 'react';
import Head from 'next/head';

interface Chapter {
  start: string;
  end: string;
  title: string;
}

export default function Home() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [timestampInput, setTimestampInput] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedCommands, setGeneratedCommands] = useState<string[]>([]);

  // Sample timestamp text for placeholder
  const sampleTimestamps = `WEBVTT

00:00:00 --> 00:24:54
Chapter 1: Introduction

00:24:54 --> 00:51:46
Chapter 2: Getting Started

00:51:46 --> 01:20:41
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
      
      if (line.includes('-->')) {
        const [start, end = ''] = line.split('-->').map(part => part.trim());
        const title = lines[i + 1]?.trim() || `Chapter ${chapters.length + 1}`;
        
        const cleanTitle = title
          .replace(/^Chapter \d+:?\s*/i, '')
          .replace(/[<>:"/\\|?*]/g, '_')
          .replace(/\s+/g, '_')
          .replace(/_{2,}/g, '_')
          .replace(/^_|_$/g, '')
          .substring(0, 50) || 'Untitled_Chapter';
        
        chapters.push({
          start: start,
          end: end,
          title: cleanTitle
        });
        i++; // Skip title line
      }
    }

    // Fill in end times based on next chapter's start time
    for (let i = 0; i < chapters.length - 1; i++) {
      if (!chapters[i].end) {
        chapters[i].end = chapters[i + 1].start;
      }
    }

    return chapters;
  };

  const generateCommands = () => {
    const parsedChapters = parseTimestamps(timestampInput);
    
    if (parsedChapters.length === 0 || !sourceUrl) {
      return;
    }

    const commands = [];

    // Step 1: Download command
    commands.push('# Step 1: Download audio from source');
    commands.push(`yt-dlp -x --audio-format mp3 -o "%(title)s.%(ext)s" "${sourceUrl}"`);
    commands.push('');

    // Step 2: Split commands
    commands.push('# Step 2: Split audio into chapters');
    commands.push('# Note: Replace "downloaded_file.mp3" with the actual filename from step 1');
    commands.push('');

    parsedChapters.forEach((chapter, index) => {
      const paddedIndex = (index + 1).toString().padStart(2, '0');
      let cmd = `ffmpeg -i "downloaded_file.mp3" -ss ${chapter.start}`;
      
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
    a.download = 'audiobook-commands.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const downloadBatchFile = () => {
    const parsedChapters = parseTimestamps(timestampInput);
    
    const batchContent = `@echo off
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
echo NOTE: You may need to update the filename below with the actual downloaded file name
echo.

${generatedCommands
  .filter(cmd => cmd.includes('ffmpeg'))
  .join('\n')}

echo.
echo ========================================
echo     Processing complete!
echo ========================================
echo Your chapter files are ready!
pause`;

    const blob = new Blob([batchContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'split-audiobook.bat';
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
  const steps = ['Add Source URL', 'Define Timestamps', 'Generate Commands'];

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
        
        {/* Step Navigation */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px', gap: '20px', flexWrap: 'wrap' }}>
          {steps.map((step, index) => (
            <div 
              key={index}
              onClick={() => setCurrentStep(index)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                padding: '10px 20px',
                border: `2px solid ${index === currentStep ? '#007bff' : index < currentStep ? '#28a745' : '#e1e5e9'}`,
                borderRadius: '25px',
                background: index === currentStep ? '#e3f2fd' : index < currentStep ? '#d4edda' : '#f8f9fa',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: '25px',
                height: '25px',
                borderRadius: '50%',
                background: index === currentStep ? '#007bff' : index < currentStep ? '#28a745' : '#6c757d',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '12px'
              }}>
                {index + 1}
              </div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{step}</div>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '30px', marginBottom: '30px' }}>
          
          {/* Step 1: Source URL */}
          {currentStep === 0 && (
            <div>
              <h2 style={{ marginTop: 0 }}>Step 1: Add Source URL</h2>
              <p>Enter the URL of the video/audio you want to download and split:</p>
              
              <div style={{ margin: '20px 0' }}>
                <label htmlFor="url" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Source URL:
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
                  background: '#ffffff', 
                  padding: '20px', 
                  borderRadius: '8px', 
                  marginTop: '20px',
                  border: '1px solid #dee2e6'
                }}>
                  <h3 style={{ marginTop: 0 }}>Generated Command:</h3>
                  <code style={{ 
                    background: '#1a1a1a', 
                    color: '#f8f8f2', 
                    padding: '15px', 
                    display: 'block', 
                    borderRadius: '6px',
                    fontFamily: 'Monaco, Menlo, monospace',
                    fontSize: '13px',
                    overflowX: 'auto'
                  }}>
                    {`yt-dlp -x --audio-format mp3 -o "%(title)s.%(ext)s" "${sourceUrl}"`}
                  </code>
                  
                  <div style={{ 
                    background: '#e3f2fd', 
                    padding: '15px', 
                    borderRadius: '6px',
                    marginTop: '15px',
                    fontSize: '14px'
                  }}>
                    <strong>Explanation:</strong>
                    <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                      <li><code>yt-dlp</code> - Downloads video/audio from various platforms</li>
                      <li><code>-x</code> - Extract audio only</li>
                      <li><code>--audio-format mp3</code> - Convert to MP3 format</li>
                      <li><code>-o &quot;%(title)s.%(ext)s&quot;</code> - Use video title as filename</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Timestamps */}
          {currentStep === 1 && (
            <div>
              <h2 style={{ marginTop: 0 }}>Step 2: Define Timestamps</h2>
              <p>Add your chapter timestamps in WebVTT format or simple format:</p>

              <div style={{ margin: '20px 0' }}>
                <label htmlFor="timestamps" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                  Chapter Timestamps:
                </label>
                <textarea
                  id="timestamps"
                  value={timestampInput}
                  onChange={(e) => setTimestampInput(e.target.value)}
                  placeholder={sampleTimestamps}
                  rows={10}
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
          )}

          {/* Step 3: Generate Commands */}
          {currentStep === 2 && (
            <div>
              <h2 style={{ marginTop: 0 }}>Step 3: Generated Commands</h2>
              <p>Here are the exact commands you need to run:</p>

              {generatedCommands.length === 0 && (
                <div style={{ textAlign: 'center', margin: '40px 0' }}>
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
                    🔧 Generate Commands
                  </button>
                </div>
              )}

              {generatedCommands.length > 0 && (
                <div>
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '20px',
                    margin: '20px 0'
                  }}>
                    <h3 style={{ marginTop: 0 }}>📋 Commands to Run:</h3>
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
                        onClick={downloadCommands}
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
                        💾 Download .txt
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
                        🖥️ Download .bat (Windows)
                      </button>
                    </div>
                  </div>

                  <div style={{
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    padding: '20px',
                    marginTop: '30px'
                  }}>
                    <h3 style={{ marginTop: 0 }}>📚 How to Use These Commands:</h3>
                    <div style={{ display: 'grid', gap: '15px' }}>
                      <div style={{
                        background: '#ffffff',
                        padding: '15px',
                        borderRadius: '6px',
                        borderLeft: '4px solid #007bff'
                      }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Prerequisites:</h4>
                        <p style={{ margin: 0 }}>
                          Install <a href="https://github.com/yt-dlp/yt-dlp#installation" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>yt-dlp</a> and <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>FFmpeg</a>
                        </p>
                      </div>
                      
                      <div style={{
                        background: '#ffffff',
                        padding: '15px',
                        borderRadius: '6px',
                        borderLeft: '4px solid #007bff'
                      }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Step 1:</h4>
                        <p style={{ margin: 0 }}>Run the download command in your terminal/command prompt</p>
                      </div>
                      
                      <div style={{
                        background: '#ffffff',
                        padding: '15px',
                        borderRadius: '6px',
                        borderLeft: '4px solid #007bff'
                      }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Step 2:</h4>
                        <p style={{ margin: 0 }}>Note the actual filename of the downloaded MP3 file</p>
                      </div>
                      
                      <div style={{
                        background: '#ffffff',
                        padding: '15px',
                        borderRadius: '6px',
                        borderLeft: '4px solid #007bff'
                      }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Step 3:</h4>
                        <p style={{ margin: 0 }}>Replace &quot;downloaded_file.mp3&quot; in the split commands with the actual filename</p>
                      </div>
                      
                      <div style={{
                        background: '#ffffff',
                        padding: '15px',
                        borderRadius: '6px',
                        borderLeft: '4px solid #007bff'
                      }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>Step 4:</h4>
                        <p style={{ margin: 0 }}>Run each ffmpeg command to create your chapter files</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
            {currentStep > 0 && (
              <button 
                onClick={() => setCurrentStep(currentStep - 1)}
                style={{
                  padding: '12px 24px',
                  border: '2px solid #007bff',
                  background: '#ffffff',
                  color: '#007bff',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ← Previous
              </button>
            )}
            
            {currentStep < steps.length - 1 && (
              <button 
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={
                  (currentStep === 0 && !sourceUrl) || 
                  (currentStep === 1 && parsedChapters.length === 0)
                }
                style={{
                  padding: '12px 24px',
                  border: '2px solid #007bff',
                  background: (currentStep === 0 && !sourceUrl) || (currentStep === 1 && parsedChapters.length === 0) 
                    ? '#6c757d' : '#007bff',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: (currentStep === 0 && !sourceUrl) || (currentStep === 1 && parsedChapters.length === 0) 
                    ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  marginLeft: 'auto'
                }}
              >
                Next →
              </button>
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