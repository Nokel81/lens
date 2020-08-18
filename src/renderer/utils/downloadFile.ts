export function downloadFile(filename: string, contents: BlobPart, type: string): void {
  const data = new Blob([contents], { type })
  const url = URL.createObjectURL(data)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}