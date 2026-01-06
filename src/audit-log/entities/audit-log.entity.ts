import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sys_audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '操作类型：login/authorize/token/revoke/logout' })
  type: string;

  @Column({ comment: '用户ID' })
  userId: number;

  @Column({ comment: '客户端ID' })
  clientId: string;

  @Column({ comment: '操作IP' })
  ip: string;

  @Column({ comment: '操作结果：success/fail' })
  result: string;

  @Column({ comment: '错误信息', nullable: true })
  errorMsg: string;

  @CreateDateColumn({ comment: '操作时间' }) createdAt: Date;
}
