import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// 서비스워커 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      // 알림 스케줄 시작
      if (reg.active) {
        reg.active.postMessage({ type: 'SCHEDULE_NOTIFICATION' });
      }
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            newWorker.postMessage({ type: 'SCHEDULE_NOTIFICATION' });
          }
        });
      });
    } catch (e) {
      console.log('SW registration failed:', e);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
