import { UNIVERSAL_TAXONOMY, flattenTree, findNodeByRealCategorySlug } from "../data/universal-tree";

describe("flattenTree", () => {
  it("includes every department and every nested child", () => {
    const flat = flattenTree();
    expect(flat.length).toBeGreaterThan(UNIVERSAL_TAXONOMY.length);
    expect(flat.some((n) => n.slug === "smartphones")).toBe(true);
    expect(flat.some((n) => n.slug === "processador")).toBe(true); // nested 2 levels under eletronicos > informatica
  });

  it("every slug is unique across the whole tree", () => {
    const flat = flattenTree();
    const slugs = flat.map((n) => n.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("findNodeByRealCategorySlug", () => {
  it("resolves a real category slug to its universal node", () => {
    const node = findNodeByRealCategorySlug("celulares");
    expect(node?.slug).toBe("smartphones");
  });

  it("resolves every member of a synonym cluster to the same node", () => {
    const a = findNodeByRealCategorySlug("celulares");
    const b = findNodeByRealCategorySlug("smartphones");
    const c = findNodeByRealCategorySlug("celulares-e-smartphones");
    expect(a?.slug).toBe(b?.slug);
    expect(b?.slug).toBe(c?.slug);
  });

  it("returns null for a category slug that isn't mapped", () => {
    expect(findNodeByRealCategorySlug("categoria-inexistente-xyz")).toBeNull();
  });

  it("resolves a parent/child pair (Perfume -> Perfume Masculino) to different nodes", () => {
    const parent = findNodeByRealCategorySlug("perfumes");
    const child = findNodeByRealCategorySlug("perfume-masculino");
    expect(parent?.slug).toBe("perfumes");
    expect(child?.slug).toBe("perfume-masculino");
    expect(parent?.slug).not.toBe(child?.slug);
  });
});
