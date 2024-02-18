import { Pool } from "pg";

/**
 * @typedef {Object} DatabaseOptions
 * @property {string=} connectionString
 */

/**
 * @param {DatabaseOptions=} options
 * @returns {{
 *   client: PoolClient,
 *   insert: (table: string, data: Object) => any,
 *   get: (table: string, where: Object) => any
 * }}
 */
export function getDatabase(options) {
  const {
    database = process.env.SQLOO_DATABASE,
    host = process.env.SQLOO_HOST || "localhost",
    user = process.env.SQLOO_USER,
    password = process.env.SQLOO_PASSWORD,
    port = process.env.SQLOO_PORT || "5432",
  } = options;

  const client = new Pool({
    host,
    user,
    password,
    port,
    database,
  });

  /**
   * Inserts data into a table and returns the inserted rows.
   * @param {string} table - The name of the table.
   * @param {Object | Object[]} data - The data to insert.
   * @returns {Promise<Object | Object[]>} The inserted rows, return type will match data
   */
  const insert = async (table, data) => {
    // If data is an array, we need to handle multiple rows
    if (Array.isArray(data)) {
      const keys = Object.keys(data[0]);
      const placeholders = data
        .map(
          (_, i) =>
            `(${keys.map((_, j) => `$${i * keys.length + j + 1}`).join(", ")})`
        )
        .join(", ");
      const query = `INSERT INTO ${table} (${keys.join(
        ", "
      )}) VALUES ${placeholders}`;
      const values = data.reduce(
        (acc, row) => acc.concat(Object.values(row)),
        []
      );
      const result = await client.query(query, values);
      return { operation: "insert", affected: result.rowCount };
    } else {
      // If data is an object, we handle a single row
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
      const query = `INSERT INTO ${table} (${keys.join(
        ", "
      )}) VALUES (${placeholders})`;
      const result = await client.query(query, values);
      return { operation: "insert", affected: result.rowCount };
    }
  };

  /**
   * Retrieves a row from a table based on a where clause.
   * @param {string} table - The name of the table.
   * @param {Object} where - The where clause.
   * @returns {Promise<Object>} The retrieved row.
   */
  const get = async (table, where) => {
    const keys = Object.keys(where);
    const values = Object.values(where);
    const whereClause = keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(" AND ");
    const query = `SELECT * FROM ${table} WHERE ${whereClause}`;
    return client.query(query, values);
  };

  /**
   * Retrieves multiple rows from a table based on a where clause.
   * @param {string} table - The name of the table.
   * @param {Object} where - The where clause.
   * @returns {Promise<Array>} The retrieved rows.
   */
  const list = async (table, where) => {
    const keys = Object.keys(where);
    const values = Object.values(where);
    const whereClause = keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(" AND ");
    const query = `SELECT * FROM ${table} WHERE ${whereClause}`;
    return client.query(query, values);
  };

  /**
   * Updates rows in a table based on a where clause and returns the updated rows.
   * @param {string} table - The name of the table.
   * @param {Object} where - The where clause.
   * @param {Object} data - The data to update.
   * @returns {Promise<Object>} The updated rows.
   */
  const update = async (table, where, data) => {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys
      .map((key, i) => `${key} = $${i + 1 + values.length}`)
      .join(" AND ");

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const result = await client.query(sql, [...values, ...whereValues]);
    return { operation: "update", affected: result.rowCount };
  };

  /**
   * Returns an object with insert, get, and list methods for a specific table.
   * @param {string} table - The name of the table.
   * @returns {Object} An object with insert, get, and list methods.
   */
  const table = (table) => {
    const insert = (data) => insert(table, data);
    const get = (data) => get(table, data);
    const list = (data) => list(table, data);
    return { insert, get, list };
  };

  /**
   * Parses a SQL template into a SQL string and an array of values.
   * @param {Array} strings - The strings in the SQL template.
   * @param {...any} vars - The variables in the SQL template.
   * @returns {Object} An object with a sql property and a values property.
   */
  const parseTemplate = (strings, ...vars) => {
    let sql = strings[0];
    const values = [];
    for (let i = 0; i < vars.length; i++) {
      values.push(vars[i]);
      sql += "$" + (i + 1) + strings[i + 1];
    }
    return { sql, values };
  };
  /**
   * Executes a SQL query and returns the first column of the first row.
   * @param {TemplateStringsArray} strings - The strings in the SQL template.
   * @param {...any} vars - The variables in the SQL template.
   * @returns {Promise<any>} The first column of the first row.
   */
  const pluck = async (strings, ...vars) => {
    const { sql, values } = parseTemplate(strings, ...vars);
    const result = await client.query(sql, values);
    return result.rows[0][0];
  };

  /**
   * Executes a SQL query and returns the first row.
   * @param {TemplateStringsArray} strings - The strings in the SQL template.
   * @param {...any} vars - The variables in the SQL template.
   * @returns {Promise<Object>} The first row.
   */
  const single = async (strings, ...vars) => {
    const { sql, values } = parseTemplate(strings, ...vars);
    const result = await client.query(sql, values);
    return result.rows[0];
  };

  /**
   * Executes a SQL query and returns all rows.
   * @param {TemplateStringsArray} strings - The strings in the SQL template.
   * @param {...any} vars - The variables in the SQL template.
   * @returns {Promise<Array>} All rows.
   */
  const many = async (strings, ...vars) => {
    const { sql, values } = parseTemplate(strings, ...vars);
    const { rows } = await client.query(sql, values);
    return rows;
  };

  /**
   * Executes a SQL query.
   * @param {TemplateStringsArray} strings - The strings in the SQL template.
   * @param {...any} vars - The variables in the SQL template.
   * @returns {Promise<pg.QueryResult>} The result of the query.
   */
  const execute = async (strings, ...vars) => {
    const { sql, values } = parseTemplate(strings, ...vars);
    return client.query(sql, values);
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
