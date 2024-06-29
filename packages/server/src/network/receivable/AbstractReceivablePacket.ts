import log from 'loglevel';
import { GameClient } from '../GameClient';

abstract class AbstractReceivablePacket<T> {
  private readonly _client: GameClient;
  private readonly _buffer: Buffer;
  private readonly _eventName: string;

  private _currentOffset: number = 0;

  constructor(client: GameClient, buffer: Buffer, eventName: string) {
    this._client = client;
    this._buffer = buffer;
    this._eventName = eventName;
  }

  get client(): GameClient {
    return this._client;
  }

  readFloat(): number {
    const value: number = this._buffer.readFloatBE(this._currentOffset);
    this._currentOffset += 4;

    return value;
  }

  readInt8(): number {
    const value: number = this._buffer.readInt8(this._currentOffset);
    this._currentOffset++;

    return value;
  }

  readInt16(): number {
    const value: number = this._buffer.readInt16BE(this._currentOffset);
    this._currentOffset += 2;

    return value;
  }

  readInt32(): number {
    const value: number = this._buffer.readInt32BE(this._currentOffset);
    this._currentOffset += 4;

    return value;
  }

  readBigInt64(): bigint {
    const value: bigint = this._buffer.readBigInt64BE(this._currentOffset);
    this._currentOffset += 8;

    return value;
  }

  readString(): string {
    const bufferLength = this._buffer.length;
    let endOffset: number = this._currentOffset;

    for (let i = this._currentOffset; i < bufferLength; i++) {
      if (this._buffer.readUInt8(i) === 0) {
        break;
      }

      endOffset++;
    }

    const value: string = this._buffer.toString('utf8', this._currentOffset, endOffset);
    this._currentOffset = (endOffset + 1);

    return value;
  }

  readFromBuffer(): T {
    let result: T;

    try {
      result = <T>this.read();
    } catch (err) {
      log.error(`Failed to read packet ${this._eventName}. Reason: ${(err as Error).message}`);
    }

    return result;
  }

  abstract read(): void | Buffer;
}

export {
  AbstractReceivablePacket
};