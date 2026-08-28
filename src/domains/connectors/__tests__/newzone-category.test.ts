import { isStrategicCategory } from "../crawler/newzone/category-mapper";

describe("NewZone isStrategicCategory — auto-discovery de categorias", () => {
  it("reconhece categorias estratégicas (eletrônicos/Apple/games/computing)", () => {
    expect(isStrategicCategory("TELEFONIA")).toBe(true);
    expect(isStrategicCategory("APPLE")).toBe(true);
    expect(isStrategicCategory("ELECTRONICA")).toBe(true);
    expect(isStrategicCategory("INFORMATICA")).toBe(true);
    expect(isStrategicCategory("GAMES")).toBe(true);
    expect(isStrategicCategory("AURICULARES")).toBe(true);
    expect(isStrategicCategory("CAMARAS Y FILMADORAS")).toBe(true);
    expect(isStrategicCategory("RELOJERIA")).toBe(true);
  });
  it("não reconhece categorias não-relevantes", () => {
    expect(isStrategicCategory("HOGAR, MUEBLES Y JARDIN")).toBe(false);
    expect(isStrategicCategory("TERMOS Y VASOS")).toBe(false);
    expect(isStrategicCategory("PERFUMERIA")).toBe(false);
  });
});
