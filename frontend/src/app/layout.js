import "./globals.css";

export const metadata = {
  title: "Nexarrow - Smart Operations",
  description: "Manage your dashboard, documents, finance, and arbitro records",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="newq">{children}</body>
    </html>
  );
}