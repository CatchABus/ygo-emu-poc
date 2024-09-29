import { AbstractSendablePacket } from './AbstractSendablePacket';

enum LoginResponse {
  NONE = 0,
  ACCOUNT_DOES_NOT_EXIST = 1,
  INVALID_CREDENTIALS = 2,
  SUCCESS = 3
}

class LoginResult extends AbstractSendablePacket {
  private _response: LoginResponse;
  private _token: string;

  constructor(response: LoginResponse, token?: string) {
    super();

    this._response = response;
    this._token = token;
  }

  getEventName(): any {
    return 'loginResult';
  }

  write(): void {
    this.writeInt8(this._response);

    if (this._token) {
      this.writeString(this._token);
    }
  }
}

export {
  LoginResponse,
  LoginResult
};