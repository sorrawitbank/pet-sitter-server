function detectLanguage(text: string): "th" | "en" {
  return /[ก-๙]/.test(text) ? "th" : "en";
}

export default detectLanguage;
