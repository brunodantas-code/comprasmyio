/** Capture the current canvas, including its visible collapse/highlight state. */
export async function createMytosisPdf(element: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);
  // Wait for the collapse animation and the measured connector overlay to settle.
  await new Promise((resolve) => setTimeout(resolve, 650));
  const width = Math.ceil(element.scrollWidth);
  const height = Math.ceil(element.scrollHeight);
  const scale = Math.min(2, 12000 / Math.max(width, height), Math.sqrt(24_000_000 / (width * height)));
  const canvas = await html2canvas(element, {
    backgroundColor: getComputedStyle(element).getPropertyValue("--card").trim() || getComputedStyle(document.body).backgroundColor,
    width, height, scale,
    useCORS: true,
    onclone: (_document, cloned) => {
      cloned.querySelectorAll<HTMLElement>("[data-mytosis-capture-ignore]").forEach((control) => { control.style.visibility = "hidden"; });
    },
  });
  const margin = 12;
  const pageWidth = Math.min(1000, Math.max(210, width * 0.264583 + margin * 2));
  const imageWidth = pageWidth - margin * 2;
  const imageHeight = imageWidth * height / width;
  const pageHeight = imageHeight + margin * 2;
  const pdf = new jsPDF({ orientation: pageWidth > pageHeight ? "landscape" : "portrait", unit: "mm", format: [pageWidth, pageHeight] });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, imageWidth, imageHeight);
  return pdf.output("blob");
}

export async function downloadMytosisPdf(blob: Blob, title: string) {
  const filename = `${title.replace(/[\\/:*?"<>|]/g, "-").trim() || "Fluxograma"}.pdf`;
  const file = new File([blob], filename, { type: "application/pdf" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return; }
    catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}