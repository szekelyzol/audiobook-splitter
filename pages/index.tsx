import { useState } from 'react';
import Head from 'next/head';

export default function Home() {
  const [sourceUrl, setSourceUrl] = useState('');

  return (
    <>
      <Head>
        <title>Audiobook Command Generator</title>
        <meta name="description" content="Generate CLI commands to split audiobooks" />
      </Head>

      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>🎧 Audiobook Command Generator</h1>
        <p>Generate CLI commands to split audiobooks into chapters</p>
        
        <div style={{ margin: '20px 0' }}>
          <label>YouTube URL:</label>
          <input 
            type="url" 
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{ 
              width: '100%', 
              padding: '10px', 
              margin: '10px 0',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </div>

        {sourceUrl && (
          <div style={{ 
            background: '#f5f5f5', 
            padding: '15px', 
            borderRadius: '8px', 
            marginTop: '20px' 
          }}>
            <h3>Generated Command:</h3>
            <code style={{ 
              background: '#000', 
              color: '#fff', 
              padding: '10px', 
              display: 'block', 
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              yt-dlp -x --audio-format mp3 &quot;{sourceUrl}&quot;
            </code>
          </div>
        )}
      </div>
    </>
  );
}