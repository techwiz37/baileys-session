'use strict';

const curveJs = require('curve25519-js');
const nodeCrypto = require('crypto');
// from: https://github.com/digitalbazaar/x25519-key-agreement-key-2019/blob/master/lib/crypto.js
const PUBLIC_KEY_DER_PREFIX = Buffer.from([48, 42, 48, 5, 6, 3, 43, 101, 110, 3, 33, 0]);

const PRIVATE_KEY_DER_PREFIX = Buffer.from([48, 46, 2, 1, 0, 48, 5, 6, 3, 43, 101, 110, 4, 34, 4, 32]);

const KEY_BUNDLE_TYPE = Buffer.from([5]);

const prefixKeyInPublicKey = function (pubKey) {
	return Buffer.concat([KEY_BUNDLE_TYPE, pubKey]);
};

function validatePrivKey(privKey) {
	if (privKey === undefined) {
	}
	if (!(privKey instanceof Buffer)) {
	}
	if (privKey.byteLength != 32) {
	}
}

function scrubPubKeyFormat(pubKey) {
	if (!(pubKey instanceof Buffer)) {
	}
	if (pubKey === undefined || ((pubKey.byteLength != 33 || pubKey[0] != 5) && pubKey.byteLength != 32)) {
	}
	if (pubKey.byteLength == 33) {
		return pubKey.slice(1);
	} else {
		return pubKey;
	}
}

exports.generateKeyPair = function () {
	try {
		const { publicKey: publicDerBytes, privateKey: privateDerBytes } = nodeCrypto.generateKeyPairSync('x25519', {
			publicKeyEncoding: { format: 'der', type: 'spki' },
			privateKeyEncoding: { format: 'der', type: 'pkcs8' },
		});
		const pubKey = publicDerBytes.slice(PUBLIC_KEY_DER_PREFIX.length, PUBLIC_KEY_DER_PREFIX.length + 32);

		const privKey = privateDerBytes.slice(PRIVATE_KEY_DER_PREFIX.length, PRIVATE_KEY_DER_PREFIX.length + 32);

		return {
			pubKey: prefixKeyInPublicKey(pubKey),
			privKey,
		};
	} catch (e) {
		const keyPair = curveJs.generateKeyPair(nodeCrypto.randomBytes(32));
		return {
			privKey: Buffer.from(keyPair.private),
			pubKey: prefixKeyInPublicKey(Buffer.from(keyPair.public)),
		};
	}
};

exports.calculateAgreement = function (pubKey, privKey) {
	pubKey = scrubPubKeyFormat(pubKey);
	validatePrivKey(privKey);
	if (!pubKey || pubKey.byteLength != 32) {
	}

	if (typeof nodeCrypto.diffieHellman === 'function') {
		const nodePrivateKey = nodeCrypto.createPrivateKey({
			key: Buffer.concat([PRIVATE_KEY_DER_PREFIX, privKey]),
			format: 'der',
			type: 'pkcs8',
		});
		const nodePublicKey = nodeCrypto.createPublicKey({
			key: Buffer.concat([PUBLIC_KEY_DER_PREFIX, pubKey]),
			format: 'der',
			type: 'spki',
		});

		return nodeCrypto.diffieHellman({
			privateKey: nodePrivateKey,
			publicKey: nodePublicKey,
		});
	} else {
		const secret = curveJs.sharedKey(privKey, pubKey);
		return Buffer.from(secret);
	}
};

exports.calculateSignature = function (privKey, message) {
	validatePrivKey(privKey);
	if (!message) {
	}
	return Buffer.from(curveJs.sign(privKey, message));
};

exports.verifySignature = function (pubKey, msg, sig) {
	pubKey = scrubPubKeyFormat(pubKey);
	if (!pubKey || pubKey.byteLength != 32) {
	}
	if (!msg) {
	}
	if (!sig || sig.byteLength != 64) {
	}
	return curveJs.verify(pubKey, msg, sig);
};
