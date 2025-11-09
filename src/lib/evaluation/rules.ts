export const DEFAULT_SALES_KEYWORDS = ['営業', 'セールス', '提案', '御社', '貴社', '販売', '広告', '代理店'];
export const DEFAULT_SPAM_KEYWORDS = ['今すぐ', '限定', '無料', '特別', 'クリック'];
export const DEFAULT_SCHEDULING_DOMAINS = [
  'calendly.com',
  'youcanbook.me',
  'scheduleonce.com',
  'acuityscheduling.com',
  'savvycal.com',
  'hubspot.com',
  'meetings.hubspot.com',
  'tidycal.com',
  'cal.com',
];

export interface DetectionResult {
  content: string;
  urls: string[];
  urlDomains: string[];
  schedulingUrls: string[];
  salesKeywords: string[];
  spamKeywords: string[];
  bannedKeywords: string[];
  blockedDomainMatches: string[];
}

interface AnalyzeOptions {
  bannedKeywords?: string[];
  blockedDomains?: string[];
}

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

function matchesDomain(candidate: string, target: string): boolean {
  return candidate === target || candidate.endsWith(`.${target}`);
}

function extractHostname(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname || null;
  } catch {
    const match = url.match(/https?:\/\/([^/\s]+)/i);
    return match?.[1]?.toLowerCase() ?? null;
  }
}

function collectEmailDomains(formData: Record<string, any>): string[] {
  const domains = new Set<string>();
  const emailRegex = /[\w.+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
  Object.values(formData).forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }
    emailRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = emailRegex.exec(value)) !== null) {
      if (match[1]) {
        domains.add(match[1].toLowerCase());
      }
    }
  });
  return Array.from(domains);
}

export function analyzeFormContent(
  formData: Record<string, any>,
  options: AnalyzeOptions = {}
): DetectionResult {
  const content = Object.values(formData)
    .filter((value) => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const urls = content.match(urlRegex) || [];
  const urlDomains = Array.from(
    new Set(
      urls
        .map((url) => extractHostname(url))
        .filter((hostname): hostname is string => Boolean(hostname))
    )
  );
  const emailDomains = collectEmailDomains(formData);

  const bannedKeywords = (options.bannedKeywords || []).filter(
    (kw) => kw && content.includes(kw.toLowerCase())
  );
  const salesKeywords = DEFAULT_SALES_KEYWORDS.filter((kw) => content.includes(kw.toLowerCase()));
  const spamKeywords = DEFAULT_SPAM_KEYWORDS.filter((kw) => content.includes(kw.toLowerCase()));

  const schedulingUrls = urls.filter((url) => {
    const hostname = extractHostname(url);
    if (!hostname) return false;
    return DEFAULT_SCHEDULING_DOMAINS.some((domain) => matchesDomain(hostname, domain));
  });

  const blockedDomainMatches: string[] = [];
  const configuredBlockedDomains = (options.blockedDomains || []).map(normalizeDomain).filter(Boolean);
  if (configuredBlockedDomains.length > 0) {
    const candidates = Array.from(new Set([...urlDomains, ...emailDomains]));
    candidates.forEach((domain) => {
      const normalized = normalizeDomain(domain);
      if (
        configuredBlockedDomains.some((blocked) => matchesDomain(normalized, blocked)) &&
        !blockedDomainMatches.includes(normalized)
      ) {
        blockedDomainMatches.push(normalized);
      }
    });
  }

  return {
    content,
    urls,
    urlDomains,
    schedulingUrls,
    salesKeywords,
    spamKeywords,
    bannedKeywords,
    blockedDomainMatches,
  };
}
