import { describe, expect, it } from "vitest";
import { connectorRelations, routeConnector, segmentCrossesBox, type ConnectorBox } from "./mytosis-connectors";

describe("Mytosis connectors", () => {
  it("liga 1.1 a 1.2 com uma única linha reta quando as alturas são diferentes", () => {
    const a = { id: "1.1", left: 0, right: 240, top: 0, bottom: 122 };
    const b = { id: "1.2", left: 272, right: 512, top: 0, bottom: 110 };
    const route = routeConnector(a, b, [a, b]);
    expect(route?.points).toEqual([{ x: 240, y: 61 }, { x: 272, y: 55 }]);
  });
  it("uma ligação reta diagonal não atravessa obstáculos", () => {
    const a = { id: "a", left: 0, right: 100, top: 0, bottom: 100 };
    const b = { id: "b", left: 300, right: 400, top: 40, bottom: 140 };
    const obstacle = { id: "middle", left: 150, right: 250, top: 30, bottom: 110 };
    const route = routeConnector(a, b, [a, b, obstacle]);
    expect(route).not.toBeNull();
    expect(route?.points.length).toBeGreaterThan(2);
    if (route) for (let i = 1; i < route.points.length; i++) expect(segmentCrossesBox(route.points[i - 1], route.points[i], obstacle)).toBe(false);
  });
  it("box 1.4 sem predecessor não recebe ligação automática do box 1 no fluxograma", () => {
    const nodes = [{ id: "1", parent_id: null }, { id: "1.2", parent_id: "1" }, { id: "1.4", parent_id: "1" }];
    expect(connectorRelations(nodes, [], true)).toEqual([]);
    expect(connectorRelations(nodes, [], false)).toHaveLength(2);
  });
  it("mantém somente a dependência cadastrada de 1.2.3 para 1.2.4", () => {
    const link = { predecessor_id: "1.2.3", successor_id: "1.2.4" };
    expect(connectorRelations([{ id: "1.2.4", parent_id: "1" }], [link], true)).toEqual([{ from: "1.2.3", to: "1.2.4", link }]);
  });
  it.each([false, true])("contorna Contato sem atravessar nenhum box, invertido=%s", (reverse) => {
    const root: ConnectorBox = { id: "root", left: 40, right: 280, top: 10, bottom: 106 };
    const contact: ConnectorBox = { id: "contact", left: 40, right: 280, top: 140, bottom: 236 };
    const call: ConnectorBox = { id: "call", left: 40, right: 280, top: 270, bottom: 366 };
    const boxes = [root, contact, call];
    const route = routeConnector(reverse ? call : root, reverse ? root : call, boxes);
    expect(route).not.toBeNull();
    if (!route) return;
    for (let i = 1; i < route.points.length; i++) for (const box of boxes) expect(segmentCrossesBox(route.points[i - 1], route.points[i], box)).toBe(false);
  });
  it("contorna também obstáculos entre boxes horizontais", () => {
    const boxes = [{ id: "a", left: 0, right: 100, top: 20, bottom: 100 }, { id: "block", left: 150, right: 250, top: 0, bottom: 120 }, { id: "b", left: 300, right: 400, top: 20, bottom: 100 }];
    const route = routeConnector(boxes[0], boxes[2], boxes);
    expect(route).not.toBeNull();
    if (!route) return;
    for (let i = 1; i < route.points.length; i++) for (const box of boxes) expect(segmentCrossesBox(route.points[i - 1], route.points[i], box)).toBe(false);
  });
});