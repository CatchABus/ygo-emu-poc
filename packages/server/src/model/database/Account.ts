import { BaseModel, DatabaseSchema } from './BaseModel';

@DatabaseSchema('accounts', [
  'accountName',
  'password'
])
class Account extends BaseModel {
  declare accountName: string;
  declare password: string;
}

export {
  Account
};
