import { Geist } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata = {
  title: 'WC26 Predictor 🏆',
  description: 'World Cup 2026 Prediction Game — Friends Edition',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0a0f1e" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={geist.className}>
        {children}

        {/* OneSignal Push Notification SDK */}
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          defer
          strategy="afterInteractive"
        />
        <Script id="onesignal-init" strategy="afterInteractive">
          {`
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              await OneSignal.init({
                appId: "${process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID}",
                notifyButton: { enable: false },
                promptOptions: {
                  slidedown: {
                    prompts: [{
                      type: "push",
                      autoPrompt: false,
                      text: {
                        actionMessage: "Get notified before matches start and when results are in! 🔔",
                        acceptButton: "Yes, notify me!",
                        cancelButton: "Maybe later"
                      }
                    }]
                  }
                }
              });
            });
          `}
        </Script>
      </body>
    </html>
  )
}
