/**
 * @typedef {Object} DatabaseOptions
 * @property {("postgres"|"sqlite")=} type
 * @property {string=} file
 * @property {string=} host
 * @property {number=} port
 * @property {string=} username
 * @property {string=} password
 * @property {string=} database
 */

/**
 * @param {DatabaseOptions=} options
 * @returns {Promise<any>}
 */
export async function getDatabase(options = {}) {
  const type = options.type || options.host ? "postgres" : "sqlite";
  if (type === "sqlite") {
    const sqlite = await import("./sqlite");
    return sqlite.getDatabase(options);
  } else {
    const postgres = await import("./postgres");
    return postgres.getDatabase(options);
  }
}

export default { getDatabase };
