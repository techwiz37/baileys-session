"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSqlAuthState = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const Utils_1 = require("../Utils");
// Create MySQL connection pool for better performance
const createConnectionPool = (config) => {
    return promise_1.default.createPool({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
};
const useSqlAuthState = async (config) => {
    const { host, user, password, database, tableName, session } = config;
    const pool = createConnectionPool({ host, user, password, database });
    const table = tableName !== null && tableName !== void 0 ? tableName : 'amiruldev_auth';
    const sessionName = session !== null && session !== void 0 ? session : `session_`;
    // Create table if it doesn't exist
    const createTable = async () => {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS \`${table}\` (
                id VARCHAR(255) PRIMARY KEY,
                value JSON,
                session VARCHAR(255),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
    };
    // Delete sessions older than 1 day
    const deleteOldSessions = async () => {
        await pool.execute(`
            DELETE FROM \`${table}\` 
            WHERE session = ? AND timestamp < NOW() - INTERVAL 1 DAY
        `, [sessionName]);
    };
    // Remove unused tables (if any)
    const removeUnusedTables = async () => {
        const [rows] = await pool.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ? AND table_name != ?`, [database, table]);
        const unusedTables = rows.filter((row) => !row.table_name.startsWith('session_'));
        for (const { table_name } of unusedTables) {
            await pool.execute(`DROP TABLE IF EXISTS \`${table_name}\``);
        }
    };
    // Ensure creds entry exists
    const ensureSession = async () => {
        const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE id = 'creds'`);
        if (rows.length === 0) {
            await pool.execute(`INSERT INTO \`${table}\` (id, value, session) VALUES ('creds', ?, ?)`, [JSON.stringify((0, Utils_1.initAuthCreds)(), Utils_1.BufferJSON.replacer), sessionName]);
        }
    };
    // Initialize the database
    await createTable();
    await deleteOldSessions();
    await removeUnusedTables();
    await ensureSession();
    const query = async (tableName, docId) => {
        const [rows] = await pool.execute(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [`${sessionName}-${docId}`]);
        return rows.length > 0 ? rows[0] : null;
    };
    const readData = async (id) => {
        const data = await query(table, id);
        if (!data || !data.value) {
            return null;
        }
        const creds = typeof data.value === 'string' ? data.value : JSON.stringify(data.value);
        return JSON.parse(creds, Utils_1.BufferJSON.reviver);
    };
    const writeData = async (id, value) => {
        const valueFixed = JSON.stringify(value, Utils_1.BufferJSON.replacer);
        await pool.execute(`INSERT INTO \`${table}\` (id, value, session) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), timestamp = CURRENT_TIMESTAMP`, [`${sessionName}-${id}`, valueFixed, sessionName]);
    };
    const removeData = async (id) => {
        await pool.execute(`DELETE FROM \`${table}\` WHERE id = ?`, [`${sessionName}-${id}`]);
    };
    const clearAll = async () => {
        await pool.execute(`DELETE FROM \`${table}\` WHERE session = ? AND id != 'creds'`, [sessionName]);
    };
    const removeAll = async () => {
        await pool.execute(`DELETE FROM \`${table}\` WHERE session = ?`, [sessionName]);
    };
    const creds = (await readData('creds')) || (0, Utils_1.initAuthCreds)();
    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        let value = await readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = (0, Utils_1.fromObject)(value);
                        }
                        data[id] = value;
                    }
                    return data;
                },
                set: async (data) => {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const name = `${category}-${id}`;
                            if (value) {
                                await writeData(name, value);
                            }
                            else {
                                await removeData(name);
                            }
                        }
                    }
                }
            }
        },
        saveCreds: async () => {
            await writeData('creds', creds);
        },
        clear: async () => {
            await clearAll();
        },
        removeCreds: async () => {
            await removeAll();
        },
        query: async (tableName, docId) => {
            return await query(tableName, docId);
        }
    };
};
exports.useSqlAuthState = useSqlAuthState;
