import * as log from 'loglevel';
import { GameClient } from '../GameClient';
import { AbstractSendablePacket } from '../sendable/AbstractSendablePacket';

abstract class AbstractReceivablePacket {
  declare eventName: string;
  
  private readonly mClient?: GameClient;
  private readonly mBuffer?: Buffer;

  private mCurOffset: number = 0;

  constructor(client: GameClient, buffer: Buffer) {
    this.mClient = client;
    this.mBuffer = buffer;
  }

  get client(): GameClient {
    return this.mClient;
  }

  getBufferSize() {
    return this.mBuffer.length;
  }

  readFloat(): number {
    const value: number = this.mBuffer.readFloatBE(this.mCurOffset);
    this.mCurOffset += 4;

    return value;
  }

  readInt8(): number {
    const value: number = this.mBuffer.readInt8(this.mCurOffset);
    this.mCurOffset++;

    return value;
  }

  readInt16(): number {
    const value: number = this.mBuffer.readInt16BE(this.mCurOffset);
    this.mCurOffset += 2;

    return value;
  }

  readInt32(): number {
    const value: number = this.mBuffer.readInt32BE(this.mCurOffset);
    this.mCurOffset += 4;

    return value;
  }

  readBigInt64(): bigint {
    const value: bigint = this.mBuffer.readBigInt64BE(this.mCurOffset);
    this.mCurOffset += 8;

    return value;
  }

  readString(): string {
    const bufferLen = this.mBuffer.length;
    let endOffset: number = this.mCurOffset;

    for (let i = this.mCurOffset; i < bufferLen; i++) {
      if (this.mBuffer.readUInt8(i) === 0) {
        break;
      }

      endOffset++;
    }

    const value: string = this.mBuffer.toString('utf8', this.mCurOffset, endOffset);
    this.mCurOffset = (endOffset + 1);

    return value;
  }

  read(): boolean | Promise<boolean> {
    return true;
  }

  async handle(): Promise<void | Buffer> {
    let isPacketRead: boolean;

    try {
      isPacketRead = await this.read();
    } catch (err) {
      isPacketRead = false;
      log.error(`Failed to read packet ${this.eventName} received from client ${this.client.getAccountName()}. Reason: ${(err as Error).message}`);
    }

    if (!isPacketRead) {
      return null;
    }

    let result: void | Buffer;

    try {
      const response = await this.run();

      if (response instanceof AbstractSendablePacket) {
        result = this.client.getPacketContent(response);
      } else {
        result = response;
      }
    } catch (err) {
      result = null;
      log.error(`Failed to handle packet ${this.eventName} received from client ${this.client.getAccountName()}. Reason: ${(err as Error).message}`);
    }

    return result;
  }

  abstract run(): void | AbstractSendablePacket | Promise<void | AbstractSendablePacket>;
}

export {
  AbstractReceivablePacket
};
