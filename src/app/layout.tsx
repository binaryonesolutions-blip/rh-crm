import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Link from 'next/link'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'Rhombus Concrete — Quotations',
  description: 'Internal quotation management for Rhombus Concrete Ltd',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} bg-gray-50 text-gray-900 antialiased`}>
        <nav className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-6 sticky top-0 z-40 shadow-sm">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <img
              src="https://rhombusconcrete.com/wp-content/uploads/2020/11/Logo-Rhombus-Concrete-1.png"
              alt="Rhombus Concrete"
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* Divider */}
          <span className="h-6 w-px bg-gray-200" />

          {/* Nav links */}
          <div className="flex gap-1">
            <Link href="/"           className="nav-link">Quotes</Link>
            <Link href="/price-list" className="nav-link">Price list</Link>
            <Link href="/settings"   className="nav-link">Settings</Link>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Contact pill */}
          <a
            href="tel:+254702700700"
            className="hidden md:flex items-center gap-2 text-xs text-gray-500 hover:text-rhombus-blue transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            +254-702-700-700
          </a>
        </nav>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </main>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '8px',
              background: '#1a1a1a',
              color: '#fff',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
