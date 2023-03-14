class PacketStructure {
    constructor() {
        this.DELIMITER = 0x00;
        this.SIZE_CHECKSUM = 2;
        this.SIZE_LENGTH = 1;
        this.SIZE_CHANNEL = 1;
        this.OFFSET_DELIMITER = 0;
        this.OFFSET_LENGTH = 1;
        this.OFFSET_COBS = 2;
        this.OFFSET_CHANNEL = this.OFFSET_COBS + 1;
        this.OFFSET_DATA = this.OFFSET_CHANNEL + this.SIZE_CHANNEL;
        this.SIZE_DATA_MAX = 254 - this.SIZE_CHANNEL - this.SIZE_CHECKSUM;
        this.buffer = Buffer.alloc(this.OFFSET_DATA + this.SIZE_DATA_MAX + this.SIZE_CHECKSUM);
    }
}
;
// TODO: return reference to buffer
// TODO: change interface to be more like the C++ version
export class CobsSerializer extends PacketStructure {
    constructor() {
        super(...arguments);
        this._dataSize = 0;
    }
    capacity() {
        return this.SIZE_DATA_MAX;
    }
    size() {
        return this._dataSize;
    }
    is_empty() {
        return this._dataSize == 0;
    }
    reset() {
        this._dataSize = 0;
    }
    put(c) {
        if (this._dataSize < this.SIZE_DATA_MAX) {
            this.buffer[this.OFFSET_DATA + this._dataSize] = c;
            this._dataSize++;
        }
        return this._dataSize == this.SIZE_DATA_MAX;
    }
    finalize(channel) {
        let length = this.OFFSET_DATA + this._dataSize + this.SIZE_CHECKSUM;
        let crcOffset = this.OFFSET_DATA + this._dataSize;
        this.buffer[this.OFFSET_DELIMITER] = this.DELIMITER;
        this.buffer[this.OFFSET_LENGTH] = crcOffset + this.SIZE_CHECKSUM - this.OFFSET_COBS;
        this.buffer[this.OFFSET_COBS] = this.DELIMITER;
        this.buffer[this.OFFSET_CHANNEL] = channel;
        let crc = 0;
        let prevDelim = 2;
        for (let i = 3; i < length; i++) {
            // crc
            if (i >= this.OFFSET_CHANNEL && i < crcOffset) {
                // TODO: update crc
            }
            else if (i == crcOffset) {
                this.buffer[crcOffset] = crc & 0xFF;
                this.buffer[crcOffset + 1] = crc >> 8;
            }
            // cobs
            if (this.buffer[i] == this.DELIMITER) {
                this.buffer[prevDelim] = i - prevDelim;
                prevDelim = i;
            }
        }
        this.buffer[prevDelim] = length - prevDelim;
        this.reset();
        return Buffer.from(this.buffer.slice(0, length));
    }
}
;
export class CobsPacketizer extends PacketStructure {
    constructor() {
        super(...arguments);
        this.length = 0;
    }
    expectedLength() {
        if (this.length < this.OFFSET_LENGTH + this.SIZE_LENGTH) {
            return this.OFFSET_LENGTH + this.SIZE_LENGTH;
        }
        return this.OFFSET_LENGTH + this.SIZE_LENGTH + this.buffer[this.OFFSET_LENGTH];
    }
    reset() {
        this.length = 0;
    }
    put(c) {
        if (c == this.DELIMITER) {
            this.buffer[0] = this.DELIMITER;
            this.length = 1;
            return false;
        }
        if (this.length == 0) {
            return false;
        }
        if (this.length < this.expectedLength()) {
            this.buffer[this.length] = c;
            this.length++;
        }
        return this.length == this.expectedLength();
    }
    decode() {
        let frameLength = this.expectedLength();
        if (this.length < frameLength) {
            return null;
        }
        let crc = 0;
        let crcOffset = this.OFFSET_COBS + this.buffer[this.OFFSET_LENGTH] - this.SIZE_CHECKSUM;
        let nextDelimOff = 0;
        for (let i = 2; i < frameLength; i++) {
            if (nextDelimOff == 0) {
                nextDelimOff = this.buffer[i];
                this.buffer[i] = this.DELIMITER;
            }
            nextDelimOff--;
            if (i >= this.OFFSET_CHANNEL && i < crcOffset) {
                // TODO: update crc
            }
        }
        let crcReceived = this.buffer[crcOffset] | (this.buffer[crcOffset + 1] << 8);
        if (nextDelimOff != 0 || crc != crcReceived) {
            return null;
        }
        return {
            channel: this.buffer[this.OFFSET_CHANNEL],
            data: Buffer.from(this.buffer.slice(this.OFFSET_DATA, crcOffset))
        };
    }
}
;
//# sourceMappingURL=cobs.js.map