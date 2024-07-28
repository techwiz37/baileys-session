import mongoose from "mongoose";
import { BufferJSON, initAuthCreds, fromObject } from "../Utils";
import {
    mongoConfig,
    mongoData,
    AuthenticationCreds,
    AuthenticationState,
    SignalDataTypeMap
} from "../Types";

const sessionSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    value: mongoose.Schema.Types.Mixed,
    session: { type: String, required: true },
    createdAt: { type: Date, expires: "1h", default: Date.now } // TTL INDEX
});

const Session = mongoose.model<mongoData>("Session", sessionSchema);

export const useMongoAuthState = async (
    mongoURI: string,
    config: mongoConfig
): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    clear: () => Promise<void>;
    removeCreds: () => Promise<void>;
    query: (collection: string, docId: string) => Promise<mongoData | null>;
}> => {
    await mongoose.connect(mongoURI);
    const collectionName = config.tableName ?? "amiruldev-auth";
    const session = config.session ?? "amiruldev-waAuth";

    const query = async (
        collection: string,
        docId: string
    ): Promise<mongoData | null> => {
        const doc = await Session.findById(`${session}-${docId}`);
        return doc ? (doc.toObject() as mongoData) : null;
    };

    const readData = async (id: string) => {
        const data = await query(collectionName, id);
        if (!data || !data.value) {
            return null;
        }
        const creds =
            typeof data.value === "object"
                ? JSON.stringify(data.value)
                : data.value;
        return JSON.parse(creds, BufferJSON.reviver);
    };

    const writeData = async (id: string, value: object) => {
        const valueFixed = JSON.stringify(value, BufferJSON.replacer);
        await Session.updateOne(
            { _id: `${session}-${id}` },
            { value: valueFixed, session, createdAt: new Date() },
            { upsert: true }
        );
    };

    const removeData = async (id: string) => {
        await Session.deleteOne({ _id: `${session}-${id}` });
    };
    
    const removeAll = async () => {
        await Session.deleteMany({ session });
    };

    const creds: AuthenticationCreds =
        (await readData("creds")) || initAuthCreds();

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
                        if (type === "app-state-sync-key" && value) {
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
            await writeData("creds", creds);
        },
        removeCreds: async () => {
            await removeAll();
        },
        query: async (collection: string, docId: string) => {
            return await query(collection, docId);
        }
    };
};
