const _decoder = new TextDecoder();

class ReceivablePacket {
  private readonly _dataView: DataView;

  private _currentOffset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this._dataView = new DataView(buffer);
  }

  readFloat(): number {
    const value: number = this._dataView.getFloat32(this._currentOffset);
    this._currentOffset += 4;

    return value;
  }

  readInt8(): number {
    const value: number = this._dataView.getInt8(this._currentOffset);
    this._currentOffset++;

    return value;
  }

  readInt16(): number {
    const value: number = this._dataView.getInt16(this._currentOffset);
    this._currentOffset += 2;

    return value;
  }

  readInt32(): number {
    const value: number = this._dataView.getInt32(this._currentOffset);
    this._currentOffset += 4;

    return value;
  }

  readBigInt64(): bigint {
    const value: bigint = this._dataView.getBigInt64(this._currentOffset);
    this._currentOffset += 8;

    return value;
  }

  readString(): string {
    const bytes: number[] = [];

    for (let i = this._currentOffset, length = this._dataView.buffer.byteLength; i < length; i++) {
      const b: number = this._dataView.getUint8(i);

      if (b === 0) {
        break;
      }

      bytes.push(b);
    }

    this._currentOffset += (bytes.length + 1);

    return _decoder.decode(new Uint8Array(bytes));
  }
}

export {
  ReceivablePacket
};