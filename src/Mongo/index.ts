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
    createdAt: { type: Date, expires: "5m", default: Date.now } // TTL index 5 minutes
});

const Session = mongoose.model("Session", sessionSchema);

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
                { value: data, createdAt: new Date() },
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
            return doc ? doc.value : null;
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
                            // No need to convert Buffer or base64, just assign value directly
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