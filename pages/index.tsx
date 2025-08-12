import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [sourceUrl, setSourceUrl] = useState('');

  return (
    <>
      <Head>
        <title>Audiobook Command Generator</title>
        <meta name="description" content="Generate CLI commands to split audiobooks" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        <h1>🎧 Audiobook Command Generator</h1>
        <p>Generate the exact CLI commands you need to split audiobooks into chapters</p>
        
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
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            marginTop: '20px',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ marginTop: 0, color: '#333' }}>Generated Download Command:</h3>
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
              <strong>What this command does:</strong>
              <ul style={{ margin: '10px 0', paddingLeft: '20px' }}>
                <li><code>yt-dlp</code> - Downloads video/audio from YouTube</li>
                <li><code>-x</code> - Extract audio only</li>
                <li><code>--audio-format mp3</code> - Convert to MP3 format</li>
                <li><code>-o &quot;%(title)s.%(ext)s&quot;</code> - Use video title as filename</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}