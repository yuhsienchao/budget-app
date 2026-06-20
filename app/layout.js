import "./globals.css";

export const metadata = {
  title: "每日記帳",
  description: "Daily Budget Tracker",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
