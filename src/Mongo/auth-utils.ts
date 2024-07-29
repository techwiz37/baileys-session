import type { AuthenticationCreds } from '../Types';
import { Curve, signedKeyPair } from './crypto';
import { generateRegistrationId } from './generics';
import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export const initAuthCreds = (): AuthenticationCreds => {
    const identityKey = Curve.generateKeyPair();
    return {
        noiseKey: Curve.generateKeyPair(),
        pairingEphemeralKeyPair: Curve.generateKeyPair(),
        signedIdentityKey: identityKey,
        signedPreKey: signedKeyPair(identityKey, 1),
        registrationId: generateRegistrationId(),
        advSecretKey: randomBytes(32).toString('base64'),
        processedHistoryMessages: [],
        nextPreKeyId: 1,
        firstUnuploadedPreKeyId: 1,
        accountSyncCounter: 0,
        accountSettings: {
            unarchiveChats: false
        },
        // mobile creds
        deviceId: Buffer.from(uuidv4().replace(/-/g, ''), 'hex').toString('base64url'),
        phoneId: uuidv4(),
        identityId: randomBytes(20),
        registered: false,
        backupToken: randomBytes(20),
        registration: {} as never,
        pairingCode: undefined,
        lastPropHash: undefined,
        routingInfo: undefined,
    };
};