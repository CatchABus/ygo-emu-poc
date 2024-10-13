import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { DatabaseSource } from '../../DataSource';

type TinyInt = 0 | 1;

interface BaseModelLike {
  tableName: string;
  columns: string[];
}

function DatabaseSchema(tableName: string, columns: string[]) {
  return function(cl: BaseModelLike): void {
    cl.tableName = tableName;
    cl.columns = columns;
  }
}

abstract class BaseModel {
  public static tableName: string;
  public static columns: string[];

  private _id: number = null;
  private _dirtyProperties: Set<string> = null;
  private _propertyBag: { [key: string]: any } = {};

  constructor() {
    const columns: string[] = (this.constructor as any).columns;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    for (const column of columns) {
      Object.defineProperty(this, column, {
        get() {
          return self._propertyBag[column];
        },
        set(val) {
          if (self._propertyBag[column] === val) {
            return;
          }

          self._propertyBag[column] = val;

          if (!self._dirtyProperties) {
            self._dirtyProperties = new Set();
          }
          self._dirtyProperties.add(column);
        }
      });
    }
  }

  static async find<T extends BaseModel = BaseModel>(id: any, columnName?: string): Promise<T> {
    if (this === BaseModel) {
      throw new Error('Cannot call static method "find" from abstract class BaseModel');
    }

    const pool = await DatabaseSource.getInstance().getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(`SELECT id,${this.columns.join(',')} FROM ${this.tableName} WHERE ${columnName || 'id'} = ?`, [id]);

    let instance: T;

    if (rows.length) {
      instance = new (this as any)();
      Object.assign(instance, rows[0]);
      instance._dirtyProperties = null;

      await instance.onRestore();
    } else {
      instance = null;
    }

    return instance;
  }

  static async findAll<T extends BaseModel = BaseModel>(additionalQuery: string, values: any[]): Promise<T[]> {
    if (this === BaseModel) {
      throw new Error('Cannot call static method "findAll" from abstract class BaseModel');
    }

    const pool = await DatabaseSource.getInstance().getPool();
    let query = `SELECT id,${this.columns.join(',')} FROM ${this.tableName}`;

    if (typeof additionalQuery === 'string') {
      query += ` ${additionalQuery.trim()}`;
    }

    const [rows] = await pool.execute<RowDataPacket[]>(query, values ?? []);

    const instances: T[] = [];

    for (const row of rows) {
      const instance = new (this as any)();
      Object.assign(instance, row);
      instance._dirtyProperties = null;

      await instance.onRestore();
      instances.push(instance);
    }

    return instances;
  }

  private async _insert(): Promise<void> {
    if (!this._dirtyProperties?.size) {
      return;
    }

    const tableName = (this.constructor as any).tableName;
    const dirtyColumns = Array.from(this._dirtyProperties);
    const values = dirtyColumns.map((column) => this[column as keyof BaseModel]);
    const marks = new Array(values.length).fill('?');

    try {
      const pool = await DatabaseSource.getInstance().getPool();
      const [result] = await pool.execute<ResultSetHeader>(`INSERT INTO ${tableName} (${dirtyColumns.join(',')}) VALUES (${marks.join(',')})`, values);

      this._id = result.insertId;
    } finally {
      this._dirtyProperties = null;
    }

    await this.onCreate();
  }

  private async _update(): Promise<void> {
    if (!this._dirtyProperties?.size) {
      return;
    }

    const tableName = (this.constructor as any).tableName;
    const dirtyColumns = Array.from(this._dirtyProperties);
    const values = dirtyColumns.map((column) => this[column as keyof BaseModel]);
    const declarations = dirtyColumns.map((column) => `${column} = ?`);

    try {
      const pool = await DatabaseSource.getInstance().getPool();

      await pool.execute<ResultSetHeader>(`UPDATE ${tableName} SET ${declarations.join('')} WHERE id = ?`, [...values, this._id]);
    } finally {
      this._dirtyProperties = null;
    }

    await this.onUpdate();
  }

  async save(): Promise<void> {
    if (!this._dirtyProperties?.size) {
      return;
    }

    if (this._id != null) {
      await this._update();
    } else {
      await this._insert();
    }
  }

  async delete(): Promise<void> {
    const tableName = (this.constructor as any).tableName;
    const pool = await DatabaseSource.getInstance().getPool();

    await pool.execute<ResultSetHeader>(`DELETE FROM ${tableName} WHERE id=?`, [this._id]);
    this._id = null;
    this._dirtyProperties = null;
    this._propertyBag = {};

    await this.onDelete();
  }

  onCreate(): void | Promise<void> {
  }

  onRestore(): void | Promise<void> {
  }

  onUpdate(): void | Promise<void> {
  }

  onDelete(): void | Promise<void> {
  }

  get id(): number {
    return this._id;
  }

  private set id(val: number) {
    if (this._id != null) {
      throw new Error('Attempted to re-assign id to model entity!');
    }
    this._id = val;
  }

  toJSON() {
    return this._propertyBag;
  }

  toString() {
    return this._propertyBag.toString();
  }
}

export {
  TinyInt,
  DatabaseSchema,
  BaseModel
};
