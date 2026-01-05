import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import * as bcrypt from 'bcryptjs';

@Entity('sys_oauth_client')
export class OauthClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, comment: '客户端ID' })
  clientId: string;

  @Column({ comment: '客户端密钥（哈希）' })
  clientSecret: string;

  @Column({ comment: '客户端名称' })
  name: string;

  @Column({ type: 'json', comment: '允许的重定向URI' })
  redirectUris: string[];

  @Column('json', {
    comment: '允许的权限范围',
  })
  scopes: string[];

  @Column({ default: 1, comment: '状态：1=启用，0=禁用' })
  status: number;

  @Column({ nullable: true, comment: '前端登出URI，用于全局登出时通知SP' })
  frontChannelLogoutUri: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  // 加密客户端密钥
  static hashClientSecret(secret: string): string {
    return bcrypt.hashSync(secret, 10);
  }

  // 验证客户端密钥
  verifyClientSecret(secret: string): boolean {
    return bcrypt.compareSync(secret, this.clientSecret);
  }
}
