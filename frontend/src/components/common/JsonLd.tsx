interface JsonLdProps {
  data: Record<string, unknown>;
}

/** Safely embeds schema.org data without allowing a user-authored string to close the script tag. */
export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
