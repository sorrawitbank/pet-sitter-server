function sanitizeFilename(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/_+/g, "_")
    .replace(/[._\s]+$/g, "");
}

export default sanitizeFilename;
