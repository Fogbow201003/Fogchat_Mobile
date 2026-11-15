// Default reactions list for quick pickers
export const QUICK_REACTIONS = ['👍', '❤️', '🔥', '😂', '🎉', '🚀', '👀', '💯'];

// Parse message text to highlight mentions and extract custom emoji shortcodes
export const parseMessageContent = (content, customEmojis = []) => {
  if (!content) return [];
  // Tokenize string by spaces or shortcode pattern
  // E.g. "Hello :ami_zzz: @dat.nguyen"
  const tokens = [];
  const regex = /(:[a-zA-Z0-9_-]+:)|(@[a-zA-Z0-9._-]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: content.slice(lastIndex, match.index)
      });
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith(':') && matchedStr.endsWith(':')) {
      // Custom emoji candidate
      const foundCustom = customEmojis.find(e => e.shortcode === matchedStr);
      if (foundCustom) {
        tokens.push({
          type: 'custom_emoji',
          shortcode: matchedStr,
          imageUrl: foundCustom.imageUrl
        });
      } else {
        tokens.push({ type: 'text', value: matchedStr });
      }
    } else if (matchedStr.startsWith('@')) {
      tokens.push({
        type: 'mention',
        value: matchedStr
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    tokens.push({
      type: 'text',
      value: content.slice(lastIndex)
    });
  }

  return tokens;
};
