import mysql from 'mysql2/promise';
import { BufferJSON, initAuthCreds, fromObject } from '../Utils';
import {
    mysqlConfig,
    mysqlData,
    AuthenticationCreds,
    AuthenticationState,
    SignalDataTypeMap
} from '../Types';

export const useSqlAuthState = async (config: {
    host: string,
    user: string,
    password: string,
    database: string,
    tableName?: string,
    session?: string
}): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    clear: () => Promise<void>;
    removeCreds: () => Promise<void>;
    query: (tableName: string, docId: string) => Promise<mysqlData | null>;
}> => {
    const { host, user, password, database, tableName, session } = config;
    const connection = await mysql.createConnection({ host, user, password, database });

    const table = tableName ?? 'amiruldev_auth';
    const sessionName = session ?? `session_${Date.now()}`;

    // logic auto create table
    await connection.execute(`
        CREATE TABLE IF NOT EXISTS \`${table}\` (
            id VARCHAR(255) PRIMARY KEY,
            value JSON,
            session VARCHAR(255)
        )
    `);
    
    const ensureSession = async () => {
        const [rows]: any = await connection.execute(`SELECT DISTINCT session FROM \`${table}\``);
        if (rows.length === 0) {
            await connection.execute(`INSERT INTO \`${table}\` (id, session) VALUES ('creds', ?)`, [sessionName]);
        }
    };
    
    await ensureSession();

    const query = async (tableName: string, docId: string): Promise<mysqlData | null> => {
        const [rows]: any = await connection.execute(`SELECT * FROM \`${tableName}\` WHERE id = ?`, [`${sessionName}-${docId}`]);
        return rows.length > 0 ? rows[0] : null;
    };

    const readData = async (id: string) => {
        const data = await query(table, id);
        if (!data || !data.value) {
            return null;
        }
        const creds = typeof data.value === 'object' ? JSON.stringify(data.value) : data.value;
        return JSON.parse(creds, BufferJSON.reviver);
    };

    const writeData = async (id: string, value: object) => {
        const valueFixed = JSON.stringify(value, BufferJSON.replacer);
        await connection.execute(
            `INSERT INTO \`${table}\` (id, value, session) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)`,
            [`${sessionName}-${id}`, valueFixed, sessionName]
        );
    };

    const removeData = async (id: string) => {
        await connection.execute(`DELETE FROM \`${table}\` WHERE id = ?`, [`${sessionName}-${id}`]);
    };

    const clearAll = async () => {
        await connection.execute(`DELETE FROM \`${table}\` WHERE session = ? AND id != 'creds'`, [sessionName]);
    };

    const removeAll = async () => {
        await connection.execute(`DELETE FROM \`${table}\` WHERE session = ?`, [sessionName]);
    };

    const creds: AuthenticationCreds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data: {
                        [id: string]: SignalDataTypeMap[typeof type];
                    } = {};
                    for (const id of ids) {
                        let value = await readData(`${type}-${id}`);
                        if (type === 'app-state-sync-key' && value) {
                            value = fromObject(value);
                        }
                        data[id] = value;
                    }
                    return data;
                },
                set: async data => {
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
        query: async (tableName: string, docId: string) => {
            return await query(tableName, docId);
        }
    };
};
