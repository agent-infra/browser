import { useRef } from 'react';
import {
  BrowserCanvas,
  BrowserCanvasRef,
  Browser,
  Page,
} from '../src/react/BrowserCanvas';

const App = () => {
  const ref = useRef<BrowserCanvasRef>(null);

  const handlePageReady = async (ctx: { browser: Browser; page: Page }) => {
    const { page } = ctx;
    console.log('url', page.url());

    page.on('framenavigated', async (frame) => {
      if (frame === page.mainFrame()) {
        console.log('url', frame.url());
      }
    });
  };

  return (
    <div
      style={{
        width: '100%',
        height: '1000px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <BrowserCanvas
        ref={ref}
        wsEndpoint="ws://127.0.0.1:9222/devtools/browser/WS_ENDPOINT"
        onReady={handlePageReady}
        onError={(err) => {
          console.error('BrowserCanvas Err', err);
        }}
      />
    </div>
  );
};

export default App;
