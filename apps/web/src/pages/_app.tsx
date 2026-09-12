import type { AppProps } from 'next/app';
import Head from 'next/head';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Riona AI — Social Agent Control Deck</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <style>{`
          @layer base {
            html, body {
              margin: 0;
              padding: 0;
              background-color: #12151b;
              color: #d3d7e2;
              font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
            }
            body { overscroll-behavior: none; }
          }
          ::-webkit-scrollbar { display: none; }
        `}</style>
      </Head>
      <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              darkMode: "class",
              theme: {
                extend: {
                  colors: {
                    surface: {
                      base: '#12151b',
                      subtle: '#151821',
                      card: '#1a1d26',
                      elevated: '#1e222c',
                      hover: '#262b37',
                    },
                    border: {
                      subtle: '#262b36',
                      translucent: 'rgba(255, 255, 255, 0.07)',
                    },
                    text: {
                      primary: '#e1e4eb',
                      secondary: '#9299a9',
                      muted: '#6b7282',
                    }
                  },
                  fontFamily: {
                    sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
                    mono: ['JetBrains Mono', 'monospace'],
                  }
                }
              }
            };
          `,
        }}
      />
      <Component {...pageProps} />
    </>
  );
}

