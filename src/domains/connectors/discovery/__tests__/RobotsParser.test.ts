import { RobotsParser } from "../parsers/RobotsParser";

describe("RobotsParser", () => {
  const parser = new RobotsParser();

  it("defaults to allowed when robots.txt is missing/empty", () => {
    expect(parser.isAllowed("", "/sitemap.xml")).toBe(true);
  });

  it("blocks a path matched by Disallow: /", () => {
    const robots = "User-agent: *\nDisallow: /";
    expect(parser.isAllowed(robots, "/sitemap.xml")).toBe(false);
  });

  it("allows a sub-path explicitly re-allowed with a longer Allow prefix", () => {
    const robots = "User-agent: *\nDisallow: /\nAllow: /sitemap.xml";
    expect(parser.isAllowed(robots, "/sitemap.xml")).toBe(true);
    expect(parser.isAllowed(robots, "/private")).toBe(false);
  });

  it("defaults to allowed when there is no User-agent: * block", () => {
    const robots = "User-agent: GoogleBot\nDisallow: /";
    expect(parser.isAllowed(robots, "/sitemap.xml")).toBe(true);
  });

  it("ignores comments and blank lines", () => {
    const robots = "# comment\n\nUser-agent: *\n\nDisallow: /admin\n";
    expect(parser.isAllowed(robots, "/sitemap.xml")).toBe(true);
    expect(parser.isAllowed(robots, "/admin/x")).toBe(false);
  });
});
