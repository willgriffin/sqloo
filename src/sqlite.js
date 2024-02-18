import Database from "better-sqlite3";
import * as sqlite_vss from "sqlite-vss";
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * @typedef {Object} DatabaseOptions
 * @property {string=} file
 */

/**
 * @param {DatabaseOptions=} options
 * @returns {{a
 *   client: any,
 *   insert: (table: string, data: Object) => any,
 *   get: (table: string, where: Object) => any
 * }}
 */
export function getDatabase(options = {}) {
  const { file = ":memory:" } = options;

  const client = new Database(file);
  client.function("uuid_generate_v4", () => randomUUID());
  client.pragma("journal_mode = WAL");
  sqlite_vss.load(client);

  /**
   * Inserts data into a table and returns the inserted rows.
   * @param {string} table - The name of the table.
   * @param {Object | Object[]} data - The data to insert.
   * @returns {Promise<Object | Object[]>} The inserted rows, return type will match data
   */
  const insert = async (table, data) => {
    let query;
    let values;
    if (Array.isArray(data)) {
      const keys = Object.keys(data[0]);
      const placeholders = data
        .map(() => `(${keys.map(() => "?").join(", ")})`)
        .join(", ");
      query = `INSERT INTO ${table} (${keys.join(
        ", "
      )}) VALUES ${placeholders}`;
      values = data.reduce((acc, row) => acc.concat(Object.values(row)), []);
    } else {
      const keys = Object.keys(data);
      const placeholders = keys.map(() => "?").join(", ");
      query = `INSERT INTO ${table} (${keys.join(
        ", "
      )}) VALUES (${placeholders})`;
      values = Object.values(data);
    }

    const statement = await client.prepare(query);
    const result = await statement.run(...values);
    return { operation: "insert", affected: result.changes };
  };

  /**
   * Fetches a single row from a table that matches the provided conditions.
   * @param {string} table - The name of the table.
   * @param {Object} where - An object representing the conditions.
   * @returns {Promise<Object>} The fetched row.
   */
  const get = async (table, where) => {
    const keys = Object.keys(where);
    const values = Object.values(where);
    const whereClause = keys.map((key) => `${key} = ?`).join(" and ");
    const query = `select * from ${table} where ${whereClause}`;
    return client.prepare(query).get(...values);
  };

  /**
   * Fetches all rows from a table that match the provided conditions.
   * @param {string} table - The name of the table.
   * @param {Object} where - An object representing the conditions.
   * @returns {Promise<Object[]>} The fetched rows.
   */
  const list = async (table, where) => {
    const keys = Object.keys(where);
    const values = Object.values(where);
    const whereClause = keys.map((key) => `${key} = ?`).join(" and ");
    const query = `select * from ${table} where ${whereClause}`;
    return client.prepare(query).all(...values);
  };

  /**
   * Updates rows in a table that match the provided conditions.
   * @param {string} table - The name of the table.
   * @param {Object} where - An object representing the conditions.
   * @param {Object} data - An object representing the new data.
   * @returns {Promise<void>} No return value.
   */
  const update = async (table, where, data) => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => `${key} = ?`).join(", ");
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys
      .map((key, index) => `${key} = ?`)
      .join(" AND ");

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const result = await client.prepare(sql).run([...values, ...whereValues]);

    return { operation: "update", affected: result.changes };
  };

  /**
   * Returns an object with methods to interact with a specific table.
   * @param {string} table - The name of the table.
   * @returns {Object} An object with methods to interact with the table.
   */
  const table = (table) => {
    const insert = (data) => insert(table, data);
    const get = (data) => get(table, data);
    const list = (data) => list(table, data);
    return { insert, get, list };
  };

  /**
   * Parses a SQL template string into a SQL query and an array of values.
   * @param {TemplateStringsArray} strings - The template strings.
   * @param {...any} vars - The template variables.
   * @returns {Object} An object with the SQL query and the array of values.
   */
  const parseTemplate = (strings, ...vars) => {
    let sql = strings[0];
    const values = [];
    for (let i = 0; i < vars.length; i++) {
      values.push(vars[i]);
      sql += "?" + strings[i + 1];
    }
    return { sql, values };
  };

  /**
   * Executes a SQL query and returns the first column of the first row.
   * @param {TemplateStringsArray} strings - The template strings.
   * @param {...any} vars - The template variables.
   * @returns {Promise<any>} The first column of the first row.
   */
  const pluck = async (strings, ...vars) => {
    const { sql, values } = parseTemplate(strings, ...vars);
    return client.prepare(sql).pluck().get(values);
  };

  /**
   * Executes a SQL query and returns the first row.
   * @param {TemplateStringsArray} strings - The template strings.
   * @param {...any} vars - The template variables.
   * @returns {Promise<Object>} The first row.
   */
  const single = async (strings, ...vars) => {
    const { sql, values } = parseTemplate(strings, ...vars);
    return client.prepare(sql).get(values);
  };

  /**
   * Executes a SQL query and returns all rows.
   * @param {TemplateStringsArray} strings - The template strings.
   * @param {...any} vars - The template variables.
   * @returns {Promise<Object[]>} All rows.
   */
  const many = async (strings, ...vars) => {
    const { sql, values } = parseTemplate(strings, ...vars);
    return client.prepare(sql).all(values);
  };

  /**
   * Executes a SQL query and does not return any rows.
   * @param {TemplateStringsArray} strings - The template strings.
   * @param {...any} vars - The template variables.
   * @returns {Promise<void>} No return value.
   */
  const execute = async (strings, ...vars) => {
    const { sql, values } = parseTemplate(strings, ...vars);
    return client.prepare(sql).run(values);
  };

  // cute aliases
  const oo = many;
  const oO = single;
  const ox = pluck;
  const xx = execute;

  return {
    client,
    insert,
    update,
    get,
    list,
    table,
    many,
    single,
    pluck,
    execute,
    oo,
    oO,
    ox,
    xx,
  };
}
