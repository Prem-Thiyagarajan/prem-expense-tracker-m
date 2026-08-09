/**
 * Light markdown flattening for assistant replies.
 *
 * The system prompt asks the model not to use markdown, and it does anyway —
 * `**bold**`, `- ` bullets and the occasional `###` heading all showed up in
 * testing. React Native's <Text> has no markdown renderer, so raw asterisks
 * would be visible to the user. Rather than pull in a markdown library for a
 * two-sentence bubble, flatten the handful of constructs the model actually
 * emits and leave everything else untouched.
 */
export function flattenMarkdown(input: string): string {
  return (
    input
      // ```code fences``` -> keep the contents, drop the fence lines
      .replace(/^```[a-z]*\n?/gim, '')
      // ### Heading -> Heading
      .replace(/^#{1,6}\s+/gm, '')
      // **bold** / __bold__ -> bold
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      // *italic* / _italic_ -> italic (avoid touching a lone * used as a bullet)
      .replace(/(?<![*\w])[*_](?![*\s])(.+?)(?<![*\s])[*_](?![*\w])/g, '$1')
      // `code` -> code
      .replace(/`([^`]+)`/g, '$1')
      // "- item" / "* item" -> "•  item"
      .replace(/^[ \t]*[-*]\s+/gm, '•  ')
      // Collapse 3+ blank lines that markdown spacing tends to leave behind
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}
