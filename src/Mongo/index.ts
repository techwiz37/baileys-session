import mongoose from "mongoose";
import AsyncLock from "async-lock";
import {
    AuthenticationCreds,
    AuthenticationState,
    SignalDataTypeMap
} from "../Types";
import { fromObject } from "../Utils";
import { initAuthCreds } from "./auth-utils";

const fileLock = new AsyncLock({ maxPending: Infinity });

const sessionSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    value: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, expires: "1h", default: Date.now } // TTL index 1 hours
});

const Session = mongoose.model("Session", sessionSchema);

// Helper to serialize Buffer to a base64 string
const serialize = (data: any): any => {
    if (Buffer.isBuffer(data)) {
        return `Buffer:${data.toString('base64')}`;
    } else if (Array.isArray(data)) {
        return data.map(item => serialize(item));
    } else if (typeof data === 'object' && data !== null) {
        const result: any = {};
        for (const [key, value] of Object.entries(data)) {
            result[key] = serialize(value);
        }
        return result;
    }
    return data;
};

// Helper to deserialize base64 string to Buffer
const deserialize = (data: any): any => {
    if (typeof data === 'string' && data.startsWith('Buffer:')) {
        return Buffer.from(data.slice(7), 'base64');
    } else if (Array.isArray(data)) {
        return data.map(item => deserialize(item));
    } else if (typeof data === 'object' && data !== null) {
        const result: any = {};
        for (const [key, value] of Object.entries(data)) {
            result[key] = deserialize(value);
        }
        return result;
    }
    return data;
};

export const useMongoAuthState = async (
    mongoURI: string
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
    await mongoose.connect(mongoURI, {
      
    });

    const writeData = (data: any, file: string) => {
        const id = file.replace(/\//g, "__").replace(/:/g, "-");
        return fileLock.acquire(id, () =>
            Session.updateOne(
                { _id: id },
                { value: serialize(data), createdAt: new Date() },
                { upsert: true }
            )
        );
    };

    const readData = async (file: string) => {
        try {
            const id = file.replace(/\//g, "__").replace(/:/g, "-");
            const doc = await fileLock.acquire(id, () =>
                Session.findById(id).exec()
            );
            return doc ? deserialize(doc.value) : null;
        } catch (error) {
            console.error(`Error reading data from ${file}:`, error);
            return null;
        }
    };

    const removeData = async (file: string) => {
        try {
            const id = file.replace(/\//g, "__").replace(/:/g, "-");
            await fileLock.acquire(id, () =>
                Session.deleteOne({ _id: id }).exec()
            );
        } catch (error) {
            console.error(`Error removing data for ${file}:`, error);
        }
    };

    const creds: AuthenticationCreds =
        (await readData("creds")) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data: {
                        [_: string]: SignalDataTypeMap[typeof type];
                    } = {};
                    await Promise.all(
                        ids.map(async id => {
                            let value = await readData(`${type}-${id}`);
                            if (type === "app-state-sync-key" && value) {
                                value = fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async data => {
                    const tasks: Promise<void>[] = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const file = `${category}-${id}`;
                            tasks.push(
                                value
                                    ? writeData(value, file)
                                    : removeData(file)
                            );
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, "creds");
        }
    };
};