import Head from 'next/head';
import Link from 'next/link';

export default function DownloadPage() {
  return (
    <>
      <Head>
        <title>Download - Audiobook Splitter</title>
        <meta name="description" content="Download and setup guide" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div style={{ 
        padding: '20px', 
        maxWidth: '800px', 
        margin: '0 auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineHeight: '1.6'
      }}>
        <h1>📥 Download & Setup Guide</h1>
        <p>Get the tools you need to split audiobooks into chapters.</p>
        
        <div style={{ 
          background: '#f8f9fa', 
          padding: '20px', 
          borderRadius: '8px', 
          margin: '20px 0' 
        }}>
          <h2>🔧 Required Tools</h2>
          <ol>
            <li>
              <strong>yt-dlp</strong> - Downloads audio from YouTube
              <br />
              <a 
                href="https://github.com/yt-dlp/yt-dlp/releases" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#007bff' }}
              >
                Download from GitHub →
              </a>
            </li>
            <li style={{ marginTop: '15px' }}>
              <strong>FFmpeg</strong> - Splits audio into chapters
              <br />
              <a 
                href="https://ffmpeg.org/download.html" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#007bff' }}
              >
                Download from Official Site →
              </a>
            </li>
          </ol>
        </div>

        <div style={{ 
          background: '#e3f2fd', 
          padding: '20px', 
          borderRadius: '8px', 
          margin: '20px 0' 
        }}>
          <h2>📚 How to Use</h2>
          <ol>
            <li>Install the tools above</li>
            <li>Go back to the main tool</li>
            <li>Enter your YouTube URL and timestamps</li>
            <li>Download the generated commands</li>
            <li>Run the commands on your computer</li>
          </ol>
        </div>
        
        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          <Link 
            href="/" 
            style={{ 
              color: '#007bff', 
              textDecoration: 'none',
              fontSize: '18px',
              fontWeight: '600'
            }}
          >
            ← Back to Main Tool
          </Link>
        </div>
      </div>
    </>
  );
}