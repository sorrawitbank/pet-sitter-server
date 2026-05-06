function buildSitterEmbeddingContents(
  introduction: string | null,
  services: string | null,
  description: string | null,
): string[] {
  const introBlock = introduction
    ? `Sitter introduction: ${introduction}`
    : undefined;

  const servicesBlock = services ? `Services offered: ${services}` : undefined;

  const descriptionBlock = description
    ? `Details about the sitter's place: ${description}`
    : undefined;

  return [introBlock, servicesBlock, descriptionBlock].filter(
    (block): block is string => Boolean(block),
  );
}

export default buildSitterEmbeddingContents;
