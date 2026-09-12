import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

const RAMME_IPHONE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';

const RAMME_INJECTED_CSS = `
<style id="ramme-injected-style">
  /* Ramme Local Browser Injected Styles */
  body {
    background-color: #000000 !important;
    color: #f5f5f5 !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  div[role="dialog"] button:contains("Get App"),
  a[href*="itunes.apple.com"],
  a[href*="play.google.com"],
  ._a69p, ._ac1g {
    display: none !important;
  }
  ::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  ::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 2px;
  }
</style>
`;

router.get('/view', async (req: Request, res: Response): Promise<void> => {
  try {
    const targetUrl = (req.query.url as string) || 'https://www.instagram.com';

    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': RAMME_IPHONE_USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://www.instagram.com/',
      },
      responseType: 'text',
      validateStatus: () => true,
    });

    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Content-Type-Options');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    let html = response.data;

    if (typeof html === 'string') {
      const baseTag = '<base href="https://www.instagram.com/" />';
      if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${baseTag}`);
      } else if (html.includes('</head>')) {
        html = html.replace('</head>', `${baseTag}${RAMME_INJECTED_CSS}</head>`);
      } else {
        html = baseTag + RAMME_INJECTED_CSS + html;
      }
      res.status(200).send(html);
      return;
    }

    res.status(200).send(html);
    return;
  } catch (err: any) {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { background: #000; color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; p-4; }
            .card { background: #121212; border: 1px solid #262626; padding: 24px; border-radius: 16px; max-width: 320px; }
            .btn { background: #e1306c; color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: 600; cursor: pointer; margin-top: 12px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3 style="color:#e1306c;margin-top:0;">📷 Ramme Instagram Emulator</h3>
            <p style="color:#a8a8a8;font-size:12px;">Local Session Ready (${err.message})</p>
            <button class="btn" onclick="location.reload()">🔄 Refresh View</button>
          </div>
        </body>
      </html>
    `);
    return;
  }
});

export default router;
