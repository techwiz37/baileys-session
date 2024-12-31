import mysql from 'mysql2/promise';
import { BufferJSON, initAuthCreds, fromObject } from '../Utils';
import {
    mysqlConfig,
    mysqlData,
    AuthenticationCreds,
    AuthenticationState,
    SignalDataTypeMap
} from '../Types';

const createConnectionPool = (config) => {
    return mysql.createPool({
        host: config.host,
        user: config.user,
        password: config.password,
        database: config.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
};

export const useSqlAuthState = async (config) => {
    const { host, user, password, database, tableName, session } = config;
    const pool = createConnectionPool({ host, user, password, database });

    const table = tableName ?? 'amiruldev_auth';
    const sessionName = session ?? `session_`;

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

    const deleteOldSessions = async () => {
        await pool.execute(`
            DELETE FROM \`${table}\` 
            WHERE session = ? AND timestamp < NOW() - INTERVAL 1 DAY
        `, [sessionName]);
    };

    const removeUnusedTables = async () => {
        const [rows] = await pool.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ? AND table_name != ?`,
            [database, table]
        );
        const unusedTables = rows.filter((row) => !row.table_name.startsWith('session_'));
        for (const { table_name } of unusedTables) {
            await pool.execute(`DROP TABLE IF EXISTS \`${table_name}\``);
        }
    };

    const ensureSession = async () => {
        const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE id = 'creds'`);
        if (rows.length === 0) {
            await pool.execute(`INSERT INTO \`${table}\` (id, value, session) VALUES ('creds', ?, ?)`, [JSON.stringify(initAuthCreds(), BufferJSON.replacer), sessionName]);
        }
    };

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
        return JSON.parse(creds, BufferJSON.reviver);
    };

    const writeData = async (id, value) => {
        const valueFixed = JSON.stringify(value, BufferJSON.replacer);
        await pool.execute(
            `INSERT INTO \`${table}\` (id, value, session) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value), timestamp = CURRENT_TIMESTAMP`,
            [`${sessionName}-${id}`, valueFixed, sessionName]
        );
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

    const creds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        let value = await readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = fromObject(value);
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
                            } else {
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
