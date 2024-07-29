import mongoose, { Document, Model, Schema } from "mongoose";

type Awaitable<T> = T | Promise<T>;

export type Contact = {
    id: string;
    lid?: string;
    name?: string;
    notify?: string;
    verifiedName?: string;
    imgUrl?: string | null;
    status?: string;
};

export type Account = {
    details?: Uint8Array | null;
    accountSignatureKey?: Uint8Array | null;
    accountSignature?: Uint8Array | null;
    deviceSignature?: Uint8Array | null;
};

export type SignedKeyPair = {
    keyPair: KeyPair;
    signature: Uint8Array;
    keyId: number;
    timestampS?: number;
};

export type ProtocolAddress = {
    name: string;
    deviceId: number;
};

export type SignalIdentity = {
    identifier: ProtocolAddress;
    identifierKey: Uint8Array;
};

export type LTHashState = {
    version: number;
    hash: Buffer;
    indexValueMap: {
        [indexMacBase64: string]: { valueMac: Uint8Array | Buffer };
    };
};

export type SignalCreds = {
    readonly signedIdentityKey: KeyPair;
    readonly signedPreKey: SignedKeyPair;
    readonly registrationId: number;
};

export type AccountSettings = {
    unarchiveChats: boolean;
    defaultDisappearingMode?: Pick<
        any,
        "ephemeralExpiration" | "ephemeralSettingTimestamp"
    >;
};

export type SignalKeyStore = {
    get<T extends keyof SignalDataTypeMap>(
        type: T,
        ids: string[]
    ): Awaitable<{
        [id: string]: SignalDataTypeMap[T];
    }>;
    set(data: SignalDataSet): Awaitable<void>;
    clear?(): Awaitable<void>;
};

export interface RegistrationOptions {
    phoneNumber?: string;
    phoneNumberCountryCode: string;
    phoneNumberNationalNumber: string;
    phoneNumberMobileCountryCode: string;
    phoneNumberMobileNetworkCode: string;
    method?: "sms" | "voice" | "captcha";
    captcha?: string;
}

export type SslOptions = {
    pfx?: string;
    key?: string | string[] | Buffer | Buffer[];
    passphrase?: string;
    cert?: string | string[] | Buffer | Buffer[];
    ca?: string | string[] | Buffer | Buffer[];
    crl?: string | string[];
    ciphers?: string;
    rejectUnauthorized?: boolean;
    minVersion?: string;
    maxVersion?: string;
    verifyIdentity?: boolean;
};

export type Fingerprint = {
    rawId: number;
    currentIndex: number;
    deviceIndexes: number[];
};

export type AppDataSync = {
    keyData: Uint8Array;
    fingerprint: Fingerprint;
    timestamp: number;
};

export type SignalDataTypeMap = {
    "pre-key": KeyPair;
    session: Uint8Array;
    "sender-key": Uint8Array;
    "sender-key-memory": { [jid: string]: boolean };
    "app-state-sync-key": proto.Message.IAppStateSyncKeyData;
    "app-state-sync-version": LTHashState;
};

export type SignalDataSet = {
    [T in keyof SignalDataTypeMap]?: {
        [id: string]: SignalDataTypeMap[T] | null;
    };
};

export type KeyPair = {
    public: Uint8Array;
    private: Uint8Array;
};

// MongoDB Document Interface
export interface mongoData extends Document {
    value?: object[];
}

// MongoDB Configuration
export type mongoConfig = {
    /** Name of the MongoDB collection. (Default: auth) */
    tableName?: string;
    /** Retry the query at each interval if it fails. (Default: 200ms) */
    retryRequestDelayMs?: number;
    /** Maximum attempts if the query fails. (Default: 10) */
    maxRetries?: number;
    /** Session name to identify the connection, allowing multisessions with MongoDB. */
    session: string;
};

export type ValueReplacer = {
    data: number[];
    type: string;
};

export type ValueReviver = {
    data: string;
    type: string;
};

export type AuthenticationState = {
    creds: AuthenticationCreds;
    keys: SignalKeyStore;
};

export type AuthenticationCreds = SignalCreds & {
    readonly noiseKey: KeyPair;
    readonly pairingEphemeralKeyPair: KeyPair;
    advSecretKey: string;

    me?: Contact;
    account?: proto.IADVSignedDeviceIdentity;
    signalIdentities?: SignalIdentity[];
    myAppStateKeyId?: string;
    firstUnuploadedPreKeyId: number;
    nextPreKeyId: number;

    lastAccountSyncTimestamp?: number;
    platform?: string;

    processedHistoryMessages: MinimalMessage[];
    /** number of times history & app state has been synced */
    accountSyncCounter: number;
    accountSettings: AccountSettings;
    // mobile creds
    deviceId: string;
    phoneId: string;
    identityId: Buffer;
    registered: boolean;
    backupToken: Buffer;
    registration: RegistrationOptions;
    pairingCode: string | undefined;
    lastPropHash: string | undefined;
    routingInfo: Buffer | undefined;
};
