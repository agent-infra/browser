import { useRef } from "react";
import {
  BrowserCanvas,
  BrowserCanvasRef,
  Browser,
  Page,
} from "../src/react/BrowserCanvas";

const App = () => {
  const ref = useRef<BrowserCanvasRef>(null);

  const handlePageReady = async (ctx: { browser: Browser; page: Page }) => {
    const { page } = ctx;
    console.log('url', page.url());

    page.on("framenavigated", async (frame) => {
      if (frame === page.mainFrame()) {
        console.log('url', frame.url());
      }
    });
  };

  return (
    <div>
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
          // cdpEndpoint="http://127.0.0.1:9222/json/version"
          wsEndpoint="ws://127.0.0.1:9222/devtools/browser/d5e4a62d-17b3-4281-bb2e-1406ac8fa8ca"
          onReady={handlePageReady}
          onError={(err) => {
            console.error('BrowserCanvas Err', err);
          }}
        />
      </div>
    </div>
  );
};

export default App;
