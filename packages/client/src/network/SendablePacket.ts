const _encoder = new TextEncoder();
const MAX_BYTE_LENGTH = parseInt(import.meta.env.YGO_WRITE_PACKET_MAX_SIZE);

class SendablePacket {
  private _dataView: DataView;
  private _currentOffset: number = 0;

  constructor(maxByteLength: number = MAX_BYTE_LENGTH) {
    this._dataView = new DataView(new ArrayBuffer(maxByteLength));
  }

  get buffer(): ArrayBuffer {
    if (this._currentOffset !== this._dataView.buffer.byteLength) {
      this._resizeBuffer();
    }

    return this._dataView.buffer;
  }

  writeFloat(value: number): void {
    this._dataView.setFloat32(this._currentOffset, value);
    this._currentOffset += 4;
  }

  writeInt8(value: number): void {
    this._dataView.setInt8(this._currentOffset, value);
    this._currentOffset++;
  }

  writeInt16(value: number): void {
    this._dataView.setInt16(this._currentOffset, value);
    this._currentOffset += 2;
  }

  writeInt32(value: number): void {
    this._dataView.setInt32(this._currentOffset, value);
    this._currentOffset += 4;
  }

  writeBigInt64(value: bigint): void {
    this._dataView.setBigInt64(this._currentOffset, value);
    this._currentOffset += 8;
  }

  writeString(value: string): void {
    const bytes: Uint8Array = _encoder.encode(value + '\0');

    for (const b of bytes) {
      this._dataView.setUint8(this._currentOffset++, b);
    }
  }

  private _resizeBuffer(): void {
    // TODO: Make use of ArrayBuffer.prototype.resize() once TS fully supports ES2024
    const dataView = new DataView(new ArrayBuffer(this._currentOffset));

    for (let i = 0, length = dataView.buffer.byteLength; i < length; i++) {
      dataView.setUint8(i, this._dataView.getUint8(i));
    }

    this._dataView = dataView;
  }
}

export {
  SendablePacket
};