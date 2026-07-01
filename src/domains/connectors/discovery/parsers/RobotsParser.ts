// Hand-rolled robots.txt parser — no new dependency. Parses only the
// `User-agent: *` block (ignores other UA blocks — conservative/simple),
// matches Disallow/Allow path prefixes, longest-prefix-wins. Defaults to
// ALLOWED if robots.txt is missing/empty/unparseable (standard robots.txt
// semantics: absence means no restriction). DiscoveryService still keeps its
// own crawl conservative (single sitemap fetch, no recursive product-page
// crawling) regardless of this outcome, per the "never aggressive scraping"
// mission constraint.
interface Rule {
  path: string;
  allow: boolean;
}

export class RobotsParser {
  isAllowed(robotsTxt: string, path: string): boolean {
    const rules = this.rulesForWildcardUserAgent(robotsTxt);
    if (rules.length === 0) return true;

    let best: Rule | null = null;
    for (const rule of rules) {
      if (path.startsWith(rule.path) && (!best || rule.path.length > best.path.length)) {
        best = rule;
      }
    }
    return best ? best.allow : true;
  }

  private rulesForWildcardUserAgent(robotsTxt: string): Rule[] {
    if (!robotsTxt.trim()) return [];

    const lines = robotsTxt.split(/\r?\n/).map((l) => l.trim());
    const rules: Rule[] = [];
    let inWildcardGroup = false;
    let groupHasDirectives = false;

    for (const line of lines) {
      if (!line || line.startsWith("#")) continue;
      const [rawKey, ...rest] = line.split(":");
      if (!rawKey || rest.length === 0) continue;
      const key = rawKey.trim().toLowerCase();
      const value = rest.join(":").trim();

      if (key === "user-agent") {
        // A new User-agent line starts a new group only once the previous
        // group already had directives — consecutive User-agent lines share
        // the same following directives (per the robots.txt spec).
        if (groupHasDirectives) {
          inWildcardGroup = false;
          groupHasDirectives = false;
        }
        if (value === "*") inWildcardGroup = true;
        continue;
      }

      if (!inWildcardGroup) continue;

      if (key === "disallow" && value) {
        rules.push({ path: value, allow: false });
        groupHasDirectives = true;
      } else if (key === "allow" && value) {
        rules.push({ path: value, allow: true });
        groupHasDirectives = true;
      }
    }

    return rules;
  }
}
