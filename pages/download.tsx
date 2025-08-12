import Head from 'next/head';
import Link from 'next/link';

export default function DownloadPage() {
  return (
    <>
      <Head>
        <title>Download - Audiobook Splitter</title>
        <meta name="description" content="Download and setup guide" />
      </Head>
      
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Download & Setup Guide</h1>
        <p>Coming soon - setup instructions for the audiobook splitter tools.</p>
        
        <div style={{ marginTop: '40px' }}>
          <Link href="/" style={{ color: '#007bff', textDecoration: 'none' }}>
            ← Back to Main Tool
          </Link>
        </div>
      </div>
    </>
  );
}