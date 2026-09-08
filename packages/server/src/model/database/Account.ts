import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('accounts')
class Account extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  accountName: string;

  @Column({ type: 'varchar', length: 100 })
  password: string;
}

export {
  Account
};
