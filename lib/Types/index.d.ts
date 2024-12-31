/// <reference types="node" />
/// <reference types="node" />
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
        [indexMacBase64: string]: {
            valueMac: Uint8Array | Buffer;
        };
    };
};
export type SignalCreds = {
    readonly signedIdentityKey: KeyPair;
    readonly signedPreKey: SignedKeyPair;
    readonly registrationId: number;
};
export type AccountSettings = {
    unarchiveChats: boolean;
    defaultDisappearingMode?: Pick<any, 'ephemeralExpiration' | 'ephemeralSettingTimestamp'>;
};
export type SignalKeyStore = {
    get<T extends keyof SignalDataTypeMap>(type: T, ids: string[]): Awaitable<{
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
    method?: 'sms' | 'voice' | 'captcha';
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
    session: Uint8Array;
    'pre-key': KeyPair;
    'sender-key': Uint8Array;
    'app-state-sync-key': AppDataSync;
    'app-state-sync-version': LTHashState;
    'sender-key-memory': {
        [jid: string]: boolean;
    };
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
export interface mysqlData {
    id: string;
    value?: object[];
    session: string;
}
export type mysqlConfig = {
    /** Name of the MySQL table. (Default: auth) */
    tableName?: string;
    /** Retry the query at each interval if it fails. (Default: 200ms) */
    retryRequestDelayMs?: number;
    /** Maximum attempts if the query fails. (Default: 10) */
    maxRetries?: number;
    /** Session name to identify the connection, allowing multisessions with MySQL. */
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
    account?: Account;
    signalIdentities?: SignalIdentity[];
    myAppStateKeyId?: string;
    firstUnuploadedPreKeyId: number;
    nextPreKeyId: number;
    lastAccountSyncTimestamp?: number;
    platform?: string;
    processedHistoryMessages: Pick<any, 'key' | 'messageTimestamp'>[];
    accountSyncCounter: number;
    accountSettings: AccountSettings;
    deviceId: string;
    phoneId: string;
    identityId: Buffer;
    registered: boolean;
    backupToken: Buffer;
    registration: RegistrationOptions;
    pairingCode?: string;
    lastPropHash?: string;
    routingInfo?: Buffer;
};
export {};
