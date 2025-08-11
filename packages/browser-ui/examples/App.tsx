import { useRef, useState } from 'react';
import {
  BrowserCanvas,
  BrowserCanvasRef,
  Browser,
  Page,
} from '../src/react/BrowserCanvas';

const App = () => {
  const ref = useRef<BrowserCanvasRef>(null);
  const [url, setUrl] = useState('https://www.toutiao.com');
  const [isNavigating, setIsNavigating] = useState(false);

  const handlePageReady = async (ctx: { browser: Browser; page: Page }) => {
    const { page } = ctx;
    console.log('Current URL:', page.url());
  };

  const handleNavigate = async () => {
    if (!url.trim()) return;
    
    const canvas = ref.current;

    if (canvas && canvas.page) {
      setIsNavigating(true);
      try {
        await canvas.page.goto(url, { waitUntil: 'networkidle2' });
        console.log('Manually navigated to:', url);
      } catch (error) {
        console.error('Manual navigation failed:', error);
      } finally {
        setIsNavigating(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        style={{
          padding: '16px',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Input URL and press Enter"
          disabled={isNavigating}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '16px',
            outline: 'none',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#007bff';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#ccc';
          }}
        />
        <button
          onClick={handleNavigate}
          disabled={isNavigating || !url.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: isNavigating ? '#ccc' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: isNavigating ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            minWidth: '80px',
            transition: 'background-color 0.2s',
          }}
        >
          {isNavigating ? 'Navigating...' : 'goto'}
        </button>
      </div>
      <div
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <BrowserCanvas
          ref={ref}
          wsEndpoint="ws://127.0.0.1:9222/devtools/browser/ef65a72b-8a0f-46b5-8659-a33564fa662f"
          onReady={handlePageReady}
          onError={(err) => {
            console.error('BrowserCanvas Error:', err);
            setIsNavigating(false);
          }}
        />
      </div>
    </div>
  );
};

export default App;
