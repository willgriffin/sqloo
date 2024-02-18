import { it, expect, describe, beforeEach, afterEach } from "vitest";
import { randomUUID } from "crypto";
import { getDatabase } from "./index.js";
describe("sqlite tests", () => {
  let db;
  beforeEach(async () => {
    db = await getDatabase();
    await db.execute`
      create table contents (
        id uuid primary key not null default (uuid_generate_v4()),
        title text, 
        body text
      )
    `;
  });

  afterEach(async () => {
    await db.execute`
      drop table contents
    `;
  });

  it("should be able to perform a statement", async () => {
    const result = await db.many`
      select * from contents
    `;
    expect(result).toEqual([]);
  });

  it("should be able to insert data", async () => {
    const data = {
      title: "hello",
      body: "world",
    };
    const inserted = await db.insert("contents", data);
    expect(inserted).toBeDefined();
  });

  it("should be able to query data with a condition", async () => {
    const data = {
      id: randomUUID(),
      title: "hello",
      body: "world",
    };
    await db.insert("contents", data);
    const result = await db.single`
      select * from contents where id = ${data.id}
    `;
    expect(result).toEqual({
      id: data.id,
      title: data.title,
      body: data.body,
    });
  });

  it("should be able to update a row", async () => {
    const data = {
      id: randomUUID(),
      title: "hello",
      body: "world",
    };
    await db.insert("contents", data);
    await db.update(
      "contents",
      { id: data.id },
      { title: "hi", body: "universe" }
    );
    const result = await db.single`
      select * from contents where id = ${data.id}
    `;
    expect(result).toEqual({ id: data.id, title: "hi", body: "universe" });
  });
});
