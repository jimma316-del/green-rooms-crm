// Thin wrapper — embeds the PDF API route directly in an iframe
// Opens in a new tab from the quote editor "Preview PDF" button

interface Props { params: Promise<{ id: string; quoteId: string }> }

export default async function PreviewPage({ params }: Props) {
  const { quoteId } = await params
  const pdfUrl = `/api/quotes/${quoteId}/pdf`

  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: '#3d3d3d' }}>
        <iframe
          src={pdfUrl}
          style={{ width: '100vw', height: '100vh', border: 'none', display: 'block' }}
          title="Quote PDF Preview"
        />
      </body>
    </html>
  )
}
