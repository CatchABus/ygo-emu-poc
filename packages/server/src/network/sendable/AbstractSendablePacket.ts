import * as log from 'loglevel';

const MAX_BYTE_LENGTH = parseInt(process.env.WRITE_PACKET_MAX_SIZE);

abstract class AbstractSendablePacket {
  private _buffer: Buffer;
  private _currentOffset: number = 0;

  constructor(maxByteLength: number = MAX_BYTE_LENGTH) {
    this._buffer = Buffer.alloc(maxByteLength);
  }

  get buffer(): Buffer {
    if (this._currentOffset !== this._buffer.byteLength) {
      this._resizeBuffer();
    }

    return this._buffer;
  }

  reset(): void {
    if (this._currentOffset !== 0) {
      this._currentOffset = 0;
      this._resizeBuffer();
    }
  }

  writeFloat(value: number): void {
    this._currentOffset = this._buffer.writeFloatBE(value, this._currentOffset);
  }

  writeInt8(value: number): void {
    this._currentOffset = this._buffer.writeInt8(value, this._currentOffset);
  }

  writeInt16(value: number): void {
    this._currentOffset = this._buffer.writeInt16BE(value, this._currentOffset);
  }

  writeInt32(value: number): void {
    this._currentOffset = this._buffer.writeInt32BE(value, this._currentOffset);
  }

  writeBigInt64(value: bigint): void {
    this._currentOffset = this._buffer.writeBigInt64BE(value, this._currentOffset);
  }

  writeString(value: string): void {
    this._currentOffset += this._buffer.write(value + '\0', this._currentOffset);
  }

  writeToBuffer(): void {
    try {
      this.write();
    } catch (err) {
      log.error(`Failed to write packet ${this.getEventName()}. Reason: ${(err as Error).message}`);
    }
  }

  private _resizeBuffer(): void {
    const newBuffer: Buffer = Buffer.alloc(this._currentOffset);

    this._buffer.copy(newBuffer, 0, 0, this._currentOffset);
    this._buffer = newBuffer;
  }

  abstract getEventName(): string;
  protected abstract write(): void;
}

export {
  AbstractSendablePacket
};