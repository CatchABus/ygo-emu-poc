import * as log from 'loglevel';
import { ServerToClientEvents } from '../packetTypes';

const MAX_BYTE_LENGTH = parseInt(process.env.WRITE_PACKET_MAX_SIZE);

function SendableEventName(value: keyof ServerToClientEvents) {
  return (target: typeof AbstractSendablePacket) => {
    Object.defineProperty(target, 'eventName', {
      value,
      enumerable: false,
      writable: false,
      configurable: false
    });
  };
}

abstract class AbstractSendablePacket {
  private mBuffer: Buffer;
  private mCurOffset: number = 0;

  public eventName: string;

  constructor(..._args) {
    this.mBuffer = Buffer.alloc(MAX_BYTE_LENGTH);
  }

  get buffer(): Buffer {
    if (this.mCurOffset !== this.mBuffer.byteLength) {
      this._resizeBuffer();
    }

    return this.mBuffer;
  }

  reset(): void {
    if (this.mCurOffset !== 0) {
      this.mCurOffset = 0;
      this._resizeBuffer();
    }
  }

  writeFloat(value: number): void {
    this.mCurOffset = this.mBuffer.writeFloatBE(value, this.mCurOffset);
  }

  writeInt8(value: number): void {
    this.mCurOffset = this.mBuffer.writeInt8(value, this.mCurOffset);
  }

  writeInt16(value: number): void {
    this.mCurOffset = this.mBuffer.writeInt16BE(value, this.mCurOffset);
  }

  writeInt32(value: number): void {
    this.mCurOffset = this.mBuffer.writeInt32BE(value, this.mCurOffset);
  }

  writeBigInt64(value: bigint): void {
    this.mCurOffset = this.mBuffer.writeBigInt64BE(value, this.mCurOffset);
  }

  writeString(value: string): void {
    this.mCurOffset += this.mBuffer.write(value + '\0', this.mCurOffset);
  }

  writeToBuffer(): void {
    try {
      this.write();
    } catch (err) {
      log.error(`Failed to write packet ${this.eventName}. Reason: ${(err as Error).message}`);
    }
  }

  private _resizeBuffer(): void {
    const newBuffer: Buffer = Buffer.alloc(this.mCurOffset);

    this.mBuffer.copy(newBuffer, 0, 0, this.mCurOffset);
    this.mBuffer = newBuffer;
  }

  protected abstract write(): void;
}

export {
  AbstractSendablePacket,
  SendableEventName
};
