const MAX_PREFERRED_ADDRESS_LENGTH = 60;
const MAX_PREFERRED_ADDRESS_WORDS = 8;

const SET_PREFERENCE_PATTERNS = [
  /^\s*(?:(?:từ giờ|tu gio)\s+)?(?:hãy\s+)?gọi\s+(?:tôi|mình|em|tớ)\s+là\s+(.{1,100}?)\s*[.!?]?\s*$/iu,
  /^\s*(?:(?:tu gio)\s+)?(?:hay\s+)?goi\s+(?:toi|minh|em|to)\s+la\s+(.{1,100}?)\s*[.!?]?\s*$/iu,
  /^\s*(?:please\s+)?call\s+me\s+(.{1,100}?)\s*[.!?]?\s*$/iu,
  /^\s*(?:please\s+)?address\s+me\s+as\s+(.{1,100}?)\s*[.!?]?\s*$/iu,
  /^\s*(?:you\s+can|can\s+you)\s+call\s+me\s+(.{1,100}?)\s*[.!?]?\s*$/iu,
];

const CLEAR_PREFERENCE_PATTERNS = [
  /^\s*(?:đừng|không cần|thôi)\s+gọi\s+(?:tôi|mình|em|tớ).*?(?:nữa|nhé|nha)?\s*[.!?]?\s*$/iu,
  /^\s*(?:dung|khong can|thoi)\s+goi\s+(?:toi|minh|em|to).*?(?:nua|nhe|nha)?\s*[.!?]?\s*$/iu,
  /^\s*(?:please\s+)?(?:stop|don'?t)\s+call(?:ing)?\s+me\b.*?[.!?]?\s*$/iu,
  /^\s*(?:please\s+)?call\s+me\s+by\s+my\s+(?:real|account)\s+name\s*[.!?]?\s*$/iu,
];

const RECALL_PREFERENCE_PATTERNS = [
  /^\s*(?:bạn|ban)\s+(?:đang\s+|dang\s+)?(?:gọi|goi)\s+(?:tôi|toi|mình|minh|em|tớ|to)\s+(?:là|la)\s+(?:gì|gi)\s*[?!.]?\s*$/iu,
  /^\s*(?:bạn|ban)\s+(?:có\s+|co\s+)?(?:nhớ|nho).*(?:gọi|goi)\s+(?:tôi|toi|mình|minh|em|tớ|to).*?[?!.]?\s*$/iu,
  /^\s*what\s+do\s+you\s+call\s+me\s*[?!.]?\s*$/iu,
  /^\s*what\s+should\s+you\s+call\s+me\s*[?!.]?\s*$/iu,
  /^\s*do\s+you\s+remember\s+(?:my\s+name|what\s+to\s+call\s+me)\s*[?!.]?\s*$/iu,
];

const isClearPreferenceRequest = (message) =>
  CLEAR_PREFERENCE_PATTERNS.some((pattern) => pattern.test(String(message || '')));

const isPreferenceRecallRequest = (message) =>
  RECALL_PREFERENCE_PATTERNS.some((pattern) => pattern.test(String(message || '')));

const normalizePreferredAddress = (value) => {
  const beforePoliteSuffix = String(value || '')
    .normalize('NFKC')
    .split(/[\r\n]/, 1)[0]
    .split(/\s+(?:nhé|nha|ạ|nhe|please)(?:\s|[.!?]|$)/iu, 1)[0];
  const cleaned = beforePoliteSuffix
    .replace(/^[\s'"“”‘’]+|[\s'"“”‘’.,!?;:]+$/gu, '')
    .replace(/[^\p{L}\p{N}\s.'’_-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
  if (!cleaned || cleaned.length > MAX_PREFERRED_ADDRESS_LENGTH) return null;
  if (wordCount > MAX_PREFERRED_ADDRESS_WORDS) return null;
  if (/\b(?:và|va|and|rồi|roi)\s+(?:hãy\s+|hay\s+)?(?:cho|giúp|giup|chỉ|chi|hướng dẫn|huong dan|dạy|day|tư vấn|tu van|give|show|find|explain|help|teach|tell|guide|advise)\b/iu.test(cleaned)) return null;
  if (/\s(?:cho|giúp|giup|chỉ|chi|hướng dẫn|huong dan|dạy|day|tư vấn|tu van|give|show|find|explain|help|teach|tell|guide|advise)\s+(?:tôi|toi|mình|minh|me)\b/iu.test(cleaned)) return null;
  if (/\b(?:ignore|disregard)\b.*\b(?:instruction|prompt|rule)/iu.test(cleaned)) return null;
  if (/\b(?:reveal|show)\b.*\b(?:system|developer)\s+prompt/iu.test(cleaned)) return null;
  return cleaned;
};

const extractPreferredAddress = (message) => {
  const text = String(message || '');
  if (isClearPreferenceRequest(text) || isPreferenceRecallRequest(text)) return null;
  for (const pattern of SET_PREFERENCE_PATTERNS) {
    const match = text.match(pattern);
    const preferredAddress = normalizePreferredAddress(match?.[1]);
    if (preferredAddress) return preferredAddress;
  }
  return null;
};

const isAddressPreferenceRequest = (message) =>
  Boolean(extractPreferredAddress(message))
  || isClearPreferenceRequest(message)
  || isPreferenceRecallRequest(message);

const findPreferredAddress = (messages = []) => {
  for (const item of [...messages].reverse()) {
    if (item?.role !== 'user' || !item.content) continue;
    if (isClearPreferenceRequest(item.content)) return null;
    const preferredAddress = extractPreferredAddress(item.content);
    if (preferredAddress) return preferredAddress;
  }
  return null;
};

module.exports = {
  extractPreferredAddress,
  findPreferredAddress,
  isAddressPreferenceRequest,
  isClearPreferenceRequest,
  isPreferenceRecallRequest,
  normalizePreferredAddress,
};
