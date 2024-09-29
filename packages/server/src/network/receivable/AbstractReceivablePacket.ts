import log from 'loglevel';
import { GameClient } from '../GameClient';
import { AbstractSendablePacket } from '../sendable/AbstractSendablePacket';

function EventName(value: string) {
  return (target: any) => {
    target.eventName = value;
  };
}

abstract class AbstractReceivablePacket {
  private readonly _client?: GameClient;
  private readonly _buffer?: Buffer;

  private _currentOffset: number = 0;

  public eventName: string;

  constructor(client: GameClient, buffer: Buffer) {
    this._client = client;
    this._buffer = buffer;
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

  readFromBuffer(): void | Buffer {
    let result: void | Buffer;

    try {
      const response = this.read();

      if (response instanceof AbstractSendablePacket) {
        result = this.client.getPacketContent(response);
      } else {
        result = response;
      }
    } catch (err) {
      log.error(`Failed to read packet ${this.eventName}. Reason: ${(err as Error).message}`);
    }

    return result;
  }

  abstract read(): void | AbstractSendablePacket;
}

export {
  EventName,
  AbstractReceivablePacket
};