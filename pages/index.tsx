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
        
        {/* Step Navigation */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px', gap: '20px' }}>
          {steps.map((step, index) => (
            <div 
              key={index}
              onClick={() => setCurrentStep(index)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                padding: '10px 20px',
                border: `2px solid ${index === currentStep ? '#007bff' : '#e1e5e9'}`,
                borderRadius: '25px',
                background: index === currentStep ? '#e3f2fd' : '#f8f9fa',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{
                width: '25px',
                height: '25px',
                borderRadius: '50%',
                background: index === currentStep ? '#007bff' : '#6c757d',
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

          {/* Step 3: Placeholder for Commands */}
          {currentStep === 2 && (
            <div>
              <h2 style={{ marginTop: 0 }}>Step 3: Generate Commands</h2>
              <p>Commands will be generated here in the next step...</p>
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
      </div>
    </>
  );
}