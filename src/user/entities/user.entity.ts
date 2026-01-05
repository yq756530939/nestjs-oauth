import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';

@Entity('sys_user')
export class User {
  @PrimaryGeneratedColumn({ comment: '用户ID' })
  id: number;

  @Column({ comment: '用户名（员工工号）', unique: true })
  username: string;

  @Column({ comment: '哈希后的密码' })
  @Exclude()
  password: string;

  @Column({ comment: '邮箱', nullable: true })
  email: string;

  @Column({ type: 'json', comment: '关联角色' })
  roles: string[];

  @Column({ comment: '状态：1=启用，0=禁用', default: 1 })
  status: number;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;
}
