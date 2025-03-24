import * as admin from "firebase-admin";
import { BufferJSON, initAuthCreds, fromObject } from "../Utils";
import {
    fireConfig,
    fireData,
    AuthenticationCreds,
    AuthenticationState,
    SignalDataTypeMap
} from "../Types";

admin.initializeApp(
    {
        credential: admin.credential.cert("fireSession.json")
    },
    "sessionDb"
);

const db = admin.firestore(admin.app("sessionDb"));

export const useFireAuthState = async (
    config: fireConfig
): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
    clear: () => Promise<void>;
    removeCreds: () => Promise<void>;
    query: (collection: string, docId: string) => Promise<fireData>;
}> => {
    const collectionName = config.tableName || "amiruldev-auth";
    const session = config.session || "amiruldev-waAuth";

    const query = async (
        collection: string,
        docId: string
    ): Promise<fireData> => {
        const doc = await db.collection(collection).doc(docId).get();
        if (doc.exists) {
            return doc.data() as fireData;
        }
        return {} as fireData;
    };

    const readData = async (id: string) => {
        const data = await query(collectionName, `${session}-${id}`);
        if (!data.value) {
            return null;
        }
        const creds =
            typeof data.value === "object"
                ? JSON.stringify(data.value)
                : data.value;
        return JSON.parse(creds, BufferJSON.reviver);
    };

    const writeData = async (id: string, value: object) => {
        const batch = db.batch();
        const valueFixed = JSON.stringify(value, BufferJSON.replacer);
        const docRef = db.collection(collectionName).doc(`${session}-${id}`);
        batch.set(docRef, { value: valueFixed }, { merge: true });

        try {
            await batch.commit();
        } catch (error) {
            console.error("Error writing batch:", error);
        }
    };

    const removeData = async (id: string) => {
        await db.collection(collectionName).doc(`${session}-${id}`).delete();
    };

    const clearAll = async () => {
        const snapshot = await db.collection(collectionName).get();
        snapshot.forEach(doc => {
            if (doc.id.startsWith(`${session}-`) && doc.id !== `${session}-creds`) {
                doc.ref.delete();
            }
        });
    };

    const removeAll = async () => {
        const snapshot = await db.collection(collectionName).get();
        snapshot.forEach(doc => {
            if (doc.id.startsWith(`${session}-`)) {
                doc.ref.delete();
            }
        });
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
        clear: async () => {
            await clearAll();
        },
        removeCreds: async () => {
            await removeAll();
        },
        query: async (collection: string, docId: string) => {
            return await query(collection, docId);
        }
    };
};
