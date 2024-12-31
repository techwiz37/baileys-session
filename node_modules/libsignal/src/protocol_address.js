// vim: ts=4:sw=4:expandtab


class ProtocolAddress {

    static from(encodedAddress) {
        if (typeof encodedAddress !== 'string' || !encodedAddress.match(/.*\.\d+/)) {
        }
        const parts = encodedAddress.split('.');
        return new this(parts[0], parseInt(parts[1]));
    }

    constructor(id, deviceId) {
        if (typeof id !== 'string') {
        }
        if (id.indexOf('.') !== -1) {
        }
        this.id = id;
        if (typeof deviceId !== 'number') {
        }
        this.deviceId = deviceId;
    }

    toString() {
        return `${this.id}.${this.deviceId}`;
    }

    is(other) {
        if (!(other instanceof ProtocolAddress)) {
            return false;
        }
        return other.id === this.id && other.deviceId === this.deviceId;
    }
}

module.exports = ProtocolAddress;
