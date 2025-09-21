import './globals.css';
import '@picocss/pico';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="container">
          <h6>Speechmatics Real Time Tranascription</h6>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
